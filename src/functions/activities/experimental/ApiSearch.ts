import { SearchQueryQueue } from '../../SearchQueryQueue'
import { BaseActivity } from '../BaseActivity'
import { BonusTracker } from '../search/BonusTracker'
import { SearchProgress } from '../search/SearchProgress'
import { BingSearchApi } from './BingSearchApi'

const STAGNANT_LIMIT = 10
const MAX_SEARCHES = 60
const DASHBOARD_REFRESH_EVERY = 5

export class ApiSearch extends BaseActivity {
    private readonly searchApi = new BingSearchApi(this.bot)
    private readonly searchProgress = new SearchProgress(this.bot)

    public async doSearch(isMobile: boolean): Promise<number> {
        const startBalance = Number(this.bot.userData.currentPoints ?? 0)
        let totalGained = 0

        this.bot.logger.info(isMobile, 'SEARCH-BING', `正在开始 Bing 搜索 | currentBalance=${startBalance}`)

        try {
            const missing = await this.searchProgress.getMissing(isMobile)
            this.bot.logger.info(
                isMobile,
                'SEARCH-BING',
                `剩余搜索积分 | edge=${missing.edgePoints} | desktop=${missing.desktopPoints} | mobile=${missing.mobilePoints}`
            )
            if (missing.totalPoints <= 0) {
                this.bot.logger.info(isMobile, 'SEARCH-BING', '没有可赚取的搜索积分，跳过')
                return 0
            }
            let remainingPoints = missing.totalPoints

            const queryQueue = new SearchQueryQueue(this.bot)
            const topicCount = await queryQueue.prepare()
            if (!topicCount) {
                this.bot.logger.warn(isMobile, 'SEARCH-BING', '没有可用的主要搜索主题，跳过')
                return 0
            }
            this.bot.logger.info(
                isMobile,
                'SEARCH-BING',
                `查询队列就绪 | mainTopics=${topicCount} | clusterSearch=${this.bot.config.searchSettings.clusterSearch}`
            )

            let stagnant = 0
            let performed = 0
            let lastEarned: number | null = null

            while (performed < MAX_SEARCHES) {
                const query = await queryQueue.next()
                if (!query) {
                    this.bot.logger.warn(isMobile, 'SEARCH-BING', '查询队列已耗尽，停止')
                    break
                }

                const res = await this.searchApi.report(query)
                performed++

                if (!res.ig) {
                    this.bot.logger.warn(isMobile, 'SEARCH-BING', `查询 "${query}" 没有 IG - 跳过`)
                    continue
                }

                if (res.balance != null) this.bot.userData.currentPoints = res.balance

                const earned = res.searchPointsEarned
                const limit = res.searchPointsLimit
                const responseCapReached = earned != null && limit != null && limit > 0 && earned >= limit
                const cap = earned != null && limit != null ? `${earned}/${limit}` : 'n/a'

                const gained = res.gained ?? 0
                const responseProgress = earned != null && lastEarned != null ? earned - lastEarned : gained
                if (earned != null) lastEarned = earned

                let dashboardProgress: number | null = null
                let dashboardChecked = false
                const shouldRefreshDashboard =
                    performed === 1 ||
                    performed % DASHBOARD_REFRESH_EVERY === 0 ||
                    earned == null ||
                    limit == null ||
                    responseProgress <= 0 ||
                    responseCapReached

                if (shouldRefreshDashboard) {
                    try {
                        const updated = await this.searchProgress.getMissing(isMobile)
                        dashboardProgress = Math.max(0, remainingPoints - updated.totalPoints)
                        remainingPoints = updated.totalPoints
                        dashboardChecked = true
                    } catch (error) {
                        this.bot.logger.debug(
                            isMobile,
                            'SEARCH-BING',
                            `无法刷新${isMobile ? '移动端' : '桌面端'}搜索配额 | ${
                                error instanceof Error ? error.message : String(error)
                            }`
                        )
                    }
                }

                const searchProgress =
                    dashboardProgress === null ? responseProgress : Math.max(dashboardProgress, responseProgress)
                const capReached = dashboardChecked ? remainingPoints <= 0 : responseCapReached

                if (gained > 0) {
                    totalGained += gained
                    this.bot.userData.gainedPoints = (this.bot.userData.gainedPoints ?? 0) + gained
                }

                if (searchProgress > 0) {
                    stagnant = 0
                    this.bot.logger.info(
                        isMobile,
                        'SEARCH-BING',
                        `获得积分 | pointsGained=${gained} | currentBalance=${res.balance} | query="${query}"` +
                            ` | remaining=${remainingPoints} | searchPts=${cap}`,
                        'green'
                    )
                } else {
                    stagnant++
                    this.bot.logger.info(
                        isMobile,
                        'SEARCH-BING',
                        `无积分 ${stagnant}/${STAGNANT_LIMIT} | query="${query}"` +
                            ` | remaining=${remainingPoints} | searchPts=${cap}`
                    )
                }

                if (capReached) {
                    this.bot.logger.info(
                        isMobile,
                        'SEARCH-BING',
                        `${isMobile ? '移动端' : '桌面端'}搜索配额已完成` +
                            ` | remaining=${remainingPoints} | responseSearchPts=${cap}`,
                        'green'
                    )
                    break
                }

                if (stagnant >= STAGNANT_LIMIT) {
                    this.bot.logger.warn(
                        isMobile,
                        'SEARCH-BING',
                        `连续 ${STAGNANT_LIMIT} 次搜索未获得积分，正在中止`
                    )
                    break
                }

                await this.bot.utils.wait(
                    this.bot.utils.randomDelay(
                        this.bot.config.searchSettings.searchDelay.min,
                        this.bot.config.searchSettings.searchDelay.max
                    )
                )
            }

            this.bot.logger.info(
                isMobile,
                'SEARCH-BING',
                `Bing 搜索已完成 | pointsGained=${totalGained} | currentBalance=${this.bot.userData.currentPoints} | previousBalance=${startBalance} | searches=${performed}`
            )
            return totalGained
        } catch (error) {
            this.bot.logger.error(
                isMobile,
                'SEARCH-BING',
                `doSearch 出错 | ${error instanceof Error ? error.message : String(error)}`
            )
            return totalGained
        }
    }

    public async doBonusSearches(): Promise<number> {
        const isMobile = this.bot.isMobile
        const tracker = new BonusTracker(this.bot, isMobile)

        const ready = await tracker.prepare()
        if (!ready || !tracker.started) return 0

        let totalGained = 0
        let performed = 0
        let stagnant = 0

        try {
            const queryQueue = new SearchQueryQueue(this.bot)
            const topicCount = await queryQueue.prepare()
            if (!topicCount) {
                this.bot.logger.warn(isMobile, tracker.context, '没有可用的主要搜索主题，跳过')
                return 0
            }
            this.bot.logger.info(
                isMobile,
                tracker.context,
                `查询队列就绪 | mainTopics=${topicCount} | clusterSearch=${this.bot.config.searchSettings.clusterSearch}`
            )

            while (!tracker.done() && performed < tracker.maxSearches && stagnant < tracker.stagnantLimit) {
                const query = await queryQueue.next()
                if (!query) {
                    this.bot.logger.warn(isMobile, tracker.context, '查询队列已耗尽，停止')
                    break
                }

                const res = await this.searchApi.report(query)
                performed++

                if (!res.ig) {
                    this.bot.logger.warn(isMobile, tracker.context, `查询 "${query}" 未返回 IG - 跳过`)
                    continue
                }

                const gained = await tracker.measure()
                if (gained > 0) {
                    stagnant = 0
                    totalGained += gained
                    this.bot.logger.info(
                        isMobile,
                        tracker.context,
                        `pointsGained=${gained} | currentBalance=${this.bot.userData.currentPoints} | query="${query}" | ${tracker.progress()}`,
                        'green'
                    )
                } else {
                    stagnant++
                    this.bot.logger.info(
                        isMobile,
                        tracker.context,
                        `无积分 ${stagnant}/${tracker.stagnantLimit} | query="${query}" | ${tracker.progress()}`
                    )
                }

                await this.bot.utils.wait(
                    this.bot.utils.randomDelay(
                        this.bot.config.searchSettings.searchDelay.min,
                        this.bot.config.searchSettings.searchDelay.max
                    )
                )
            }
        } catch (error) {
            this.bot.logger.error(
                isMobile,
                tracker.context,
                `奖励搜索会话出错 | ${error instanceof Error ? error.message : String(error)}`
            )
        }

        const done = tracker.done() && !tracker.offerLost
        const reason = done
            ? '活动完成'
            : tracker.offerLost
              ? '活动已不存在'
              : performed >= tracker.maxSearches
                ? '已达到 maxBonusSearches 上限'
                : stagnant >= tracker.stagnantLimit
                  ? `${tracker.stagnantLimit} 次无积分搜索`
                  : '查询池已用尽'

        this.bot.logger.info(
            isMobile,
            tracker.context,
            `奖励搜索耕种${done ? '完成' : '已停止'}（${reason}） | pointsGained=${totalGained} | currentBalance=${this.bot.userData.currentPoints} | ${tracker.progress()} | searches=${performed}`,
            done || totalGained > 0 ? 'green' : undefined
        )
        return totalGained
    }
}
