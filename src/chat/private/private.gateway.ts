import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './private.service';
import { Logger } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  private connectedUsers: Map<string, string> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  async handleConnection(@ConnectedSocket() socket: Socket) {
    const userId = this.getUserIdFromSocket(socket);

    if (!userId) {
      this.logger.warn(
        `Socket ${socket.id} tried to connect without userId, disconnecting.`,
      );
      return socket.disconnect();
    }
    await this.redisService.setUserSocket(userId, socket.id);
    if (!socket.rooms.has(userId)) {
      socket.join(userId);
      this.logger.log(`Socket ${socket.id} joined room ${userId}`);
    } else {
      this.logger.log(`Socket ${socket.id} already in room ${userId}`);
    }

    const offlineMessages = await this.redisService.getOfflineMessages(userId);
    if (offlineMessages.length > 0) {
      for (const msg of offlineMessages) {
        socket.emit('receiveMessage', JSON.parse(msg));
      }
      await this.redisService.clearOfflineMessages(userId);
      this.logger.log(
        `Delivered ${offlineMessages.length} offline messages to ${userId}`,
      );
    }
  }

  async handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = socket.handshake.query.userId?.toString();
    if (!userId) {
      this.logger.warn(`Socket ${socket.id} disconnected without valid userId`);
      return;
    }
    await this.redisService.removeUserSocket(userId, socket.id);
    this.logger.log(`User ${userId} disconnected from socket ${socket.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() { receiverId, content }: CreateMessageDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const senderId = this.getUserIdFromSocket(socket);
    if (!senderId) {
      this.logger.warn(`Invalid sender ID from socket ${socket.id}`);
      return;
    }

    try {
      const conversation = await this.chatService.findOrCreateConversation(
        senderId,
        receiverId,
      );

      let message = await this.chatService.createMessage(
        senderId,
        receiverId,
        conversation._id.toString(),
        content,
      );

      socket.emit('messageSent', { status: 'success', message });

      const receiverSockets =
        await this.redisService.getUserSockets(receiverId);

      if (receiverSockets.length === 0) {
        await this.redisService.addOfflineMessage(
          receiverId,
          JSON.stringify(message),
        );
        this.logger.log(`Receiver ${receiverId} offline. Message queued.`);
      } else {
        const updatedMessage = await this.chatService.markAsDelivered(
          (message as any)._id.toString(),
        );

        if (!updatedMessage) {
          this.logger.warn(`Message not found while marking as delivered.`);
          return;
        }

        message = updatedMessage;

        this.server.to(receiverId).emit('receiveMessage', message);
        this.logger.log(`Message sent to receiver ${receiverId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling message from ${senderId} to ${receiverId}: ${error.message}`,
      );
      socket.emit('messageSent', {
        status: 'error',
        error: 'Message delivery failed',
      });
    }
  }

  // Utility method placed outside the handler
  private getUserIdFromSocket(socket: Socket): string | null {
    const userId = socket.handshake.query.userId?.toString();
    // return userId && Types.ObjectId.isValid(userId) ? userId : null;
    return userId || null;
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = socket.handshake.query.userId?.toString();

    if (!userId || !messageId) {
      this.logger.warn(
        `Missing userId or messageId in delivery event. Socket: ${socket.id}`,
      );
      return;
    }

    try {
      const updatedMessage = await this.chatService.markAsDelivered(messageId);

      if (!updatedMessage) {
        this.logger.warn(
          `Message ${messageId} not found while marking as delivered`,
        );
        return;
      }

      this.server
        .to(updatedMessage.sender.toString())
        .emit('messageDeliveredAck', {
          messageId,
        });

      socket.emit('messageDeliveryAck', { messageId, status: 'delivered' });

      this.logger.log(
        `Message ${messageId} marked as delivered by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error marking message ${messageId} as delivered: ${error.message}`,
      );
      socket.emit('messageDeliveryAck', { messageId, status: 'error' });
    }
  }

  @SubscribeMessage('readMessage')
  async handleMessageRead(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = this.getUserIdFromSocket(socket);
    if (!userId) return;
    try {
      const message = await this.chatService.markAsRead(messageId);

      if (!message) {
        this.logger.warn(
          `Message ${messageId} not found while marking as read.`,
        );
        return;
      }

      this.server
        .to(message.sender.toString())
        .emit('messageReadAck', { messageId });
      this.logger.log(`Message ${messageId} marked as read`);
    } catch (error) {
      this.logger.error(`Error marking message read: ${error.message}`);
    }
  }
}
