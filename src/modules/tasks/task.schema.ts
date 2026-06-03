import { z } from 'zod';

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
  assignedToId: z.string().uuid().optional(),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
