/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Injectable, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class usersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
  }
}
