import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './private.gateway';
import { ChatService } from './private.service';
import { ChatController } from './private.controller';
import { Message, MessageSchema } from './schema/message.schema';
import { Conversation, ConversationSchema } from './schema/conversation.schema';
import { RedisModule } from 'src/chat/redis/redis.module';
import { GrpcClientModule } from 'src/grpc/clients/grpc-clients.module';
import { JwtStrategy } from 'src/strategies/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    RedisModule,
    GrpcClientModule,
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, JwtStrategy],
})
export class ChatModule {}
