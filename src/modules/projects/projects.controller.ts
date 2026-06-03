/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UsePipes,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateProjectSchema } from './project.schema';
import type { CreateProjectDto } from './project.schema';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: string;
    email: string;
  };
}

@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UsePipes(new ZodValidationPipe(CreateProjectSchema))
  async create(@Body() body: CreateProjectDto, @Req() req: RequestWithUser) {
    if (new Date(body.deadline) < new Date()) {
      throw new BadRequestException('Please select a valid deadline.');
    }
    return this.projectsService.create(body, req.user.id);
  }

  @Get()
  async findAll() {
    return this.projectsService.findAll();
  }
}
