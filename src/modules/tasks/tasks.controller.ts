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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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

  @Patch(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
    @Req() req: RequestWithUser,
  ) {
    return this.tasksService.updateTaskProgress(id, Number(progress), req.user);
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

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/tasks',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadAttachment(
    @Param('id') taskId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('File not provided');
    }
    const url = `/uploads/tasks/${file.filename}`;
    return this.tasksService.addAttachment(taskId, file.originalname, url);
  }
}
