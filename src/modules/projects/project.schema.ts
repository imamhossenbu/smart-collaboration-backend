import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deadline: z.string().datetime(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
