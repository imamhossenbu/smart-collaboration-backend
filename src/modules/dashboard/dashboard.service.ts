import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import type {
  DashboardInsights,
  RecentActivityResponse,
} from './dashboard.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getInsights(): Promise<DashboardInsights> {
    const cacheKey = 'dashboard:insights';
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData) as DashboardInsights;
    }

    const now = new Date();

    const [
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      priorityGroups,
      memberWorkload,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.task.count({
        where: { status: { not: TaskStatus.COMPLETED } },
      }),
      this.prisma.task.count({
        where: {
          dueDate: { lt: now },
          status: { not: TaskStatus.COMPLETED },
        },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { tasks: true },
          },
          tasks: {
            select: { status: true },
          },
        },
      }),
    ]);

    const mappedWorkload = memberWorkload.map((user) => {
      const completed = user.tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      ).length;
      return {
        id: user.id,
        name: user.name,
        totalTasks: user._count.tasks,
        completedTasks: completed,
        pendingTasks: user._count.tasks - completed,
      };
    });

    const insights: DashboardInsights = {
      kpi: {
        totalProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
      },
      priorityDistribution: priorityGroups.map((g) => ({
        priority: g.priority,
        _count: { _all: g._count._all },
      })),
      memberWorkloadSummary: mappedWorkload,
    };

    await this.redis.set(cacheKey, JSON.stringify(insights), 300);

    return insights;
  }

  async getRecentActivities(): Promise<RecentActivityResponse[]> {
    return this.prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });
  }
}
