import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required.' }),
  description: z.string().optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().default(0),
  deadline: z
    .string()
    .datetime({ message: 'Invalid ISO datetime string format.' }),
  status: z.nativeEnum(ProjectStatus).optional().default(ProjectStatus.ACTIVE),
  milestones: z
    .array(z.object({ title: z.string().min(1, 'Title is required') }))
    .optional(),
});

export const AddMemberSchema = z.object({
  userId: z
    .string()
    .uuid({ message: 'Invalid user ID format (Must be UUID).' }),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type AddMemberDto = z.infer<typeof AddMemberSchema>;
