import { BaseActivity } from '../BaseActivity'
import type { DashboardData } from '../../../interface/DashboardData'
import { PromotionActivityRunner } from './PromotionActivityRunner'

export class DailySet extends BaseActivity {
    public async run(data: DashboardData): Promise<void> {
        const today = this.bot.utils.getFormattedDate()
        const pending =
            data.dashboard.dailySetPromotions[today]?.filter(item => !item.complete && item.pointProgressMax > 0) ?? []

        if (!pending.length) {
            this.bot.logger.info(this.bot.isMobile, 'DAILY-SET', '所有 "Daily Set" 项目均已完成')
            return
        }

        this.bot.logger.info(this.bot.isMobile, 'DAILY-SET', `开始处理 "Daily Set" 项目 | remaining=${pending.length}`)
        await new PromotionActivityRunner(this.bot).run(pending)
        this.bot.logger.info(this.bot.isMobile, 'DAILY-SET', '"Daily Set" 项目处理完成')
    }
}
