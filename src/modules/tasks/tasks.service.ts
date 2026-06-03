/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface CreateTaskDto {
  projectId: string;
  title: string;
  dueDate: string | Date;
  status?: TaskStatus;
  assignedToId?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface UserPayload {
  id: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';
  email: string;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTaskDto, id: string) {
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

    const taskData: Prisma.TaskCreateInput = {
      title: data.title,
      dueDate,
      status: data.status,
      project: { connect: { id: data.projectId } },
      ...(data.assignedToId && {
        assignedTo: { connect: { id: data.assignedToId } },
      }),
      description: data.description,
      priority: data.priority,
    };

    return this.prisma.task.create({
      data: taskData,
    });
  }

  async updateStatus(id: string, status: TaskStatus, user: UserPayload) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found.');

    if (user.role === 'TEAM_MEMBER' && task.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Unauthorized: Cannot modify external assigned workloads.',
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }
}
