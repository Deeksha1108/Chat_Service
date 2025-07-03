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
    MongooseModule.forRoot(
      'mongodb+srv://akshatsrivastava1:5mFEh9m2Xq3OMZh2@cluster0.cskfle2.mongodb.net/social_media?retryWrites=true&w=majority&appName=Cluster0',
    ),
    // MongooseModule.forRoot('mongodb://localhost/chatting'),
    ChatModule,
    AuthModule,
    RedisModule,
    GroupModule,
  ],
})
export class AppModule {}
