/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ProjectStatus } from '@prisma/client';

type CreateProjectPayload = {
  name: string;
  deadline: string | Date;
  description?: string;
  status?: string;
};

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProjectPayload, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        deadline: new Date(data.deadline),
        description: data.description,
        status: data.status as ProjectStatus | undefined,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        message: `Project "${data.name}" created`,
        userId,
        projectId: project.id,
      },
    });

    return project;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll() {
    return this.prisma.project.findMany({
      include: { _count: { select: { tasks: true } } },
    });
  }
}
