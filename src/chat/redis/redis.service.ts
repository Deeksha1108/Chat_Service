import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private pubClient: Redis;
  private subClient: Redis;

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {
    this.pubClient = client.duplicate();
    this.subClient = client.duplicate();
  }

  async onModuleInit() {
    await this.subClient.subscribe('group-messages', 'group-events');
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.pubClient.quit();
    await this.subClient.quit();
  }

  async setUserSocket(userId: string, socketId: string): Promise<void> {
    await this.client.set(`user:${userId}`, socketId);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    return this.client.get(`user:${userId}`);
  }

  async removeUserSocket(userId: string): Promise<void> {
    await this.client.del(`user:${userId}`);
  }

  async publish(channel: string, message: any): Promise<number> {
    return this.pubClient.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    this.subClient.on('message', (ch, msg) => {
      if (ch === channel) callback(msg);
    });
  }

  async onMessage(channel: string, callback: (message: any) => void) {
    this.subClient.on('message', (ch, msg) => {
      if (ch === channel) callback(JSON.parse(msg));
    });
  }
}
