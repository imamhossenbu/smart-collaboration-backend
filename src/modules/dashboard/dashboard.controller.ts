import { Controller, Get, Req, UseGuards } from '@nestjs/common';
// 'import type' ব্যবহার করুন যাতে isolatedModules এরর না আসে
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('insights')
  async getInsights(@Req() req: RequestWithUser) {
    return this.dashboardService.getInsights(req.user);
  }

  @Get('recent-activities')
  async getRecentActivities(@Req() req: RequestWithUser) {
    return this.dashboardService.getRecentActivities(req.user);
  }
}
