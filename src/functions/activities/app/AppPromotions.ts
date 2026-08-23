import { BaseActivity } from '../BaseActivity'
import type { AppDashboardData } from '../../../interface/AppDashBoardData'

export class AppPromotions extends BaseActivity {
    public async run(data: AppDashboardData): Promise<void> {
        const pending = data.response.promotions.filter(promotion => {
            const attributes = promotion.attributes
            return (
                attributes['complete']?.toLowerCase() === 'false' &&
                Boolean(attributes['offerid']) &&
                attributes['type'] === 'sapphire'
            )
        })

        if (!pending.length) {
            this.bot.logger.info(
                this.bot.isMobile,
                'APP-PROMOTIONS',
                '所有 "App Promotions" 项目均已完成'
            )
            return
        }

        this.bot.logger.info(
            this.bot.isMobile,
            'APP-PROMOTIONS',
            `开始处理 "App Promotions" 项目 | remaining=${pending.length}`
        )
        for (const [index, promotion] of pending.entries()) {
            await this.bot.activities.doAppReward(promotion)
            if (index < pending.length - 1) {
                await this.bot.utils.wait(this.bot.utils.randomDelay(5000, 15000))
            }
        }
        this.bot.logger.info(this.bot.isMobile, 'APP-PROMOTIONS', '已处理完 "App Promotions" 项目')
    }
}
