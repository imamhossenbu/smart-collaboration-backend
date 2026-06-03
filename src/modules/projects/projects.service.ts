import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { ProjectStatus } from '@prisma/client';
import type { CreateProjectDto } from './project.schema';
import type { Project, ProjectMember } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(data: CreateProjectDto, userId: string): Promise<Project> {
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        deadline: new Date(data.deadline),
        description: data.description,
        status: data.status ?? ProjectStatus.ACTIVE,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        message: `Project "${data.name}" created`,
        userId,
        projectId: project.id,
      },
    });

    await this.redis.del('dashboard:insights');

    return project;
  }

  async findAll(): Promise<Project[]> {
    return this.prisma.project.findMany({
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async addMember(
    projectId: string,
    userId: string,
    operatorId: string,
  ): Promise<ProjectMember> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing)
      throw new BadRequestException('User is already a member of this project');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId },
    });

    await this.prisma.activityLog.create({
      data: {
        message: `Member "${user.name}" added to project "${project.name}"`,
        userId: operatorId,
        projectId,
      },
    });

    await this.redis.del('dashboard:insights');

    return member;
  }

  async update(
    id: string,
    data: Partial<CreateProjectDto>,
    userId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        message: `Project "${updated.name}" updated`,
        userId,
        projectId: id,
      },
    });

    await this.redis.del('dashboard:insights');

    return updated;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.project.delete({ where: { id } });

    await this.prisma.activityLog.create({
      data: { message: `Project "${project.name}" deleted`, userId },
    });

    await this.redis.del('dashboard:insights');

    return { message: 'Project successfully deleted' };
  }
}
