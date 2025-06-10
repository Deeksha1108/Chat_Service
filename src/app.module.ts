import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/private/private.module';
import { RedisModule } from './chat/redis/redis.module';
import { GroupModule } from './chat/group/group.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './chat/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot('mongodb://localhost/chatting'),
    ChatModule,
    RedisModule,
    GroupModule,
    AuthModule,
    GroupModule,
  ],
})
export class AppModule {}
