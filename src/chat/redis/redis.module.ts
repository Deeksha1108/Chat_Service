import { Module, Global } from '@nestjs/common';
import { REDIS_CLIENT, REDIS_OPTIONS } from './redis.constants';
import { CustomRedisOptions, RedisTcpOptions } from './redis.interface';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_OPTIONS,
      useValue: {
        url: 'redis://localhost:6379',
        socket: {
          host: 'localhost',
          port: 6379,
          tls: false,
          rejectUnauthorized: false
        } as RedisTcpOptions
      } as CustomRedisOptions
    },
    {
      provide: REDIS_CLIENT,
      useFactory: async (options: CustomRedisOptions) => {
        const client = new Redis(options.url || 'redis://localhost:6379');
        return client;
      },
      inject: [REDIS_OPTIONS]
    }
  ],
  exports: [REDIS_CLIENT]
})
export class RedisModule {}
