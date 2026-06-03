import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import {
  DashboardInsights,
  RecentActivityResponse,
} from './dashboard.interface';

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
