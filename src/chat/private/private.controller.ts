import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './private.service';
import { RedisService } from '../redis/redis.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ObjectIdPipe } from '../pipes/objectid.pipe';
import { BulkMarkDeliveredDto } from './dto/bulk-mark-delivered.dto';
import { FindOrCreateConversationDto } from './dto/find-or-create-conversation.dto';

@Controller('chat')
// @UseGuards(AuthGuard) // Optional, production recommendation
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  @Post('conversation')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createOrGetRoom(@Body() dto: FindOrCreateConversationDto) {
    const { user1, user2 } = dto;

    if (user1 === user2) {
      throw new BadRequestException(
        'Cannot create a conversation with yourself',
      );
    }
    return this.chatService.findOrCreateConversation(user1, user2);
  }

  @Post('messages')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async sendMessage(@Body() dto: SendMessageDto) {
    const { senderId, receiverId, roomId, content } = dto;

    if (senderId === receiverId) {
      throw new BadRequestException('Sender and receiver cannot be the same');
    }
    return this.chatService.createMessage(
      senderId,
      receiverId,
      roomId,
      content,
    );
  }

  @Patch('messages/delivered')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async bulkMarkDelivered(@Body() dto: BulkMarkDeliveredDto) {
    return this.chatService.bulkMarkAsDelivered(dto.messageIds);
  }

  @Patch('message/:id/delivered')
  markAsDelivered(@Param('id', ObjectIdPipe) id: string) {
    return this.chatService.markAsDelivered(id);
  }

  @Patch('message/read/:messageId')
  markMessageRead(@Param('messageId', ObjectIdPipe) messageId: string) {
    return this.chatService.markAsRead(messageId);
  }

  @Patch('message/read/room/:roomId/user/:userId')
  markRoomMessagesAsRead(
    @Param('roomId', ObjectIdPipe) roomId: string,
    @Param('userId', ObjectIdPipe) userId: string,
  ) {
    return this.chatService.markAllAsRead(roomId, userId);
  }

  @Get('conversations/:userId')
  getConversations(@Param('userId', ObjectIdPipe) userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:roomId')
  getMessages(
    @Param('roomId', ObjectIdPipe) roomId: string,
    @Query('userId') userId: string,
  ) {
    return this.chatService.getMessages(roomId, userId);
  }

  @Get('message/unread/:userId')
  getUnreadCount(@Param('userId', ObjectIdPipe) userId: string) {
    return this.chatService.getUnreadCount(userId);
  }

  @Get('offline/:userId')
  getOfflineMessages(@Param('userId', ObjectIdPipe) userId: string) {
    return this.redisService.getOfflineMessages(userId);
  }

  @Put('message/:messageId')
  async editMessage(
    @Param('messageId', ObjectIdPipe) messageId: string,
    @Body('senderId') senderId: string,
    @Body('newContent') newContent: string,
  ) {
    if (!senderId || !newContent) {
      throw new BadRequestException('senderId and newContent are required');
    }
    return this.chatService.editMessage(messageId, senderId, newContent);
  }

  @Delete('message/:messageId')
  async deleteMessage(
    @Param('messageId', ObjectIdPipe) messageId: string,
    @Query('senderId') senderId: string,
  ) {
    if (!senderId) {
      throw new BadRequestException('senderId is required');
    }
    return this.chatService.deleteMessage(messageId, senderId);
  }
}
