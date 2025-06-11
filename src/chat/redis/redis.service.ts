import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { Types } from 'mongoose';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private pubClient: Redis;
  private subClient: Redis;
  private readonly logger = new Logger(RedisService.name);
  private subscribedChannels = new Set<string>();

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {
    this.pubClient = client.duplicate();
    this.subClient = client.duplicate();
  }

  async onModuleInit() {
    try {
      await this.subClient.subscribe('group-messages', 'group-events');
      this.logger.log(
        '[Redis] Subscribed to channels: group-messages, group-events',
      );
    } catch (error) {
      this.logger.error('[Redis] Subscription failed:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await Promise.all([
        this.client.quit(),
        this.pubClient.quit(),
        this.subClient.quit(),
      ]);
      this.logger.log('[Redis] Disconnected cleanly');
    } catch (error) {
      this.logger.error('[Redis] Error on shutdown:', error);
    }
  }

  async setUserSocket(userId: string, socketId: string): Promise<void> {
    try {
      await this.client.sadd(`user:${userId}:sockets`, socketId);
    } catch (error) {
      this.logger.error(
        `[Redis] Failed to store socket for user ${userId}:`,
        error,
      );
    }
  }

  async getUserSockets(userId: string): Promise<string[]> {
    try {
      return await this.client.smembers(`user:${userId}:sockets`);
    } catch (error) {
      this.logger.error(
        `[Redis] Failed to get sockets for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  async removeUserSocket(userId: string, socketId: string): Promise<void> {
    const key = `user:${userId}:sockets`;

    const luaScript = `
    redis.call("SREM", KEYS[1], ARGV[1])
    if redis.call("SCARD", KEYS[1]) == 0 then
      redis.call("DEL", KEYS[1])
    end
    return 1
  `;

    try {
      await this.client.eval(luaScript, 1, key, socketId);
    } catch (error) {
      this.logger.error(
        `Failed to remove socket "${socketId}" for user "${userId}"`,
        error.stack,
      );
    }
  }

  async addOfflineMessage(userId: string, message: string): Promise<number> {
    const key = `user:${userId}:offlineMessages`;
    try {
      const result = await this.client.rpush(key, message);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to add offline message for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getOfflineMessages(userId: string): Promise<string[]> {
    const key = `user:${userId}:offlineMessages`;
    try {
      const messages = await this.client.lrange(key, 0, -1);
      await this.client.del(key);
      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to get offline messages for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async clearOfflineMessages(userId: string): Promise<number> {
    const key = `user:${userId}:offlineMessages`;
    try {
      const deletedCount = await this.client.del(key);
      this.logger.log(
        `Cleared ${deletedCount} offline message(s) for user ${userId}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to clear offline messages for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    try {
      const isOnline = await this.client.sismember('online_users', userId);
      return isOnline === 1;
    } catch (error) {
      this.logger.error(
        `Redis error while checking online status of user ${userId}`,
        error.stack,
      );
      throw new Error('Internal Server Error');
    }
  }

  async markUserOnline(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    try {
      await this.client.sadd('online_users', userId);
      this.logger.debug(`User ${userId} marked as online.`);
    } catch (error) {
      this.logger.error(`Failed to mark user ${userId} online`, error.stack);
      throw new InternalServerErrorException('Could not mark user online');
    }
  }

  async markUserOffline(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    try {
      await this.client.srem('online_users', userId);
      this.logger.debug(`User ${userId} marked as offline.`);
    } catch (error) {
      this.logger.error(`Failed to mark user ${userId} offline`, error.stack);
      throw new InternalServerErrorException('Could not mark user offline');
    }
  }

  async publish(channel: string, message: any): Promise<number> {
    try {
      const payload = JSON.stringify(message);
      const result = await this.pubClient.publish(channel, payload);
      this.logger.debug(`Published message to channel "${channel}"`, {
        message,
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to publish message on channel "${channel}"`,
        error.stack,
      );
      throw error;
    }
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    try {
      if (!this.subscribedChannels.has(channel)) {
        await this.subClient.subscribe(channel);
        this.subscribedChannels.add(channel);
        this.logger.log(`Subscribed to Redis channel: ${channel}`);
      }

      this.subClient.on('message', (ch, msg) => {
        if (ch === channel) {
          try {
            callback(msg);
          } catch (cbError) {
            this.logger.error(
              `Error in callback for channel "${channel}":`,
              cbError.stack,
            );
          }
        }
      });
    } catch (err) {
      this.logger.error(
        `Failed to subscribe to channel "${channel}"`,
        err.stack,
      );
      throw err;
    }
  }
}
