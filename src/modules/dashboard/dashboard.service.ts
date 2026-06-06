/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { TaskStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/interfaces/request-with-user.interface';
import type {
  DashboardInsights,
  RecentActivityResponse,
} from './dashboard.interface';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getInsights(user: JwtPayload): Promise<DashboardInsights> {
    const isManager = user.role !== Role.TEAM_MEMBER;
    const taskWhere = isManager ? {} : { assignedToId: user.id };

    const totalProjects = isManager
      ? await this.prisma.project.count()
      : await this.prisma.project.count({
          where: { members: { some: { userId: user.id } } },
        });

    const totalTasks = await this.prisma.task.count({ where: taskWhere });
    const completedTasks = await this.prisma.task.count({
      where: { ...taskWhere, status: TaskStatus.COMPLETED },
    });
    const pendingTasks = await this.prisma.task.count({
      where: { ...taskWhere, status: { not: TaskStatus.COMPLETED } },
    });
    const overdueTasks = await this.prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: new Date() },
        status: { not: TaskStatus.COMPLETED },
      },
    });

    const priorityGroups = isManager
      ? await this.prisma.task.groupBy({
          by: ['priority'],
          _count: { _all: true },
        })
      : [];

    const memberWorkload = isManager
      ? await this.prisma.user.findMany({
          select: {
            id: true,
            name: true,
            _count: { select: { tasks: true } },
            tasks: { select: { status: true } },
          },
        })
      : [];

    const mappedWorkload = memberWorkload.map((u) => {
      const completed = u.tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      ).length;
      return {
        id: u.id,
        name: u.name,
        totalTasks: u._count.tasks,
        completedTasks: completed,
        pendingTasks: u._count.tasks - completed,
      };
    });

    const kpi: any = {
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
    };

    if (!isManager) {
      kpi.myActiveProjects = totalProjects;
      kpi.myAssignedTasks = totalTasks;
      kpi.myCompletedTasks = completedTasks;
      kpi.myOverdueTasks = overdueTasks;
    }

    return {
      kpi,
      priorityDistribution: priorityGroups.map((g) => ({
        priority: g.priority,
        _count: { _all: g._count._all },
      })),
      memberWorkloadSummary: mappedWorkload,
    };
  }

  async getRecentActivities(
    user: JwtPayload,
  ): Promise<RecentActivityResponse[]> {
    if (user.role === Role.TEAM_MEMBER) return [];

    return this.prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
  }
}
