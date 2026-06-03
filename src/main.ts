import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS ওপেন করুন যাতে ফ্রন্টএন্ড কল করতে পারে
  app.enableCors();

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Server is high-performing on port: ${port}`);
}
bootstrap();
