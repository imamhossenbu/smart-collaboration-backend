/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UsePipes,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateTaskSchema } from './task.schema';
import type { CreateTaskDto } from './task.schema';
import type { TaskStatus } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';
    email: string;
  };
}

@Controller('api/v1/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UsePipes(new ZodValidationPipe(CreateTaskSchema))
  async create(@Body() body: CreateTaskDto, @Req() req: RequestWithUser) {
    return this.tasksService.create(body, req.user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
    @Req() req: RequestWithUser,
  ) {
    return this.tasksService.updateStatus(id, status, req.user);
  }
}
