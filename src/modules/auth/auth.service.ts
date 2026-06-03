/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { SignupDto, LoginDto } from './auth.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(
    data: SignupDto,
  ): Promise<Pick<User, 'id' | 'name' | 'email' | 'role'>> {
    const userExists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (userExists) {
      throw new BadRequestException('Email already in use.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async login(
    data: LoginDto,
  ): Promise<{ token: string; user: Pick<User, 'id' | 'name' | 'role'> }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw new BadRequestException('Invalid email or password.');
    }

    const payload = { id: user.id, role: user.role, email: user.email };

    return {
      token: await this.jwtService.signAsync(payload),
      user: { id: user.id, name: user.name, role: user.role },
    };
  }
}
