import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../common/interfaces/request-with-user.interface';

@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async addComment(
    @Param('taskId') taskId: string,
    @Body('content') content: string,
    @Req() req: { user: JwtPayload },
  ) {
    return this.commentsService.createComment(taskId, req.user.id, content);
  }

  @Get()
  async getComments(@Param('taskId') taskId: string) {
    return this.commentsService.getComments(taskId);
  }

  @Delete(':commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: { user: JwtPayload },
  ) {
    return this.commentsService.deleteComment(commentId, req.user.id);
  }
}

