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

// ইন্টারফেসগুলো পরিষ্কার রাখা হলো
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

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ১. নতুন টাস্ক তৈরি
  async create(data: CreateTaskDto, userId: string): Promise<Task> {
    if (new Date(data.dueDate) < new Date()) {
      throw new BadRequestException('Please select a valid deadline.');
    }

    const existingTask = await this.prisma.task.findUnique({
      where: {
        projectId_title: { projectId: data.projectId, title: data.title },
      },
    });
    if (existingTask)
      throw new BadRequestException('This task already exists in the project.');

    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        dueDate: data.dueDate,
        status: data.status ?? TaskStatus.TODO,
        priority: data.priority,
        description: data.description,
        projectId: data.projectId,
        assignedToId: data.assignedToId,
        milestoneId: data.milestoneId,
      },
    });

    await this.redis.del('dashboard:insights');
    return task;
  }

  // ২. প্রগ্রেস আপডেট (সাথে স্ট্যাটাস অটো-আপডেট)
  async updateTaskProgress(
    id: string,
    progress: number,
    user: JwtPayload,
  ): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found.');

    // অথরাইজেশন: এডমিন/ম্যানেজার অথবা প্রজেক্টের সদস্য হতে হবে
    if (user.role === Role.TEAM_MEMBER) {
      const isMember = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: user.id },
        },
      });
      if (!isMember)
        throw new ForbiddenException('You are not a member of this project.');
    }

    const newStatus =
      progress >= 100
        ? TaskStatus.COMPLETED
        : progress > 0
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.TODO;

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { progress, status: newStatus },
    });

    await this.redis.del('dashboard:insights');
    return updatedTask;
  }

  // ৩. শুধু স্ট্যাটাস আপডেট
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

    await this.redis.del('dashboard:insights');
    return updatedTask;
  }

  // ৪. টাস্ক লিস্ট দেখা (ফিল্টারিং ও প্রজেক্ট রিলেশনসহ)
  async findAllFiltered(query: TaskFilterQuery) {
    const skip = (query.page - 1) * query.limit;
    const whereClause: Prisma.TaskWhereInput = {
      projectId: query.projectId,
      status: query.status,
      priority: query.priority,
      assignedToId: query.assignedToId,
    };

    if (query.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy || 'createdAt']: 'desc' },
        include: {
          project: { select: { name: true } }, // প্রজেক্ট নাম যোগ করা হলো
          assignedTo: { select: { id: true, name: true } },
          milestone: { select: { id: true, title: true } },
        },
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ৫. টাস্ক ডিলিট
  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
    await this.redis.del('dashboard:insights');
  }

  // ৬. ফাইল অ্যাটাচমেন্ট
  async addAttachment(taskId: string, filename: string, url: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    return this.prisma.attachment.create({
      data: {
        filename,
        url,
        taskId,
      },
    });
  }
}
