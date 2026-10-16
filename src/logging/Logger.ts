import chalk from 'chalk'
import cluster from 'cluster'
import { sendDiscord } from './Discord'
import { sendNtfy } from './Ntfy'
import { sendTelegram } from './Telegram'
import { sendPushPlus, collectPushPlusLog } from './PushPlus'
import type { MicrosoftRewardsBot } from '../index'
import { errorDiagnostic } from '../util/ErrorDiagnostic'
import type { LogFilter } from '../interface/Config'

export type Platform = boolean | 'main'
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type ColorKey = keyof typeof chalk
export interface IpcLog {
    content: string
    level: LogLevel
}

type ChalkFn = (msg: string) => string

function platformText(platform: Platform): string {
    return platform === 'main' ? 'MAIN' : platform ? 'MOBILE' : 'DESKTOP'
}

function platformBadge(platform: Platform): string {
    return platform === 'main' ? chalk.bgCyan('MAIN') : platform ? chalk.bgBlue('MOBILE') : chalk.bgMagenta('DESKTOP')
}

function getColorFn(color?: ColorKey): ChalkFn | null {
    return color && typeof chalk[color] === 'function' ? (chalk[color] as ChalkFn) : null
}

function consoleOut(level: LogLevel, msg: string, chalkFn: ChalkFn | null): void {
    const out = chalkFn ? chalkFn(msg) : msg
    switch (level) {
        case 'warn':
            return console.warn(out)
        case 'error':
            return console.error(out)
        default:
            return console.log(out)
    }
}

function formatMessage(message: string | Error): string {
    if (!(message instanceof Error)) return message.replace(/\r?\n/g, '\\n')

    const stackFrames = message.stack
        ?.split(/\r?\n/)
        .slice(1)
        .map(line => line.trim())
        .filter(Boolean)
        .join(' <- ')

    return stackFrames ? `${message.message} | stack=${stackFrames}` : message.message
}

export class Logger {
    constructor(private bot: MicrosoftRewardsBot) {}

    info(isMobile: Platform, title: string, message: string, color?: ColorKey) {
        return this.baseLog('info', isMobile, title, message, color)
    }

    warn(isMobile: Platform, title: string, message: string | Error, color?: ColorKey) {
        return this.baseLog('warn', isMobile, title, message, color)
    }

    error(isMobile: Platform, title: string, message: string | Error, color?: ColorKey) {
        return this.baseLog('error', isMobile, title, message, color)
    }

    debug(isMobile: Platform, title: string, message: string | Error, color?: ColorKey) {
        return this.baseLog('debug', isMobile, title, message, color)
    }

    private baseLog(
        level: LogLevel,
        isMobile: Platform,
        title: string,
        message: string | Error,
        color?: ColorKey
    ): void {
        const config = this.bot.config
        if (level === 'debug' && !config.debugLogs && !process.argv.includes('-dev')) return

        const now = new Date().toLocaleString()
        const formatted = formatMessage(message)
        const userName = this.bot.userData.userName || 'MAIN'
        const levelTag = level.toUpperCase()
        const cleanMsg = `[${now}] [${userName}] [${levelTag}] ${platformText(isMobile)} [${title}] ${formatted}`

        if (level === 'error' && config.errorDiagnostics) {
            const page = this.bot.isMobile ? this.bot.mainMobilePage : this.bot.mainDesktopPage
            const error = message instanceof Error ? message : new Error(String(message))
            errorDiagnostic(page, error)
        }

        const consoleAllowed = Logger.shouldPassFilter(config.consoleLogFilter, level, cleanMsg)
        const webhookAllowed = Logger.shouldPassFilter(config.webhook.webhookLogFilter, level, cleanMsg)

        if (consoleAllowed) {
            let logColor: ColorKey | undefined = color
            if (!logColor) {
                if (level === 'error') logColor = 'red'
                else if (level === 'warn') logColor = 'yellow'
                else if (level === 'debug') logColor = 'magenta'
            }

            const consoleStr = `[${now}] [${userName}] [${levelTag}] ${platformBadge(isMobile)} [${title}] ${formatted}`
            consoleOut(level, consoleStr, getColorFn(logColor))
        }

        if (level === 'debug') return

        const pushplus = config.webhook.pushplus
        const pushplusEnabled = Boolean(pushplus?.enabled && pushplus?.token)
        const dailySummary = pushplusEnabled && (pushplus?.dailySummary ?? true)

        // ── PushPlus 每日总结模式：主进程直接收集（不受 webhookLogFilter 限制）──
        // 汇总报告需要完整日志；若被过滤器误杀会导致"日志总数: 0 条"。
        if (pushplusEnabled && dailySummary && cluster.isPrimary) {
            collectPushPlusLog(level, cleanMsg)
        }

        // ── 以下 webhook 受 webhookLogFilter 限制 ────────────────────────────
        if (!webhookAllowed) return

        const hasOtherWebhook = Boolean(
            (config.webhook.discord?.enabled && config.webhook.discord.url) ||
            (config.webhook.ntfy?.enabled && config.webhook.ntfy.url) ||
            (config.webhook.telegram?.enabled && config.webhook.telegram.botToken && config.webhook.telegram.chatId) ||
            (pushplusEnabled && !dailySummary)
        )

        // worker 端：只要 PushPlus 汇总模式开启 或 有其他 webhook 通过过滤，就转发 IPC 日志
        // 主进程统一处理各 webhook 的分发与过滤
        const shouldForwardIpc = (pushplusEnabled && dailySummary) || hasOtherWebhook
        if (!cluster.isPrimary && shouldForwardIpc) {
            process.send?.({ __ipcLog: { content: cleanMsg, level } })
            return
        }

        if (!hasOtherWebhook) return

        if (cluster.isPrimary) {
            if (config.webhook.discord?.enabled && config.webhook.discord.url) {
                sendDiscord(config.webhook.discord.url, cleanMsg, level)
            }
            if (config.webhook.ntfy?.enabled && config.webhook.ntfy.url) {
                sendNtfy(config.webhook.ntfy, cleanMsg, level)
            }
            if (
                config.webhook.telegram?.enabled &&
                config.webhook.telegram.botToken &&
                config.webhook.telegram.chatId
            ) {
                sendTelegram(config.webhook.telegram, cleanMsg, level)
            }

            if (pushplusEnabled && !dailySummary) {
                sendPushPlus(pushplus!, cleanMsg, level)
            }
        }
    }

    static shouldPassFilter(filter: LogFilter | undefined, level: LogLevel, message: string): boolean {
        if (!filter || !filter.enabled) {
            return true
        }

        const { mode, levels, keywords, regexPatterns } = filter

        const hasLevelRule = Array.isArray(levels) && levels.length > 0
        const hasKeywordRule = Array.isArray(keywords) && keywords.length > 0
        const hasPatternRule = Array.isArray(regexPatterns) && regexPatterns.length > 0

        if (!hasLevelRule && !hasKeywordRule && !hasPatternRule) {
            return mode === 'blacklist'
        }

        const lowerMessage = message.toLowerCase()
        let isMatch = false

        if (hasLevelRule && levels!.includes(level)) {
            isMatch = true
        }

        if (!isMatch && hasKeywordRule) {
            if (keywords!.some(k => lowerMessage.includes(k.toLowerCase()))) {
                isMatch = true
            }
        }

        if (!isMatch && hasPatternRule) {
            for (const pattern of regexPatterns!) {
                try {
                    const regex = new RegExp(pattern, 'i')
                    if (regex.test(message)) {
                        isMatch = true
                        break
                    }
                } catch {}
            }
        }

        return mode === 'whitelist' ? isMatch : !isMatch
    }
}
