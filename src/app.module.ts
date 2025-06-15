import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/private/private.module';
import { RedisModule } from './chat/redis/redis.module';
import { GroupModule } from './chat/group/group.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost/chatting'),
    MongooseModule.forRoot('mongodb://localhost/chatting'),
    ChatModule,
    AuthModule,
    RedisModule,
    GroupModule,
  ],
})
export class AppModule {}
