import axios from 'axios'
import PQueue from 'p-queue'
import type { WebhookPushPlusConfig } from '../interface/Config'
import type { LogLevel } from './Logger'
import { flushQueue } from './Queue'

const pushPlusQueue = new PQueue({
    interval: 1000,
    intervalCap: 2,
    carryoverConcurrencyCount: true
})

interface PushPlusLogEntry {
    level: LogLevel
    content: string
}

const pushPlusLogBuffer: PushPlusLogEntry[] = []
const MAX_BUFFER_SIZE = 500

export function collectPushPlusLog(level: LogLevel, content: string): void {
    if (pushPlusLogBuffer.length >= MAX_BUFFER_SIZE) {
        pushPlusLogBuffer.shift()
    }
    pushPlusLogBuffer.push({ level, content })
}

export function clearPushPlusBuffer(): void {
    pushPlusLogBuffer.length = 0
}

export function getPushPlusBufferSize(): number {
    return pushPlusLogBuffer.length
}

export interface SummaryAccountStat {
    email: string
    initialPoints: number
    finalPoints: number
    collectedPoints: number
    duration: number
    success: boolean
    error?: string
}

const MAX_DETAIL_ITEMS = 5
const MAX_LINE_LENGTH = 120

function stripTimestampPrefix(content: string): string {
    // 日志格式: [时间] [账号] [级别] 平台 [标题] 内容 —— 剥离时间戳前缀使推送更紧凑
    return content.replace(/^\[[^\]]*\]\s*/, '')
}

function condenseEntries(entries: PushPlusLogEntry[]): { total: number; samples: string[] } {
    const seen = new Set<string>()
    const samples: string[] = []
    for (const entry of entries) {
        let text = stripTimestampPrefix(entry.content)
        if (seen.has(text)) continue
        seen.add(text)
        if (text.length > MAX_LINE_LENGTH) text = `${text.slice(0, MAX_LINE_LENGTH)}...`
        samples.push(text)
    }
    return { total: entries.length, samples }
}

function buildSummary(entries: PushPlusLogEntry[], stats?: SummaryAccountStat[]): string {
    const now = new Date().toLocaleString()
    const lines: string[] = []

    lines.push('======== 微软奖励 运行简报 ========')
    lines.push(`时间: ${now}`)

    // ── 运行总览：优先使用账号统计（准确），缺失时退回日志计数 ──
    if (stats && stats.length > 0) {
        const success = stats.filter(s => s.success).length
        const failed = stats.length - success
        const collected = stats.reduce((sum, s) => sum + s.collectedPoints, 0)
        const balance = stats.reduce((sum, s) => sum + s.finalPoints, 0)
        const totalMinutes = (stats.reduce((sum, s) => sum + s.duration, 0) / 60).toFixed(1)

        lines.push(`账号: ${stats.length} 个 | 成功 ${success} | 失败 ${failed}`)
        lines.push(`积分: +${collected} | 当前余额 ${balance}`)
        lines.push(`耗时: ${totalMinutes} 分钟`)

        lines.push('')
        lines.push('── 账号明细 ──')
        for (const s of stats) {
            const errorText = s.error ? ` | ${s.error.slice(0, MAX_LINE_LENGTH)}` : ''
            lines.push(`[${s.success ? '成功' : '失败'}] ${s.email} | +${s.collectedPoints}分${errorText}`)
        }
    } else if (entries.length > 0) {
        const errors = entries.filter(e => e.level === 'error').length
        const warns = entries.filter(e => e.level === 'warn').length
        lines.push(`日志: ${entries.length} 条 | 错误 ${errors} | 警告 ${warns}`)
    } else {
        // 诊断：若持续出现 0 条，说明日志未进入缓冲。常见原因：
        //   1. clusters=1（单进程）时 pushplus.enabled 或 token 未正确配置
        //   2. clusters>1 时 worker 的 IPC 日志未到达主进程
        //   3. 所有日志均为 debug 级别（被 baseLog 过滤）
        console.warn('[PushPlus] 警告: 日志缓冲为空且无账号统计，将发送空简报。请检查 pushplus.enabled/token 与 clusters 配置。')
        lines.push('日志: 0 条（未收集到任何运行数据）')
    }

    // ── 异常摘要：错误/警告去重、截断，各最多 5 条，不再罗列 info 日志 ──
    const errors = condenseEntries(entries.filter(e => e.level === 'error'))
    const warns = condenseEntries(entries.filter(e => e.level === 'warn'))

    if (errors.samples.length > 0 || warns.samples.length > 0) {
        lines.push('')
        lines.push('── 异常摘要 ──')
        for (const text of errors.samples.slice(0, MAX_DETAIL_ITEMS)) {
            lines.push(`[错误] ${text}`)
        }
        if (errors.samples.length > MAX_DETAIL_ITEMS) {
            lines.push(`... 其余错误 ${errors.samples.length - MAX_DETAIL_ITEMS} 条已省略`)
        }
        for (const text of warns.samples.slice(0, MAX_DETAIL_ITEMS)) {
            lines.push(`[警告] ${text}`)
        }
        if (warns.samples.length > MAX_DETAIL_ITEMS) {
            lines.push(`... 其余警告 ${warns.samples.length - MAX_DETAIL_ITEMS} 条已省略`)
        }
    }

    lines.push('================================')
    return lines.join('\n')
}

export async function sendPushPlusSummary(
    config: WebhookPushPlusConfig | undefined,
    stats?: SummaryAccountStat[]
): Promise<void> {
    if (!config?.token) return

    const summary = buildSummary(pushPlusLogBuffer, stats)
    pushPlusLogBuffer.length = 0

    await sendPushPlus(config, summary, 'info')
}

export async function sendPushPlus(config: WebhookPushPlusConfig, content: string, level: LogLevel): Promise<void> {
    if (!config?.token) return

    const title = config.title || 'Microsoft-Rewards-Script'
    const template = config.template || 'txt'
    const channel = config.channel || ''
    const webhook = config.webhook || ''

    const data: Record<string, unknown> = {
        token: config.token,
        title: `${title} [${level.toUpperCase()}]`,
        content: content,
        template: template
    }

    if (channel) data['channel'] = channel
    if (webhook) data['webhook'] = webhook

    await pushPlusQueue.add(async () => {
        try {
            await axios({
                method: 'POST',
                url: 'https://www.pushplus.plus/send',
                headers: { 'Content-Type': 'application/json' },
                data: data,
                timeout: 10000
            })
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status
            if (status === 429) return
            console.error(
                `[PushPlus] 推送失败 | HTTP ${status ?? 'N/A'} | ${err instanceof Error ? err.message : String(err)}`
            )
        }
    })
}

export function flushPushPlusQueue(timeoutMs = 5000): Promise<void> {
    return flushQueue(pushPlusQueue, timeoutMs)
}
