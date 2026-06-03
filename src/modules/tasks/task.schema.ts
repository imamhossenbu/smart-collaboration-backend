import { z } from 'zod';
import { Priority, TaskStatus } from '@prisma/client';

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.nativeEnum(Priority),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedToId: z.string().uuid().optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskStatusDto = z.infer<typeof UpdateTaskStatusSchema>;
