import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectSchema, AddMemberSchema } from './project.schema';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';

// Type imports to fix isolatedModules error
import type { CreateProjectDto, AddMemberDto } from './project.schema';
import type { Project, ProjectMember } from '@prisma/client';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UsePipes(new ZodValidationPipe(CreateProjectSchema))
  async create(
    @Body() body: CreateProjectDto,
    @Req() req: RequestWithUser,
  ): Promise<Project> {
    if (new Date(body.deadline) < new Date()) {
      throw new BadRequestException('Please select a valid deadline.');
    }
    return this.projectsService.create(body, req.user.id);
  }

  @Get()
  async findAll(): Promise<Project[]> {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return this.projectsService.findOne(id);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UsePipes(new ZodValidationPipe(AddMemberSchema))
  async addMember(
    @Param('id') id: string,
    @Body() body: AddMemberDto,
    @Req() req: RequestWithUser,
  ): Promise<ProjectMember> {
    return this.projectsService.addMember(id, body.userId, req.user.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UsePipes(new ZodValidationPipe(CreateProjectSchema.partial()))
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateProjectDto>,
    @Req() req: RequestWithUser,
  ): Promise<Project> {
    return this.projectsService.update(id, body, req.user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    return this.projectsService.remove(id, req.user.id);
  }
}
