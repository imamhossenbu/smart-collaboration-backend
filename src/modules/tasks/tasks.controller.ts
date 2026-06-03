import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

import { CreateTaskSchema, UpdateTaskStatusSchema } from './task.schema';
import { Priority, TaskStatus } from '@prisma/client';
import type { CreateTaskDto, UpdateTaskStatusDto } from './task.schema';
import type { Task } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

interface PaginatedTasksResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Controller('api/v1/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UsePipes(new ZodValidationPipe(CreateTaskSchema))
  async create(
    @Body() body: CreateTaskDto,
    @Req() req: RequestWithUser,
  ): Promise<Task> {
    return this.tasksService.create(body, req.user.id);
  }

  @Patch(':id/status')
  @UsePipes(new ZodValidationPipe(UpdateTaskStatusSchema))
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<Task> {
    return this.tasksService.updateStatus(id, body.status, req.user);
  }

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: Priority,
    @Query('assignedToId') assignedToId?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sortBy') sortBy?: 'createdAt' | 'dueDate' | 'priority',
  ): Promise<PaginatedTasksResponse> {
    return this.tasksService.findAllFiltered({
      search,
      status,
      priority,
      assignedToId,
      projectId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sortBy,
    });
  }
}
