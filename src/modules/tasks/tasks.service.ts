import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus, Role, Priority, Prisma } from '@prisma/client';
import type { Task } from '@prisma/client';

import type { CreateTaskDto } from './task.schema';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/interfaces/request-with-user.interface';

interface TaskFilterQuery {
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  assignedToId?: string;
  projectId?: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'dueDate' | 'priority';
}

interface PaginatedTasksResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(data: CreateTaskDto, userId: string): Promise<Task> {
    const dueDate = new Date(data.dueDate);
    if (dueDate < new Date()) {
      throw new BadRequestException('Please select a valid deadline.');
    }

    const existingTask = await this.prisma.task.findUnique({
      where: {
        projectId_title: { projectId: data.projectId, title: data.title },
      },
    });

    if (existingTask) {
      throw new BadRequestException('This task already exists in the project.');
    }

    if (data.status === TaskStatus.COMPLETED && data.assignedToId) {
      throw new BadRequestException('Completed tasks cannot be reassigned.');
    }

    // প্রজেক্ট মেম্বার ভ্যালিডেশন
    if (data.assignedToId) {
      const isMember = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: data.projectId,
            userId: data.assignedToId,
          },
        },
      });
      if (!isMember) {
        throw new BadRequestException(
          'Assigned user is not a member of this project.',
        );
      }
    }

    // মাইলস্টোন ভ্যালিডেশন (যদি প্রদান করা হয়)
    if (data.milestoneId) {
      const milestone = await this.prisma.milestone.findUnique({
        where: { id: data.milestoneId },
      });
      if (!milestone || milestone.projectId !== data.projectId) {
        throw new BadRequestException('Invalid milestone for this project.');
      }
    }

    const taskData: Prisma.TaskCreateInput = {
      title: data.title,
      dueDate,
      status: data.status ?? TaskStatus.TODO,
      priority: data.priority,
      description: data.description,
      project: { connect: { id: data.projectId } },
    };

    if (data.assignedToId) {
      taskData.assignedTo = { connect: { id: data.assignedToId } };
    }

    // মাইলস্টোন কানেক্ট করা (milestone field may not exist on TaskCreateInput)
    if (data.milestoneId) {
      // set milestoneId directly on the create input
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      taskData.milestoneId = data.milestoneId;
    }

    const task = await this.prisma.task.create({ data: taskData });

    await this.prisma.activityLog.create({
      data: {
        message: `Task "${data.title}" created under project`,
        userId,
        projectId: data.projectId,
        taskId: task.id,
      },
    });

    await this.redis.del('dashboard:insights');
    return task;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    user: JwtPayload,
  ): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found.');

    if (user.role === Role.TEAM_MEMBER && task.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Unauthorized: Cannot modify external assigned workloads.',
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { status },
    });

    await this.prisma.activityLog.create({
      data: {
        message: `Task "${task.title}" marked as ${status}`,
        userId: user.id,
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    await this.redis.del('dashboard:insights');
    return updatedTask;
  }

  async findAllFiltered(
    query: TaskFilterQuery,
  ): Promise<PaginatedTasksResponse> {
    const {
      search,
      status,
      priority,
      assignedToId,
      projectId,
      page,
      limit,
      sortBy,
    } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {};

    if (projectId) whereClause.projectId = projectId;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedToId) whereClause.assignedToId = assignedToId;

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderByClause: Prisma.TaskOrderByWithRelationInput = {};
    if (sortBy) {
      orderByClause[sortBy] = 'asc';
    } else {
      orderByClause.createdAt = 'desc';
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          assignedTo: { select: { id: true, name: true } },
          milestone: { select: { id: true, title: true } }, // মাইলস্টোন ইনক্লুড করা হয়েছে
        },
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    return {
      data: tasks,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
