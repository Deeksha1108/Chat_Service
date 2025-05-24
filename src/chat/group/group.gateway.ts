import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../common/constants/socket-events';
import { GroupChatService } from './group.service';
import { RedisService } from '../redis/redis.service';
import { SendGroupMessageDto } from './dto/send-group-message.dto';

@WebSocketGateway({
  namespace: '/group',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class GroupChatGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;
  constructor(
    private readonly groupService: GroupChatService,
    private readonly redisService: RedisService,
  ) {}

  afterInit() {
    this.redisService.subscribe(
      SocketEvents.PUBSUB.GROUP_MESSAGES,
      (message: string) => {
        try {
          const parsedMessage: GroupMessage = JSON.parse(message);
          this.handleCrossServerMessage(parsedMessage);
        } catch (error) {
          console.error('Error parsing group message:', error);
        }
      },
    );
  }

  private handleCrossServerMessage(message: GroupMessage) {
    this.server.to(message.groupId).emit(SocketEvents.GROUP.MESSAGE, message);
  }

  @SubscribeMessage(SocketEvents.GROUP.JOIN)
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() { groupId, userId }: { groupId: string; userId: string },
  ) {
    try {
      await this.groupService.validateGroupMember(groupId, userId);
      client.join(groupId);
      client.emit(SocketEvents.GROUP.JOIN, { success: true });

      this.redisService.publish(SocketEvents.PUBSUB.GROUP_MESSAGES, {
        type: 'member-joined',
        groupId,
        userId,
      });
    } catch (error) {
      client.emit(SocketEvents.ERROR, {
        event: SocketEvents.GROUP.JOIN,
        error: error.message,
      });
    }
  }

  @SubscribeMessage(SocketEvents.GROUP.MESSAGE)
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendGroupMessageDto,
  ) {
    try {
      const message = await this.groupService.saveGroupMessage(payload);

      client.to(payload.groupId).emit(SocketEvents.GROUP.MESSAGE, message);

      this.redisService.publish(SocketEvents.PUBSUB.GROUP_MESSAGES, message);

      return { status: 'delivered', timestamp: new Date() };
    } catch (error) {
      client.emit(SocketEvents.ERROR, {
        event: SocketEvents.GROUP.MESSAGE,
        error: error.message,
      });
      return { status: 'failed', error: error.message };
    }
  }

  @SubscribeMessage(SocketEvents.GROUP.LEAVE)
  async handleLeaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() { groupId, userId }: { groupId: string; userId: string },
  ) {
    try {
      await this.groupService.removeParticipant(groupId, userId);
      client.leave(groupId);

      this.redisService.publish(SocketEvents.PUBSUB.GROUP_MESSAGES, {
        type: 'member-left',
        groupId,
        userId,
      });

      client.emit(SocketEvents.GROUP.LEAVE, { success: true });
    } catch (error) {
      client.emit(SocketEvents.ERROR, {
        event: SocketEvents.GROUP.LEAVE,
        error: error.message,
      });
    }
  }
}
