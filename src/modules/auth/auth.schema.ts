import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignupDto = z.infer<typeof SignupSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
