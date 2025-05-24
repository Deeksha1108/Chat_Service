import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/private/private.module';
import { RedisModule } from './chat/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/chatting'),
    ChatModule,
    RedisModule,
  ],
})
export class AppModule {}
