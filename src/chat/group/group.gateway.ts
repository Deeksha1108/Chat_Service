import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GroupService } from './group.service';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { RedisClientType } from 'redis';
import { GroupMessageDocument } from './schema/group-message.schema';
import { PromoteToAdminDto } from './dto/promote-admin.dto';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GroupGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GroupGateway.name);

  constructor(
    private readonly groupService: GroupService,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new UnauthorizedException('Missing token');

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      if (!userId) throw new UnauthorizedException('Invalid token');

      client.data.userId = userId;

      await this.redisClient.set(`socket:${userId}`, client.id);
      this.logger.log(`User connected: ${userId} with socketId: ${client.id}`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.data?.userId;
      if (userId) {
        await this.redisClient.del(`socket:${userId}`);
        this.logger.log(`User disconnected: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { groupId } = data;

    if (!groupId || !userId) {
      return client.emit('errorMessage', 'groupId is required');
    }

    try {
      const isMember = await this.groupService.isUserInGroup(userId, groupId);
      if (!isMember) {
        return client.emit(
          'errorMessage',
          'You are not a member of this group',
        );
      }

      client.join(groupId);
      client.emit('joinedGroup', `Joined group ${groupId}`);
      this.logger.log(`User ${userId} joined group ${groupId}`);
    } catch (error) {
      this.logger.error(`joinGroup error: ${error.message}`);
      client.emit('errorMessage', 'Failed to join group');
    }
  }

  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { groupId } = data;

    if (!groupId || !userId) {
      return client.emit('errorMessage', 'groupId is required');
    }

    try {
      client.leave(groupId);
      client.emit('leftGroup', `Left group ${groupId}`);
      this.logger.log(`User ${userId} left group ${groupId}`);
    } catch (error) {
      this.logger.error(`leaveGroup error: ${error.message}`);
      client.emit('errorMessage', 'Failed to leave group');
    }
  }

  @SubscribeMessage('promoteToAdmin')
  async handlePromoteToAdmin(
    @MessageBody() dto: PromoteToAdminDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, promotedBy, memberIdToPromote } = dto;

    if (!groupId || !promotedBy || !memberIdToPromote) {
      client.emit(
        'errorMessage',
        'groupId, promotedBy, and memberIdToPromote are required',
      );
      return;
    }

    try {
      await this.groupService.promoteToAdmin(dto);
      this.server.to(groupId).emit('adminPromoted', {
        groupId,
        memberIdToPromote,
        promotedBy,
        message: `User ${memberIdToPromote} promoted to admin by ${promotedBy}`,
      });

      this.logger.log(
        `User ${memberIdToPromote} promoted to admin in group ${groupId}`,
      );
    } catch (error) {
      this.logger.error(`promoteToAdmin error: ${error.message}`);
      client.emit('errorMessage', error.message || 'Promotion failed');
    }
  }

  private async notifyTaggedUsers(
    taggedUserIds: string[],
    message: GroupMessageDocument,
  ) {
    for (const id of taggedUserIds) {
      try {
        const socketId = await this.redisClient.get(`socket:${id}`);
        if (socketId) {
          this.server.to(socketId).emit('taggedInMessage', message);
          this.logger.log(`Tagged message sent to ${id}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to notify tagged user ${id}: ${err.message}`);
      }
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() sendMessageDto: SendGroupMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    const { groupId, content, taggedUserIds } = sendMessageDto;

    if (!groupId || !content) {
      return client.emit('errorMessage', 'groupId and content are required');
    }

    try {
      const isMember = await this.groupService.isUserInGroup(senderId, groupId);
      if (!isMember) {
        return client.emit(
          'errorMessage',
          'You are not a member of this group',
        );
      }

      const message = await this.groupService.createMessage(
        sendMessageDto,
        senderId,
      );

      this.server.to(groupId).emit('newMessage', message);
      this.logger.log(`User ${senderId} sent message to group ${groupId}`);

      if (Array.isArray(taggedUserIds) && taggedUserIds.length > 0) {
        await this.notifyTaggedUsers(taggedUserIds, message);
      }
    } catch (error) {
      this.logger.error(`sendMessage error: ${error.message}`);
      client.emit('errorMessage', 'Failed to send message');
    }
  }
}
