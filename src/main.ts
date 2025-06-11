import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './chat/redis/redis.adapter';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'chat',
        protoPath: join(__dirname, '../src/common/grpc/proto/chat.proto'),
        url: '0.0.0.0:5051',
      },
    });

    await app.init();
    await app.startAllMicroservices();
    await app.listen(3001);
    console.log(`Server running on http://localhost:3001`);
    console.log(`gRPC Server running on 0.0.0.0:5051`);

    const shutdown = async () => {
      logger.log('Shutting down gracefully...');
      await redisIoAdapter.disconnectRedis?.();
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Error during app bootstrap:', error);
    process.exit(1); // Exit with failure code
  }
}
bootstrap();
