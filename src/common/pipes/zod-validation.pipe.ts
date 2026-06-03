import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import * as zod from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: zod.ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        ),
      });
    }
    return result.data;
  }
}
