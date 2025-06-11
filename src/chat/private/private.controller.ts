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
  Req,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './private.service';
import { RedisService } from '../redis/redis.service';
import { ObjectIdPipe } from '../pipes/objectid.pipe';
import { BulkMarkDeliveredDto } from './dto/bulk-mark-delivered.dto';
import { FindOrCreateConversationDto } from './dto/find-or-create-conversation.dto';
import { AuthRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { MessageDto } from './dto/message.dto';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  @Post('conversation')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createOrGetRoom(
    @Body() dto: FindOrCreateConversationDto,
    @Req() req: AuthRequest,
  ) {
    // const { user1, user2 } = dto;   // for testing

    const userId = req.user?.id;
    const { user2 } = dto;

    if (!userId) {
      throw new BadRequestException('Invalid user context');
    }
    if (userId === user2) {
      throw new BadRequestException(
        'Cannot create a conversation with yourself',
      );
    }
    return this.chatService.findOrCreateConversation(userId, user2);
  }

  @Post('messages')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async sendMessage(@Body() dto: MessageDto, @Req() req: AuthRequest) {
    const senderId = req.user?.id;

    if (!senderId) {
      throw new BadRequestException('Unauthorized user');
    }
    const { receiverId, roomId, content } = dto;

    return this.chatService.sendMessage({
      senderId,
      receiverId,
      roomId,
      content,
    });
  }

  @Patch('messages/delivered')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async bulkMarkDelivered(
    @Body() dto: BulkMarkDeliveredDto,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.chatService.bulkMarkAsDelivered(dto.messageIds);
  }

  @Patch('message/:id/delivered')
  async markAsDelivered(@Param('id', ObjectIdPipe) id: string) {
    return this.chatService.markAsDelivered(id);
  }

  @Patch('message/read/:messageId')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async markMessageRead(
    @Body() dto: MarkAsReadDto,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');

    return this.chatService.markAllAsRead(dto.messageId, userId);
  }

  @Patch('message/read/room/:roomId')
  markRoomMessagesAsRead(
    @Param('roomId', ObjectIdPipe) roomId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    return this.chatService.markAllAsRead(roomId, userId);
  }

  @Get('conversations')
  async getConversations(@Req() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:roomId')
  async getMessages(
    @Param('roomId', ObjectIdPipe) roomId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');

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