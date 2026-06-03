import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  role: Role;
  email: string;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
