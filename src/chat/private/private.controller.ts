import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { ChatService } from './private.service';
import { isValidObjectId } from 'mongoose';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations/:userId')
  getConversations(@Param('userId') userId: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:conversationId')
  getMessages(@Param('conversationId') conversationId: string) {
    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }
    return this.chatService.getMessages(conversationId);
  }
}
