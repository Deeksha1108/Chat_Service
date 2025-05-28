import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { GroupService } from './group.service';
import { SendGroupMessageDto } from './dto/send-group-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*', 
  },
})
export class GroupGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly groupService: GroupService) {}

  private connectedUsers: Map<string, string> = new Map(); // socket.id -> userId

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('joinGroup')
  handleJoinGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.groupId);
    this.connectedUsers.set(client.id, data.userId);
    client.to(data.groupId).emit('userJoined', {
      userId: data.userId,
      groupId: data.groupId,
    });
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.groupId);
    this.connectedUsers.delete(client.id);
    client.to(data.groupId).emit('userLeft', {
      userId: data.userId,
      groupId: data.groupId,
    });
  }

  @SubscribeMessage('groupTyping')
  handleTyping(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.groupId).emit('typing', {
      userId: data.userId,
      groupId: data.groupId,
    });
  }

  @SubscribeMessage('sendGroupMessage')
  async handleSendMessage(
    @MessageBody() dto: SendGroupMessageDto & { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const savedMessage = await this.groupService.sendGroupMessage(
      dto.groupId,
      dto,
    );

    // Emit to all users in the group
    client.to(dto.groupId).emit('newGroupMessage', savedMessage);
    client.emit('newGroupMessage', savedMessage); // Send back to sender too
  }
}
