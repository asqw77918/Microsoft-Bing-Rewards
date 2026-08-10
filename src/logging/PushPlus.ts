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
