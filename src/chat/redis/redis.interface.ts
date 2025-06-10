import { RedisClientOptions } from 'redis';

export interface RedisTcpOptions {
  host?: string;
  port?: number;
  tls?: false;
}

export interface RedisTlsOptions {
  host: string;
  port: number;
  tls: true;
  rejectUnauthorized?: boolean;
}

export interface CustomRedisOptions extends RedisClientOptions {
  url?: string;
  socket?: RedisTcpOptions | RedisTlsOptions;
  prefix?: string;
}