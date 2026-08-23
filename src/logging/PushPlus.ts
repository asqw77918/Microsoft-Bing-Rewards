import { httpRequest } from '../util/Http'
import type { HttpRequestConfig } from '../util/Http'
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
    const errors = entries.filter(e => e.level === 'error')
    const warns = entries.filter(e => e.level === 'warn')
    const infos = entries.filter(e => e.level === 'info')

    const lines: string[] = []
    lines.push('======== 运行总结汇报 ========')
    lines.push(`生成时间: ${now}`)
    lines.push(
        `日志总数: ${entries.length} 条 | 错误 ${errors.length} | 警告 ${warns.length} | 信息 ${infos.length}`
    )
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
    if (pushPlusLogBuffer.length === 0) return

    const summary = buildSummary(pushPlusLogBuffer)
    pushPlusLogBuffer.length = 0

    await sendPushPlus(config, summary, 'info')
}

function getPushPlusTemplate(level: LogLevel): string {
    switch (level) {
        case 'error':
            return 'txt'
        case 'warn':
            return 'txt'
        default:
            return 'txt'
    }
}

export async function sendPushPlus(config: WebhookPushPlusConfig, content: string, level: LogLevel): Promise<void> {
    if (!config?.token) return

    const title = config.title || 'Microsoft-Rewards-Script'
    const template = config.template || getPushPlusTemplate(level)
    const channel = config.channel || ''
    const webhook = config.webhook || ''

    const url = 'http://www.pushplus.plus/send'

    const data: Record<string, unknown> = {
        token: config.token,
        title: `${title} [${level.toUpperCase()}]`,
        content: content,
        template: template
    }

    if (channel) data['channel'] = channel
    if (webhook) data['webhook'] = webhook

    const request: HttpRequestConfig = {
        method: 'POST',
        url: url,
        headers: { 'Content-Type': 'application/json' },
        data: data,
        timeout: 10000
    }

    await pushPlusQueue.add(async () => {
        try {
            await httpRequest(request)
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status
            if (status === 429) return
        }
    })
}

export function flushPushPlusQueue(timeoutMs = 5000): Promise<void> {
    return flushQueue(pushPlusQueue, timeoutMs)
}
