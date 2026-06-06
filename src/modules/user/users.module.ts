import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { UsersController } from './users.service';
import { usersService } from './users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [usersService],
  exports: [usersService],
})
export class UsersModule {}
