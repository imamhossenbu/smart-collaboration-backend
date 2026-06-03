import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SignupSchema, LoginSchema } from './auth.schema';
import type { SignupDto, LoginDto } from './auth.schema';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(SignupSchema))
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
