import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../domain/service';

export class StatsController {
    private statsService: StatsService;

    constructor(statsService?: StatsService) {
        this.statsService = statsService || new StatsService();
    }

    // Tổng hợp usage toàn hệ thống
    async usageSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, status } = req.query;
            const data = await this.statsService.fetchUsageSummary({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                status: status as 'success' | 'failed' | 'timeout',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Thống kê usage theo provider
    async providerUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, status } = req.query;
            const data = await this.statsService.fetchProviderUsage({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                status: status as 'success' | 'failed' | 'timeout',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Thống kê nhanh users, projects
    async quickStats(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.statsService.fetchQuickStats();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // System metrics
    async systemStats(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.statsService.fetchSystemStats();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // User analytics (new registrations, online users, timeline)
    async userAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const { rangeDays } = req.query;
            const range = rangeDays ? parseInt(rangeDays as string, 10) : 7;
            const data = await this.statsService.fetchUserAnalytics({
                rangeDays: isNaN(range) ? 7 : range,
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Trends (user, api, project, activity): 7 ngày gần nhất so với 7 ngày trước đó, từ dữ liệu thật
    async trends(req: Request, res: Response, next: NextFunction) {
        try {
            const DAY = 24 * 3600 * 1000;
            const now = Date.now();
            const cur = new Date(now - 7 * DAY), prev = new Date(now - 14 * DAY);
            const [User, Project, ApiUsage, Log] = await Promise.all([
                import('../../../../../internal/model/user'),
                import('../../../../../internal/model/project'),
                import('../../../../../internal/model/api_usage'),
                import('../../../../../internal/model/log'),
            ]).then((m) => m.map((x: any) => x.default));
            const count = (M: any, field: string, from: Date, to?: Date) =>
                M.countDocuments({ [field]: to ? { $gte: from, $lt: to } : { $gte: from } });
            const trend = (now7: number, before7: number) => {
                if (now7 === 0 && before7 === 0) return { type: 'neutral', icon: 'remove', value: '—' };
                if (before7 === 0) return { type: 'positive', icon: 'trending_up', value: `+${now7} mới` };
                const pct = Math.round(((now7 - before7) / before7) * 100);
                return { type: pct >= 0 ? 'positive' : 'negative', icon: pct >= 0 ? 'trending_up' : 'trending_down', value: `${pct >= 0 ? '+' : ''}${pct}%` };
            };
            const [u1, u0, p1, p0, a1, a0, l1, l0] = await Promise.all([
                count(User, 'created_at', cur), count(User, 'created_at', prev, cur),
                count(Project, 'created_at', cur), count(Project, 'created_at', prev, cur),
                count(ApiUsage, 'created_at', cur), count(ApiUsage, 'created_at', prev, cur),
                count(Log, 'created_at', cur), count(Log, 'created_at', prev, cur),
            ]);
            res.json({ userTrend: trend(u1, u0), apiTrend: trend(a1, a0), projectTrend: trend(p1, p0), activityTrend: trend(l1, l0), period: '7 ngày so với 7 ngày trước' });
        } catch (err) {
            next(err);
        }
    }

    // Activities (daily active)
    async activities(req: Request, res: Response, next: NextFunction) {
        try {
            // Đếm số API calls hôm nay
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ApiUsage = (await import('../../../../../internal/model/api_usage')).default;
            const dailyActive = await ApiUsage.countDocuments({
                created_at: { $gte: today }
            });
            res.json({
                dailyActive: dailyActive || 0
            });
        } catch (err) {
            next(err);
        }
    }

    // System Settings
    async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({
                systemName: 'SmartSpec',
                adminEmail: 'admin@smartspec.com',
                maxProjectsPerUser: 10,
                dailyApiLimit: 1000,
                sessionTimeout: 30,
                backupInterval: 24,
                logRetention: 30,
                maintenanceMode: false,
            });
        } catch (err) {
            next(err);
        }
    }

    async updateSettings(req: Request, res: Response, next: NextFunction) {
        try {
            // TODO: Lưu vào database
            res.json({
                message: 'Settings updated successfully',
                data: req.body
            });
        } catch (err) {
            next(err);
        }
    }

    // Lọc API usage với filters
    async filteredUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, status, groupBy } = req.query;
            const data = await this.statsService.fetchFilteredUsage({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                status: status as 'success' | 'failed' | 'timeout',
                groupBy: groupBy as 'day' | 'month' | 'year',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    // Lấy dữ liệu cho biểu đồ
    async chartData(req: Request, res: Response, next: NextFunction) {
        try {
            const { dateFrom, dateTo, provider, chartType } = req.query;
            if (!chartType || !['timeline', 'provider', 'status'].includes(chartType as string)) {
                return res.status(400).json({ error: 'Invalid chartType. Must be timeline, provider, or status' });
            }
            const data = await this.statsService.fetchChartData({
                dateFrom: dateFrom as string,
                dateTo: dateTo as string,
                provider: provider as string,
                chartType: chartType as 'timeline' | 'provider' | 'status',
            });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}
