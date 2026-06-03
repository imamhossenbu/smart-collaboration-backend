import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deadline: z.string().datetime(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type AddMemberDto = z.infer<typeof AddMemberSchema>;
