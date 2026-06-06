/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async createComment(taskId: string, userId: string, content: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getComments(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.userId !== userId) {
      throw new NotFoundException('You can only delete your own comments');
    }

    return this.prisma.comment.delete({ where: { id } });
  }
}
