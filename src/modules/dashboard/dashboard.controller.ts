import { Controller, Get, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';
import {
  DashboardInsights,
  RecentActivityResponse,
} from './dashboard.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('insights')
  async getInsights(): Promise<DashboardInsights> {
    return this.dashboardService.getInsights();
  }

  @Get('recent-activities')
  async getRecentActivities(): Promise<RecentActivityResponse[]> {
    return this.dashboardService.getRecentActivities();
  }
}
