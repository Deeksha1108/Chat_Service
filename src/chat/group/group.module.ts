import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from '../common/schemas/conversation.schema';
import { GroupChatController } from './group.controller';
import { GroupChatGateway } from './group.gateway';
import { GroupChatService } from './group.service';
import { RedisModule } from '../redis/redis.module';
import { Message, MessageSchema } from '../common/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema }, {name: Message.name, schema: MessageSchema },
    ]),
    RedisModule
  ],
  controllers: [GroupChatController],
  providers: [GroupChatService, GroupChatGateway]
})
export class GroupChatModule {}