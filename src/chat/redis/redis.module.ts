import { Module, Global } from '@nestjs/common';
import { REDIS_CLIENT, REDIS_OPTIONS } from './redis.constants';
import Redis, { RedisOptions } from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_OPTIONS,
      useValue: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retryStrategy: (times) => Math.min(times * 100, 2000),
      } as RedisOptions,
    },
    {
      provide: REDIS_CLIENT,
      useFactory: async (options: RedisOptions) => {
        const client = new Redis(options);
        client.on('error', (err) => {
          console.error('[Redis Error]', err);
        });
        return client;
      },
      inject: [REDIS_OPTIONS],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
