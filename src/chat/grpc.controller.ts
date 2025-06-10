import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ValidateTokenResponse } from 'src/types/auth.types';
import { GrpcChatService } from './grpc.service';

@Controller('chat')
export class ChatControllerGrpc {
  constructor(private readonly chatService: GrpcChatService) {}

  async validate(accessToken: string) {
    try {
      return await this.chatService.validateToken(accessToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('private/send')
  async sendPrivateMessage(
    @Headers('Authorization') auth: string,
    @Body() body: any,
  ) {
    const token = auth?.replace('Bearer ', '');
    const user: ValidateTokenResponse = await this.validate(token);

    const payload = {
      senderId: user.userId,
      receiverId: body.receiverId,
      content: body.content,
      messageType: body.messageType || 'text',
      timestamp: Date.now(),
    };

    return this.chatService.sendPrivateMessage(payload);
  }

  @Get('private/history')
  async getPrivateChatHistory(
    @Headers('Authorization') auth: string,
    @Query() query: any,
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.validate(token);

    const payload = {
      userId: user.userId,
      contactId: query.contactId,
      limit: parseInt(query.limit) || 20,
      offset: parseInt(query.offset) || 0,
    };

    return this.chatService.getPrivateChatHistory(payload);
  }

  @Post('group/send')
  async sendGroupMessage(
    @Headers('Authorization') auth: string,
    @Body() body: any,
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.validate(token);

    const payload = {
      senderId: user.userId,
      groupId: body.groupId,
      content: body.content,
      messageType: body.messageType || 'text',
      timestamp: Date.now(),
    };

    return this.chatService.sendGroupMessage(payload);
  }

  @Get('group/history')
  async getGroupChatHistory(
    @Headers('Authorization') auth: string,
    @Query() query: any,
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.validate(token);

    const payload = {
      groupId: query.groupId,
      limit: parseInt(query.limit) || 20,
      offset: parseInt(query.offset) || 0,
    };

    return this.chatService.getGroupChatHistory(payload);
  }
}
