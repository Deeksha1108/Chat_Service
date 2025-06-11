import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './private.gateway';
import { ChatService } from './private.service';
import { ChatController } from './private.controller';
import { Message, MessageSchema } from './schema/message.schema';
import { Conversation, ConversationSchema } from './schema/conversation.schema';
import { RedisModule } from 'src/chat/redis/redis.module';
import { GrpcClientModule } from 'src/common/grpc/clients/grpc-clients.module';

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
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
