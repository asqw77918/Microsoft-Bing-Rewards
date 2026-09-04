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

function buildSummary(entries: PushPlusLogEntry[]): string {
    const now = new Date().toLocaleString()

    // buffer 为空时仍发送基本摘要，确保用户收到运行完成通知
    if (entries.length === 0) {
        return `======== 运行总结汇报 ========\n生成时间: ${now}\n日志总数: 0 条\n（未收集到日志，可能因 IPC 竞态导致日志丢失）\n================================`
    }

    const errors = entries.filter(e => e.level === 'error')
    const warns = entries.filter(e => e.level === 'warn')
    const infos = entries.filter(e => e.level === 'info')

    const lines: string[] = []
    lines.push('======== 运行总结汇报 ========')
    lines.push(`生成时间: ${now}`)
    lines.push(`日志总数: ${entries.length} 条 | 错误 ${errors.length} | 警告 ${warns.length} | 信息 ${infos.length}`)
    lines.push('')

    const pushSection = (title: string, list: PushPlusLogEntry[]): void => {
        if (list.length === 0) return
        lines.push(`----- ${title} (${list.length} 条) -----`)
        const shown = list.slice(0, 50)
        for (const entry of shown) {
            lines.push(`[${entry.level.toUpperCase()}] ${entry.content}`)
        }
        if (list.length > shown.length) {
            lines.push(`... 其余 ${list.length - shown.length} 条已省略`)
        }
        lines.push('')
    }

    pushSection('错误', errors)
    pushSection('警告', warns)
    pushSection('信息', infos)

    lines.push('================================')
    return lines.join('\n')
}

export async function sendPushPlusSummary(config: WebhookPushPlusConfig | undefined): Promise<void> {
    if (!config?.token) return

    const summary = buildSummary(pushPlusLogBuffer)
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
