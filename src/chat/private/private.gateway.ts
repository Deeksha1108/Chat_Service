import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './private.service';
import { Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { CreateMessageDto } from './dto/create-message.dto';
import { REDIS_CLIENT } from 'src/chat/redis/redis.constants';

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    @Inject(REDIS_CLIENT) private redisClient: RedisClientType,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server initialized');
    this.logger.debug(`this.server.sockets: ${!!this.server.sockets}`);
  }

  async handleConnection(@ConnectedSocket() socket: Socket) {
    const userId = socket.handshake.query.userId as string;
    if (!userId) {
      this.logger.warn(
        `Socket ${socket.id} tried to connect without userId, disconnecting.`,
      );
      return socket.disconnect();
    }

    await this.redisClient.sAdd(`user:${userId}:sockets`, socket.id);
    this.logger.log(`User ${userId} connected with socket ${socket.id}`);

    const conversations = await this.chatService.getConversations(userId);
    conversations.forEach((conv) => {
      socket.join(conv._id.toString());
      this.logger.log(
        `Socket ${socket.id} joined conversation room ${conv._id.toString()}`,
      );
    });

    const offlineMessagesKey = `user:${userId}:offlineMessages`;
    const messages = await this.redisClient.lRange(offlineMessagesKey, 0, -1);
    if (messages.length > 0) {
      messages.forEach((msg) => {
        socket.emit('receiveMessage', JSON.parse(msg));
      });
      await this.redisClient.del(offlineMessagesKey);
      this.logger.log(
        `Delivered ${messages.length} offline messages to ${userId}`,
      );
    }
  }

  async handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = socket.handshake.query.userId as string;
    if (!userId) return;
    await this.redisClient.sRem(`user:${userId}:sockets`, socket.id);
    this.logger.log(`User ${userId} disconnected from socket ${socket.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() { receiverId, content }: CreateMessageDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const senderId = socket.handshake.query.userId as string;
    this.logger.log(`User ${senderId} is sending message to ${receiverId}`);

    const conversation = await this.chatService.findOrCreateConversation(
      senderId,
      receiverId,
    );

    const participants = [senderId, receiverId];
    for (const participantId of participants) {
      const socketIds = await this.redisClient.sMembers(
        `user:${participantId}:sockets`,
      );
      for (const socketId of socketIds) {
        let participantSocket: Socket | undefined;
        try {
          participantSocket = this.server.of('/').sockets.get(socketId);
        } catch (error) {
          this.logger.error(`Failed to get socket ${socketId}`, error);
        }
        if (
          participantSocket &&
          !participantSocket.rooms.has(conversation._id.toString())
        ) {
          participantSocket.join(conversation._id.toString());
          this.logger.log(
            `Socket ${socketId} joined room ${conversation._id.toString()}`,
          );
        }
      }
    }

    const message = await this.chatService.createMessage(
      senderId,
      conversation._id.toString(),
      content,
    );

    socket.emit('messageSent', { status: 'success', message });

    const receiverSockets = await this.redisClient.sMembers(
      `user:${receiverId}:sockets`,
    );

    if (receiverSockets.length === 0) {
      await this.redisClient.rPush(
        `user:${receiverId}:offlineMessages`,
        JSON.stringify(message),
      );
      this.logger.log(`Receiver ${receiverId} offline, message queued.`);
    } else {
      for (const receiverSocketId of receiverSockets) {
        const receiverSocket =
          this.server.sockets.sockets.get(receiverSocketId);
        if (receiverSocket) {
          receiverSocket.emit('receiveMessage', message);
          this.logger.log(
            `Sent message to receiver socket ${receiverSocketId}`,
          );
        }
      }
    }
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    await this.chatService.markAsDelivered(messageId);
    this.logger.log(`Message ${messageId} marked as delivered`);
    socket.emit('messageDeliveryAck', { messageId, status: 'delivered' });
  }

  @SubscribeMessage('readMessage')
  async handleMessageRead(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    await this.chatService.markAsRead(messageId);
    this.logger.log(`Message ${messageId} marked as read`);
    socket.emit('messageReadAck', { messageId, status: 'read' });
  }
}
