import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
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
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { MessageDto } from './dto/message.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuthRequest } from 'src/types/express';
import { EditMessageDto } from './dto/edit-message.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(Controller.name);
  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  @ApiOperation({ summary: 'Create or fetch a 1-1 conversation with a user' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or fetched successfully',
  })
  @ApiBody({ type: FindOrCreateConversationDto })
  @Post('conversation')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createOrGetRoom(
    @Body() dto: FindOrCreateConversationDto,
    @Req() req: AuthRequest,
  ) {
    this.logger.log('Authenticated User:', req.user);
    const userId = req.user?.id;
    const { user2 } = dto;

    if (!userId) {
      this.logger.log('req.user is missing or invalid');
      throw new BadRequestException('Invalid user context');
    }
    if (userId === user2) {
      throw new BadRequestException(
        'Cannot create a conversation with yourself',
      );
    }
    return this.chatService.findOrCreateConversation(userId, user2);
  }

  @ApiOperation({ summary: 'Send a new message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiBody({ type: MessageDto })
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

  @ApiOperation({ summary: 'Mark multiple messages as delivered' })
  @ApiResponse({ status: 200, description: 'Messages marked as delivered' })
  @ApiBody({ type: BulkMarkDeliveredDto })
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

  @ApiOperation({ summary: 'Mark a single message as delivered by ID' })
  @ApiResponse({ status: 200, description: 'Message marked as delivered' })
  @ApiParam({ name: 'id', type: String })
  @Patch('message/:id/delivered')
  async markAsDelivered(@Param('id', ObjectIdPipe) id: string) {
    return this.chatService.markAsDelivered(id);
  }

  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiBody({ type: MarkAsReadDto })
  @ApiParam({ name: 'messageId', type: String })
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

  @ApiOperation({ summary: 'Mark all messages in a room as read' })
  @ApiResponse({
    status: 200,
    description: 'All messages in room marked as read',
  })
  @ApiParam({ name: 'roomId', type: String })
  @Patch('message/read/room/:roomId')
  markRoomMessagesAsRead(
    @Param('roomId', ObjectIdPipe) roomId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    return this.chatService.markAllAsRead(roomId, userId);
  }

  @ApiOperation({ summary: 'Get all conversations of the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  @Get('conversations')
  async getConversations(@Req() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    return this.chatService.getConversations(userId);
  }

  @ApiOperation({ summary: 'Get all messages from a conversation room' })
  @ApiResponse({ status: 200, description: 'Messages fetched successfully' })
  @ApiParam({ name: 'roomId', type: String })
  @Get('messages/:roomId')
  async getMessages(
    @Param('roomId', ObjectIdPipe) roomId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');

    return this.chatService.getMessages(roomId, userId);
  }

  @ApiOperation({ summary: 'Get total unread message count for a user' })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  @ApiParam({ name: 'userId', type: String })
  @Get('message/unread/:userId')
  getUnreadCount(@Param('userId', ObjectIdPipe) userId: string) {
    return this.chatService.getUnreadCount(userId);
  }

  @ApiOperation({ summary: 'Get offline messages for a user (from Redis)' })
  @ApiResponse({ status: 200, description: 'Offline messages returned' })
  @ApiParam({ name: 'userId', type: String })
  @Get('offline/:userId')
  getOfflineMessages(@Param('userId', ObjectIdPipe) userId: string) {
    return this.redisService.getOfflineMessages(userId);
  }

  @ApiOperation({ summary: 'Edit a message sent by the logged-in user' })
  @ApiResponse({ status: 200, description: 'Message edited successfully' })
  @ApiParam({ name: 'messageId', type: String })
  @ApiBody({ type: EditMessageDto })
  @Put('message/:messageId')
  async editMessage(
    @Param('messageId', ObjectIdPipe) messageId: string,
    @Body() dto: EditMessageDto,
    @Req() req: AuthRequest,
  ) {
    const senderId = req.user?.id;
    const { newContent } = dto;
    if (!senderId || !newContent) {
      throw new BadRequestException('senderId and newContent are required');
    }
    return this.chatService.editMessage(messageId, senderId, newContent);
  }

  @ApiOperation({ summary: 'Delete a message sent by the logged-in user' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiParam({ name: 'messageId', type: String })
  @Delete('message/:messageId')
  async deleteMessage(
    @Param('messageId', ObjectIdPipe) messageId: string,
    @Req() req: AuthRequest,
  ) {
    const senderId = req.user?.id;
    if (!senderId) {
      throw new BadRequestException('senderId is required');
    }
    return this.chatService.deleteMessage(messageId, senderId);
  }
}
