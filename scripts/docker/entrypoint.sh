#!/usr/bin/env bash
set -euo pipefail

# 确保 Playwright 使用预安装的浏览器
export PLAYWRIGHT_BROWSERS_PATH=0

SCRIPT_DIR="/usr/src/microsoft-rewards-script"

# 1. 时区：未设置时默认使用 UTC
: "${TZ:=UTC}"
ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime
echo "$TZ" > /etc/timezone
dpkg-reconfigure -f noninteractive tzdata

# 2. 验证 CRON_SCHEDULE（API 模式下不需要）
if [ "${API_MODE:-false}" != "true" ]; then
  if [ -z "${CRON_SCHEDULE:-}" ]; then
    echo "错误：CRON_SCHEDULE 环境变量未设置。" >&2
    echo "请设置 CRON_SCHEDULE（例如 \"0 2 * * *\"）。" >&2
    echo "       如需运行 API 服务器，请设置 API_MODE=true。" >&2
    exit 1
  fi
fi

# 3. 账号：由应用在运行时直接从 ACCOUNT_N_* 环境变量读取。
#
#    在 .env 中为每个账号添加一个编号块：
#      ACCOUNT_1_EMAIL, ACCOUNT_1_PASSWORD, ...
#      ACCOUNT_2_EMAIL, ACCOUNT_2_PASSWORD, ...
#
#    不再生成 accounts.json - loadAccounts() 会解析环境变量。
#    这里只是一个快速检查，确保账号存在。
mapfile -t account_indexes < <(
  compgen -e | sed -n 's/^ACCOUNT_\([1-9][0-9]*\)_EMAIL$/\1/p' | sort -n -u
)

acct_count=0
for i in "${account_indexes[@]}"; do
  email_var="ACCOUNT_${i}_EMAIL"
  [ -z "${!email_var:-}" ] && continue

  password_var="ACCOUNT_${i}_PASSWORD"
  if [ -z "${!password_var:-}" ]; then
    echo "错误：已设置 $email_var 但缺少 $password_var。" >&2
    exit 1
  fi
  acct_count=$((acct_count + 1))
done

if [ "$acct_count" -eq 0 ]; then
  echo "警告：环境中未找到 ACCOUNT_N_EMAIL - 脚本将运行失败。" >&2
  echo "         请在 .env 文件中至少设置一对 ACCOUNT_N_EMAIL 和 ACCOUNT_N_PASSWORD。" >&2
else
  echo "[启动] 环境中发现 $acct_count 个账号"
fi

# 4. 配置：生成/同步 config.json
#
#    生成和漂移检测委托给 dist/util/ConfigSync.js
#    （由 src/util/ConfigSync.ts 编译），与 API 配置编辑器使用的模块相同，
#    因此此逻辑只存在于一个地方。有关 diff/merge 实现，请参阅该文件。
#
#    行为：
#      - 无 config.json       → 从 config.example.json 生成
#      - config.json 存在     → 与 config.example.json 比较；
#                               CONFIG_* 覆盖始终在之后应用
#      - 模式漂移             → 报告缺失的键。设置
#                               CONFIG_AUTO_SYNC=true 可自动修补到
#                               文件中（保留 .bak 备份）；
#                               默认仅报告，与之前行为一致。
#      - 损坏的 config.json   → 明确报错，而非静默覆盖。
#
#    headless 始终强制为 true - 在 Docker 中不是可选项。
#
#    CONFIG_* 环境变量覆盖（每次启动时应用）定义在
#    src/util/ConfigEnvOverrides.ts（ENV_OVERRIDES 表）中 - 不在此处。
#    运行 `node dist/util/ConfigEnvOverrides.js list` 获取当前支持的
#    完整变量列表及每个变量映射的配置路径。
#
CONFIG_FILE="$SCRIPT_DIR/config/config.json"
CONFIG_EXAMPLE="$SCRIPT_DIR/config.example.json"

if ! [ -f "$CONFIG_EXAMPLE" ]; then
  echo "错误：在 $CONFIG_EXAMPLE 未找到 config.example.json - 镜像可能已损坏。" >&2
  exit 1
fi

# 单文件绑定挂载，如果主机路径不存在，Docker 会创建一个*目录*作为 config.json。
# 明确报错而不是写入损坏的配置。
if [ -d "$CONFIG_FILE" ]; then
  echo "错误：$CONFIG_FILE 是目录，不是文件。" >&2
  echo "       ./config.json 在容器启动时可能不存在于主机上，" >&2
  echo "       因此 Docker 将其创建为文件夹。请删除它并先创建文件：" >&2
  echo "       cp config.example.json config.json" >&2
  exit 1
fi

SYNC_ARGS=(--config "$CONFIG_FILE" --example "$CONFIG_EXAMPLE")
if [ "${CONFIG_AUTO_SYNC:-false}" = "true" ]; then
  SYNC_ARGS+=(--patch)
fi
if ! node "$SCRIPT_DIR/dist/util/ConfigSync.js" sync "${SYNC_ARGS[@]}"; then
  echo "错误：配置同步失败 - 请查看上方输出。" >&2
  exit 1
fi

# 应用 CONFIG_* 环境变量覆盖（始终运行，无论配置来源）。
# 委托给 dist/util/ConfigEnvOverrides.js（由 src/util/ConfigEnvOverrides.ts 编译）
# - 有关完整映射表，请参阅该文件。
echo "[启动] 正在应用 CONFIG_* 环境变量覆盖..."
if ! node "$SCRIPT_DIR/dist/util/ConfigEnvOverrides.js" apply --config "$CONFIG_FILE"; then
  echo "错误：应用 CONFIG_* 覆盖失败 - 请查看上方输出。" >&2
  exit 1
fi

echo "[启动] 配置就绪。"

# 将生成的配置链接回根目录，以便应用脚本能找到它
ln -sf "$CONFIG_FILE" "$SCRIPT_DIR/config.json"

# 快照完整的容器环境，供 cron 启动的运行使用
export -p > /etc/container_env
chmod 600 /etc/container_env

# ─────────────────────────────────────────────────────────────────────────────
# 5. 如果 RUN_ON_START=true，不等待直接运行
# ─────────────────────────────────────────────────────────────────────────────
if [ "${RUN_ON_START:-false}" = "true" ]; then
  # 始终通过 run_daily.sh，这样锁文件会被获取，且无论模式如何都运行相同的代码路径。
  # 在 API 模式下，run_daily.sh 调用 trigger.js，后者会等待 API 服务器就绪后再触发。
  echo "[启动] 开始后台初始运行 $(date)"
  (
    cd "$SCRIPT_DIR" || {
      echo "[启动-后台] 错误：无法进入 $SCRIPT_DIR" >&2
      exit 1
    }
    SKIP_RANDOM_SLEEP=true scripts/docker/run_daily.sh
    echo "[启动-后台] 初始运行完成 $(date)"
  ) &
  echo "[启动] 后台进程已启动 (PID: $!)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. 启动：仅调度模式（默认）或 API 集成模式
# ─────────────────────────────────────────────────────────────────────────────
# 默认 API_HOST 为 0.0.0.0，以便 Docker 端口映射开箱即用。
: "${API_HOST:=0.0.0.0}"
export API_HOST

if [ "${API_MODE:-false}" = "true" ]; then
  # API 集成模式：
  #   - API 服务器是主（前台）进程，成为 PID 1。
  #   - cron 调度可以从两个地方获取，按此顺序检查：
  #       1. config/schedule.json - 通过 PUT /schedule（如从仪表板）写入的持久化覆盖。
  #          仅在该端点至少使用过一次时存在；因为它位于 ./config 绑定挂载中，所以重启后仍然存在。
  #       2. CRON_SCHEDULE - 环境变量，与之前完全相同。对于不使用 PUT /schedule 的用户，这仍然是唯一重要的设置。
  #   - 无论哪种方式，如果调度已激活，cron 将作为后台守护进程运行；
  #     run_daily.sh 检测到 API_MODE=true 并通过 scripts/api/trigger.js 调用 POST /start，
  #     而不是直接运行 npm start，因此 API 服务器对每次运行都有完整的可见性和控制权。
  #   - 如果两个来源都未配置，则必须通过 POST /start 手动触发运行。
  export TZ

  SCHEDULE_OVERRIDE="${SCHEDULE_FILE:-$SCRIPT_DIR/config/schedule.json}"

  if [ -f "$SCHEDULE_OVERRIDE" ]; then
    echo "[启动] 发现 $SCHEDULE_OVERRIDE - 正在应用（覆盖 CRON_SCHEDULE）。"
    if node scripts/api/apply-schedule.js; then
      cron -f &
      echo "[启动] cron 已在后台启动（调度来源：schedule.json，时区：$TZ）"
    else
      echo "错误：无法应用 $SCHEDULE_OVERRIDE。" >&2
      exit 1
    fi
  elif [ -n "${CRON_SCHEDULE:-}" ]; then
    if [ ! -f /etc/cron.d/microsoft-rewards-cron.template ]; then
      echo "错误：未找到 cron 模板 /etc/cron.d/microsoft-rewards-cron.template。" >&2
      exit 1
    fi
    envsubst < /etc/cron.d/microsoft-rewards-cron.template > /etc/cron.d/microsoft-rewards-cron
    chmod 0644 /etc/cron.d/microsoft-rewards-cron
    crontab /etc/cron.d/microsoft-rewards-cron
    cron -f &
    echo "[启动] cron 已在后台启动（调度：$CRON_SCHEDULE，时区：$TZ）"
  else
    echo "[启动] 未设置 CRON_SCHEDULE 且无 schedule.json 覆盖 - 运行必须通过 POST /start 手动触发，或从仪表板调度。"
  fi
  echo "[启动] 正在 ${API_HOST}:${API_PORT:-3010} 启动控制 API $(date)"
  exec node scripts/api/server.js
fi

# 仅调度模式（默认）：cron 直接调用 npm start。
if [ ! -f /etc/cron.d/microsoft-rewards-cron.template ]; then
  echo "错误：未找到 cron 模板 /etc/cron.d/microsoft-rewards-cron.template。" >&2
  exit 1
fi

export TZ
envsubst < /etc/cron.d/microsoft-rewards-cron.template > /etc/cron.d/microsoft-rewards-cron
chmod 0644 /etc/cron.d/microsoft-rewards-cron
crontab /etc/cron.d/microsoft-rewards-cron

echo "[启动] cron 已配置调度：$CRON_SCHEDULE，时区：$TZ；$(date) 启动 cron"

# 7. 前台启动 cron (PID 1)
exec cron -f
