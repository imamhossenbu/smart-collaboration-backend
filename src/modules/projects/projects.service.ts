/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { CreateProjectDto } from './project.schema';
import type { Project, ProjectMember } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ১. প্রজেক্ট তৈরির মেথড
  async create(data: CreateProjectDto, userId: string): Promise<Project> {
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        budget: data.budget ?? 0,
        deadline: new Date(data.deadline),
        status: data.status ?? ProjectStatus.ACTIVE,
      },
    });

    if (data.milestones && data.milestones.length > 0) {
      await this.prisma.milestone.createMany({
        data: data.milestones.map((m) => ({
          projectId: project.id,
          title: m.title.trim(),
          status: 'PENDING',
        })),
      });
    }

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

  // ২. সব প্রজেক্ট দেখার মেথড
  async findAll(): Promise<Project[]> {
    return this.prisma.project.findMany({
      include: {
        _count: { select: { tasks: true, milestones: true } },
      },
    });
  }

  // ৩. একটি প্রজেক্ট ডিটেইলস দেখার মেথড
  async findOne(id: string): Promise<any> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tasks: true,
        milestones: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  // ৪. মেম্বার যুক্ত করার মেথড
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

  // ৫. প্রজেক্ট আপডেট করার মেথড
  async update(
    id: string,
    data: Partial<CreateProjectDto>,
    userId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    // ডাটাবেজ ট্রানজেকশন ব্যবহার করা ভালো যাতে সব ডাটা একসাথে আপডেট হয়
    return await this.prisma.$transaction(async (tx) => {
      // ১. প্রজেক্টের বেসিক ইনফো আপডেট
      const updated = await tx.project.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          budget: data.budget,
          status: data.status,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
        },
      });

      // ২. মাইলস্টোন আপডেট (যদি পাঠানো হয়)
      if (data.milestones) {
        // আগে পুরনো মাইলস্টোনগুলো ডিলিট করা (অথবা কানেক্ট/ডিসকানেক্ট লজিক বসানো)
        await tx.milestone.deleteMany({ where: { projectId: id } });
        // নতুনগুলো তৈরি করা
        await tx.milestone.createMany({
          data: data.milestones.map((m) => ({
            projectId: id,
            title: m.title.trim(),
            status: 'PENDING',
          })),
        });
      }

      await this.redis.del('dashboard:insights');
      return updated;
    });
  }

  // ৬. প্রজেক্ট ডিলিট করার মেথড
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
