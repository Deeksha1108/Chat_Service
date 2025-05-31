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
import { Inject, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { RedisClientType } from 'redis';
import { GroupMessageDocument } from './schema/group-message.schema';
import { PromoteToAdminDto } from './dto/promote-admin.dto';

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
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;

      if (!userId) {
        this.logger.warn('Connection rejected: Missing userId');
        return client.disconnect(true);
      }

      await this.redisClient.set(`socket:${userId}`, client.id);
      this.logger.log(`User connected: ${userId} with socketId: ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const keys = await this.redisClient.keys('socket:*');
      for (const key of keys) {
        const socketId = await this.redisClient.get(key);
        if (socketId === client.id) {
          await this.redisClient.del(key);
          const userId = key.split(':')[1];
          this.logger.log(`User disconnected: ${userId}`);
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @MessageBody() data: { userId: string; groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, groupId } = data;

    if (!userId || !groupId) {
      client.emit('error', 'userId and groupId are required');
      return;
    }

    try {
      await this.redisClient.set(`socket:${userId}`, client.id);

      const isMember = await this.groupService.isUserInGroup(userId, groupId);
      if (!isMember) {
        client.emit('error', 'You are not a member of this group');
        return;
      }

      client.join(groupId);
      client.emit('joinedGroup', `Joined group ${groupId}`);
      this.logger.log(`User ${userId} joined group ${groupId}`);
    } catch (error) {
      this.logger.error(`joinGroup error: ${error.message}`);
      client.emit('error', 'Failed to join group');
    }
  }

  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(
    @MessageBody() data: { userId: string; groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, groupId } = data;

    if (!userId || !groupId) {
      client.emit('error', 'userId and groupId are required');
      return;
    }

    try {
      client.leave(groupId);
      client.emit('leftGroup', `Left group ${groupId}`);
      this.logger.log(`User ${userId} left group ${groupId}`);
    } catch (error) {
      this.logger.error(`leaveGroup error: ${error.message}`);
      client.emit('error', 'Failed to leave group');
    }
  }

  @SubscribeMessage('promoteToAdmin')
  async handlePromoteToAdmin(
    @MessageBody()
    dto: PromoteToAdminDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, userId, promotedBy } = dto;

    if (!groupId || !userId || !promotedBy) {
      client.emit(
        'errorMessage',
        'groupId, userId, and promotedBy are required',
      );
      return;
    }

    try {
      // Ensure promoter is still an admin
      await this.groupService.promoteToAdmin(dto);

      // Notify everyone in the group
      this.server.to(groupId).emit('adminPromoted', {
        groupId,
        userId,
        promotedBy,
        message: `User ${userId} promoted to admin by ${promotedBy}`,
      });

      this.logger.log(`User ${userId} promoted to admin in group ${groupId}`);
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
    const { senderId, groupId, content, taggedUserIds } = sendMessageDto;

    if (!senderId || !groupId || !content) {
      return client.emit(
        'errorMessage',
        'senderId, groupId, and content are required',
      );
    }

    try {
      const isMember = await this.groupService.isUserInGroup(senderId, groupId);
      if (!isMember) {
        return client.emit(
          'errorMessage',
          'You are not a member of this group',
        );
      }

      const message = await this.groupService.createMessage(sendMessageDto);

      this.server.to(groupId).emit('newMessage', message);
      this.logger.log(`User ${senderId} sent message to group ${groupId}`);

      if (Array.isArray(taggedUserIds) && taggedUserIds.length > 0) {
        await this.notifyTaggedUsers(taggedUserIds, message);
      }
      client.emit('messageSent', message);
    } catch (error) {
      this.logger.error(`sendMessage error: ${error.message}`);
      client.emit('errorMessage', 'Failed to send message');
    }
  }

  async getSocketIdByUserId(userId: string): Promise<string | null> {
    try {
      return await this.redisClient.get(`socket:${userId}`);
    } catch (error) {
      this.logger.error(`getSocketIdByUserId error: ${error.message}`);
      return null;
    }
  }
}
