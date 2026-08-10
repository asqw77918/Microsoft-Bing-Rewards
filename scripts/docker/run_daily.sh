#!/usr/bin/env bash
set -euo pipefail

# 保留调用者注入的任何值（例如来自 entrypoint 的 RUN_ON_START 前缀的 SKIP_RANDOM_SLEEP=true），
# 以防 env 文件覆盖它。
_SKIP_SLEEP_OVERRIDE="${SKIP_RANDOM_SLEEP:-}"

# 恢复 cron 启动此任务时丢失的容器环境（ACCOUNT_*、CONFIG_* 等）
if [ -f /etc/container_env ]; then
    # shellcheck source=/dev/null
    . /etc/container_env
fi

# 重新应用调用者的覆盖，以防 source /etc/container_env 重置它。
[ -n "$_SKIP_SLEEP_OVERRIDE" ] && SKIP_RANDOM_SLEEP="$_SKIP_SLEEP_OVERRIDE"
unset _SKIP_SLEEP_OVERRIDE

export PLAYWRIGHT_BROWSERS_PATH=0
export TZ="${TZ:-UTC}"

cd /usr/src/microsoft-rewards-script

LOCKFILE=/tmp/run_daily.lock

is_positive_integer() {
    [[ "$1" =~ ^[1-9][0-9]*$ ]]
}

is_nonnegative_integer() {
    [[ "$1" =~ ^[0-9]+$ ]]
}

is_run_daily_process() {
    local pid="$1"
    [ -r "/proc/$pid/cmdline" ] || return 1
    tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q 'scripts/docker/run_daily\.sh'
}

# -------------------------------
#  功能：检查并修复锁文件完整性
# -------------------------------
self_heal_lockfile() {
    # 锁文件存在但为空 → 删除
    if [ -f "$LOCKFILE" ]; then
        local lock_content
        lock_content=$(<"$LOCKFILE" || echo "")

        if [[ -z "$lock_content" ]]; then
            echo "[$(date)] [run_daily.sh] 发现空锁文件 → 删除。"
            rm -f "$LOCKFILE"
            return
        fi

        # 锁文件包含非数字 PID → 删除
        if ! [[ "$lock_content" =~ ^[0-9]+$ ]]; then
            echo "[$(date)] [run_daily.sh] 发现损坏的锁文件内容（'$lock_content'）→ 删除。"
            rm -f "$LOCKFILE"
            return
        fi

        # 锁文件包含 PID 但进程已死亡 → 删除
        if ! kill -0 "$lock_content" 2>/dev/null; then
            echo "[$(date)] [run_daily.sh] 锁文件 PID $lock_content 已失效 → 删除过期锁。"
            rm -f "$LOCKFILE"
            return
        fi

        # PID 重用绝不能让此脚本将不相关的进程视为奖励运行，
        # 更不能将其作为"卡住"进程终止。
        if ! is_run_daily_process "$lock_content"; then
            echo "[$(date)] [run_daily.sh] 锁文件 PID $lock_content 不是 run_daily.sh → 删除过期锁。"
            rm -f "$LOCKFILE"
        fi
    fi
}

# -------------------------------
#  功能：获取锁
# -------------------------------
acquire_lock() {
    local max_attempts=5
    local attempt=0
    local timeout_hours=${STUCK_PROCESS_TIMEOUT_HOURS:-8}
    local timeout_seconds
    local existing_pid="unknown"

    if ! is_positive_integer "$timeout_hours"; then
        echo "[$(date)] [run_daily.sh] 错误：STUCK_PROCESS_TIMEOUT_HOURS 必须为正整数。" >&2
        return 2
    fi
    timeout_seconds=$((timeout_hours * 3600))

    while [ $attempt -lt $max_attempts ]; do
        # 尝试用当前 PID 创建锁
        if (set -C; echo "$$" > "$LOCKFILE") 2>/dev/null; then
            echo "[$(date)] [run_daily.sh] 锁获取成功 (PID: $$)"
            return 0
        fi

        # 锁已存在，验证它
        if [ -f "$LOCKFILE" ]; then
            existing_pid=$(<"$LOCKFILE" || echo "")

            echo "[$(date)] [run_daily.sh] 锁文件存在，PID: '$existing_pid'"

            # 锁文件内容无效 → 删除并重试
            if [[ -z "$existing_pid" || ! "$existing_pid" =~ ^[0-9]+$ ]]; then
                echo "[$(date)] [run_daily.sh] 删除无效锁文件 → 重试..."
                rm -f "$LOCKFILE"
                continue
            fi

            # 进程已死亡 → 删除并重试
            if ! kill -0 "$existing_pid" 2>/dev/null; then
                echo "[$(date)] [run_daily.sh] 删除过期锁（已失效 PID: $existing_pid）"
                rm -f "$LOCKFILE"
                continue
            fi

            if ! is_run_daily_process "$existing_pid"; then
                echo "[$(date)] [run_daily.sh] 删除由无关 PID $existing_pid 持有的过期锁"
                rm -f "$LOCKFILE"
                continue
            fi

            # 检查进程运行时间 → 超时则终止
            local process_age
            if process_age=$(ps -o etimes= -p "$existing_pid" 2>/dev/null | tr -d ' '); then
                if [ "$process_age" -gt "$timeout_seconds" ]; then
                    echo "[$(date)] [run_daily.sh] 终止卡住的进程 $existing_pid（${process_age}s > ${timeout_hours}h）"
                    kill -TERM "$existing_pid" 2>/dev/null || true
                    sleep 5
                    kill -KILL "$existing_pid" 2>/dev/null || true
                    rm -f "$LOCKFILE"
                    continue
                fi
            fi
        fi

        echo "[$(date)] [run_daily.sh] 锁由 PID $existing_pid 持有，第 $((attempt + 1))/$max_attempts 次尝试"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "[$(date)] [run_daily.sh] $max_attempts 次尝试后仍无法获取锁；退出。"
    return 1
}

# -------------------------------
#  功能：释放锁
# -------------------------------
release_lock() {
    if [ -f "$LOCKFILE" ]; then
        local lock_pid
        lock_pid=$(<"$LOCKFILE")
        if [ "$lock_pid" = "$$" ]; then
            rm -f "$LOCKFILE"
            echo "[$(date)] [run_daily.sh] 锁已释放 (PID: $$)"
        fi
    fi
}

# 退出时始终释放锁，包括中断/终止路径。
trap release_lock EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# -------------------------------
#  主执行流程
# -------------------------------
echo "[$(date)] [run_daily.sh] 当前进程 PID: $$"

# 继续之前先自愈任何损坏或空的锁
self_heal_lockfile

# 尝试安全获取锁。锁被持有是正常跳过；无效的调度器配置是错误。
if acquire_lock; then
    :
else
    lock_status=$?
    [ "$lock_status" -eq 2 ] && exit 1
    exit 0
fi

# 在 MIN 和 MAX 之间随机休眠以分散执行
MINWAIT=${MIN_SLEEP_MINUTES:-5}
MAXWAIT=${MAX_SLEEP_MINUTES:-50}

if ! is_nonnegative_integer "$MINWAIT" || ! is_nonnegative_integer "$MAXWAIT"; then
    echo "[$(date)] [run_daily.sh] 错误：MIN_SLEEP_MINUTES 和 MAX_SLEEP_MINUTES 必须为非负整数。" >&2
    exit 1
fi
if [ "$MAXWAIT" -lt "$MINWAIT" ]; then
    echo "[$(date)] [run_daily.sh] 错误：MAX_SLEEP_MINUTES 必须大于或等于 MIN_SLEEP_MINUTES。" >&2
    exit 1
fi

MINWAIT_SEC=$((MINWAIT*60))
MAXWAIT_SEC=$((MAXWAIT*60))

if [ "${SKIP_RANDOM_SLEEP:-false}" != "true" ]; then
    if [ "$MAXWAIT_SEC" -eq "$MINWAIT_SEC" ]; then
        SLEEPTIME=$MINWAIT_SEC
    else
        SLEEPTIME=$((MINWAIT_SEC + RANDOM % (MAXWAIT_SEC - MINWAIT_SEC + 1)))
    fi
    echo "[$(date)] [run_daily.sh] 休眠 $((SLEEPTIME/60)) 分钟（$SLEEPTIME 秒）"
    sleep "$SLEEPTIME"
else
    echo "[$(date)] [run_daily.sh] 跳过随机休眠"
fi

# 启动实际脚本
echo "[$(date)] [run_daily.sh] 正在启动脚本..."
run_status=0
if [ "${API_MODE:-false}" = "true" ]; then
    # API 集成模式：委托给 API 服务器，使仪表板具有完整的可见性和控制权。
    # trigger.js 调用 POST /start 并等待空闲状态。
    if node scripts/api/trigger.js; then
        echo "[$(date)] [run_daily.sh] 脚本运行成功（通过 API）。"
    else
        echo "[$(date)] [run_daily.sh] 错误：脚本运行失败（通过 API）！" >&2
        run_status=1
    fi
else
    if npm start; then
        echo "[$(date)] [run_daily.sh] 脚本运行成功。"
    else
        echo "[$(date)] [run_daily.sh] 错误：脚本运行失败！" >&2
        run_status=1
    fi
fi

echo "[$(date)] [run_daily.sh] 脚本执行结束"
# 锁通过 trap 自动释放
exit "$run_status"
