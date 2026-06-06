import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    
    if (notification.userId !== userId) {
        throw new NotFoundException('You cannot mark this notification as read');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async createNotification(userId: string, message: string, taskId?: string, projectId?: string) {
    return this.prisma.notification.create({
        data: {
            userId,
            message,
            taskId,
            projectId,
        }
    })
  }
}

