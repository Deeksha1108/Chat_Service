import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private readonly logger = new Logger('RedisIoAdapter');

  async connectToRedis(): Promise<void> {
    const redisUrl = 'redis://localhost:6379';

    if (
      (this.pubClient && this.pubClient.isOpen) ||
      (this.subClient && this.subClient.isOpen)
    ) {
      this.logger.warn(
        '[Redis] Already connected or connecting. Skipping reconnection.',
      );
      return;
    }
    try {
      this.pubClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            this.logger.warn(`Redis reconnect attempt #${retries}`);
            return retries < 10 ? 1000 : false;
          },
        },
      });

      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (err) =>
        this.logger.error('[Redis PubClient Error]', err),
      );
      this.subClient.on('error', (err) =>
        this.logger.error('[Redis SubClient Error]', err),
      );

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.logger.log('[Redis] Connected to Redis successfully.');
    } catch (error) {
      this.logger.error('[Redis] Failed to connect to Redis:', error);
      throw error;
    }
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(createAdapter(this.pubClient, this.subClient));
    return server;
  }

  async disconnectRedis(): Promise<void> {
    try {
      if (this.pubClient?.isOpen) await this.pubClient.disconnect();
      if (this.subClient?.isOpen) await this.subClient.disconnect();
      this.logger.log('[Redis] Disconnected cleanly.');
    } catch (error) {
      this.logger.error('[Redis] Disconnect error:', error);
    }
  }
}
