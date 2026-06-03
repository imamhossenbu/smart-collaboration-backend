import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: Role;
  };
}

// DTO definitions (local) to satisfy typing when external DTOs are not imported
interface SignupDto {
  email: string;
  name: string;
  password: string;
  role?: Role;
}

interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(data: SignupDto): Promise<AuthUserResponse> {
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
        role: data.role ?? Role.TEAM_MEMBER,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async login(data: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password.');
    }

    const payload = { id: user.id, role: user.role, email: user.email };

    return {
      token: await this.jwtService.signAsync(payload),
      user: { id: user.id, name: user.name, role: user.role },
    };
  }
}
