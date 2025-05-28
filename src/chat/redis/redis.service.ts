import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
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
    await Promise.all([
      this.client.quit(),
      this.pubClient.quit(),
      this.subClient.quit(),
    ]);
  }

  async setUserSocket(userId: string, socketId: string): Promise<void> {
    await this.client.sadd(`user:${userId}:sockets`, socketId);
  }

  async getUserSockets(userId: string): Promise<string[]> {
    return this.client.smembers(`user:${userId}:sockets`);
  }

  async removeUserSocket(userId: string, socketId: string): Promise<void> {
    await this.client.srem(`user:${userId}:sockets`, socketId);
  }

  async addOfflineMessage(userId: string, message: string): Promise<number> {
    return this.client.rpush(`user:${userId}:offlineMessages`, message);
  }

  async getOfflineMessages(userId: string): Promise<string[]> {
    return this.client.lrange(`user:${userId}:offlineMessages`, 0, -1);
  }

  async clearOfflineMessages(userId: string): Promise<number> {
    return this.client.del(`user:${userId}:offlineMessages`);
  }

  async publish(channel: string, message: any): Promise<number> {
    return this.pubClient.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    await this.subClient.subscribe(channel);
    this.subClient.on('message', (ch, msg) => {
      if (ch === channel) callback(msg);
    });
  }
}
