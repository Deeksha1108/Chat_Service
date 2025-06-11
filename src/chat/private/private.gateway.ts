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
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { isValidObjectId, Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { MessageDto } from './dto/message.dto';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { EditMessageDto } from './dto/edit-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { isDeletedMessagePayload } from './types/delete-message.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');

  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,

    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,

    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  private async validateTokenAndGetUserId(client: Socket): Promise<string> {
    const token = client.handshake.auth?.token;

    if (!token) {
      this.logger.warn(`Token missing from socket ${client.id}`);
      throw new ForbiddenException('Unauthorized: Token missing');
    }

    try {
      const response = await lastValueFrom(
        this.authClient.send({ cmd: 'validate_token' }, { token }),
      );

      const userId = response?.userId;

      if (!userId || !isValidObjectId(userId)) {
        this.logger.warn(
          `Invalid user ID after token validation (socket ${client.id})`,
        );
        throw new ForbiddenException('Unauthorized: Invalid user');
      }

      return userId;
    } catch (error) {
      this.logger.error(
        `Token validation failed (socket ${client.id}): ${error.message}`,
      );
      throw new ForbiddenException('Unauthorized: Token invalid or expired');
    }
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (error) {
      client.emit('auth_error', { message: error.message });
      client.disconnect();
      return;
    }

    try {
      await this.redisService.setUserSocket(userId, client.id);
      this.logger.log(
        `User ${userId} connected. Socket ${client.id} registered.`,
      );

      if (!client.rooms.has(userId)) {
        client.join(userId);
        this.logger.log(`Socket ${client.id} joined room ${userId}`);
      }

      const offlineMessages =
        await this.redisService.getOfflineMessages(userId);
      if (offlineMessages?.length) {
        for (const raw of offlineMessages) {
          try {
            const msg = JSON.parse(raw);
            client.emit('receive_message', msg);
          } catch (e) {
            this.logger.warn(
              `Invalid offline message JSON for ${userId}: ${e.message}`,
            );
          }
        }

        await this.redisService.clearOfflineMessages(userId);
        this.logger.log(
          `Delivered ${offlineMessages.length} offline messages to user ${userId}`,
        );
      }
    } catch (err) {
      this.logger.error(`handleConnection error for ${userId}: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (error) {
      this.logger.warn(
        `Disconnect failed token validation on socket ${client.id}: ${error.message}`,
      );
      return;
    }

    try {
      await this.redisService.removeUserSocket(userId, client.id);
      this.logger.log(
        `Socket ${client.id} disconnected. Cleaned Redis entry for ${userId}`,
      );
    } catch (err) {
      this.logger.error(
        `Redis cleanup error on disconnect (socket ${client.id}): ${err.message}`,
      );
    }

    this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('room_error', { message: err.message });
      return;
    }

    try {
      await this.chatService.validateRoomAccess(roomId, userId);

      if (!client.rooms.has(roomId)) {
        client.join(roomId);
        client.emit('join_room_success', roomId);
        this.logger.log(
          `User ${userId} joined room ${roomId} via socket ${client.id}`,
        );
      } else {
        client.emit('join_room_already', roomId);
      }
    } catch (error) {
      const status =
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
          ? error.message
          : 'Failed to join room';

      client.emit('room_error', { message: status });
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: MessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let senderId: string;

    try {
      senderId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('error', {
        type: 'auth',
        message: err.message,
      });
      return;
    }

    const { receiverId, roomId, content } = data;

    if (![receiverId, roomId, content].every(Boolean)) {
      client.emit('error', {
        type: 'validation',
        message: 'Missing required fields (receiverId, roomId, content)',
      });
      return;
    }

    if (![senderId, receiverId, roomId].every(isValidObjectId)) {
      client.emit('error', {
        type: 'validation',
        message: 'Invalid sender/receiver/room ID',
      });
      return;
    }

    const isMember = await this.chatService.isUserInRoom(senderId, roomId);
    if (!isMember) {
      client.emit('error', {
        type: 'authorization',
        message: 'Unauthorized room access',
      });
      return;
    }

    try {
      const savedMessage = await this.chatService.sendMessage({
        ...data,
        senderId,
      });

      client.emit('message_sent', savedMessage);

      const receiverSockets =
        await this.redisService.getUserSockets(receiverId);

      if (receiverSockets.length === 0) {
        await this.redisService.addOfflineMessage(
          receiverId,
          JSON.stringify(savedMessage),
        );
        this.logger.log(`Receiver ${receiverId} is offline. Message queued.`);
      } else {
        const updatedMessage = await this.chatService.markAsDelivered(
          savedMessage.id.toString(),
        );

        const finalMessage = updatedMessage ?? savedMessage;

        receiverSockets.forEach((socketId) => {
          this.server.to(socketId).emit('receive_message', finalMessage);
        });

        this.logger.log(`Message delivered to receiver ${receiverId}`);
      }
    } catch (err) {
      this.logger.error(
        `Error sending message from ${senderId} to ${receiverId}: ${err.message}`,
      );
      client.emit('error', {
        type: 'send_message',
        message: err.message || 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('message_received')
  async handleMessageReceivedAck(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('message_received_status', {
        messageId,
        status: 'error',
        message: err.message,
      });
      return;
    }

    if (!messageId || !isValidObjectId(messageId)) {
      this.logger.warn(
        `Invalid messageId in message_received ack by user ${userId}`,
      );
      client.emit('message_received_status', {
        messageId,
        status: 'error',
        message: 'Invalid messageId',
      });
      return;
    }

    try {
      const updated = await this.chatService.markAsRead(messageId);

      if (!updated) {
        this.logger.warn(`Message ${messageId} not found for user ${userId}`);
        client.emit('message_received_status', {
          messageId,
          status: 'error',
          message: 'Message not found',
        });
        return;
      }

      if (updated?.receiver?.toString() !== userId) {
        this.logger.warn(
          `Unauthorized: user ${userId} tried to ack message ${messageId}`,
        );
        client.emit('message_received_status', {
          messageId,
          status: 'error',
          message: 'Unauthorized',
        });
        return;
      }

      const senderId = updated.sender?.toString();
      if (senderId) {
        const senderSockets = await this.redisService.getUserSockets(senderId);
        senderSockets.forEach((socketId) => {
          this.server.to(socketId).emit('message_received_ack', {
            messageId,
            receivedBy: userId,
            timeStamp: new Date().toISOString(),
          });
        });
      }

      client.emit('message_received_status', {
        messageId,
        status: 'received',
      });

      this.logger.log(`Message ${messageId} received by ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error in message_received ack for ${messageId} by ${userId}: ${error.message}`,
      );
      client.emit('message_received_status', {
        messageId,
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  @SubscribeMessage('message_delivered')
  async handleDeliveryAck(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('message_delivered_ack', {
        messageId,
        status: 'error',
        message: err.message,
      });
      return;
    }

    if (!messageId || !isValidObjectId(messageId)) {
      this.logger.warn(
        `Invalid messageId in delivery ack by user ${userId} (socket=${client.id})`,
      );
      client.emit('message_delivered_ack', {
        messageId,
        status: 'error',
        message: 'Invalid messageId',
      });
      return;
    }

    try {
      const updated = await this.chatService.markAsDelivered(messageId);
      if (!updated) {
        this.logger.warn(
          `Message ${messageId} not found while marking as delivered`,
        );
        client.emit('message_delivered_ack', {
          messageId,
          status: 'error',
          message: 'Unable to update delivery status',
        });
        return;
      }

      if (updated.receiver?.toString() !== userId) {
        this.logger.warn(
          `Unauthorized delivery ack by ${userId} for message ${messageId}`,
        );
        client.emit('message_delivered_ack', {
          messageId,
          status: 'error',
          message: 'Unauthorized action',
        });
        return;
      }

      const senderId = updated.sender?.toString();
      const senderSockets = await this.redisService.getUserSockets(senderId);
      senderSockets.forEach((socketId) => {
        this.server.to(socketId).emit('message_delivered', {
          messageId,
          deliveredBy: userId,
          deliveredAt: new Date().toISOString(),
        });
      });

      client.emit('message_delivered_ack', {
        messageId,
        status: 'delivered',
      });

      this.logger.log(
        `User ${userId} marked message ${messageId} as delivered. Sender notified.`,
      );
    } catch (err) {
      this.logger.error(
        `Delivery ack error for ${messageId} by ${userId}: ${err.message}`,
      );
      client.emit('message_delivered_ack', {
        messageId,
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  @SubscribeMessage('message_read')
  async handleReadAck(
    @MessageBody() { messageId }: { messageId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('message_read_status', {
        messageId,
        status: 'error',
        message: err.message,
      });
      return;
    }

    if (!messageId || !isValidObjectId(messageId)) {
      this.logger.warn(
        `Invalid messageId in read ack by user ${userId} (socket=${client.id})`,
      );
      client.emit('message_read_status', {
        messageId,
        status: 'error',
        message: 'Invalid messageId',
      });
      return;
    }

    try {
      const updated = await this.chatService.markAsRead(messageId);

      if (!updated) {
        this.logger.warn(`Message ${messageId} not found.`);
        client.emit('message_read_status', {
          messageId,
          status: 'error',
          message: 'Message not found',
        });
        return;
      }

      if (!updated.receiver || updated.receiver.toString() !== userId) {
        this.logger.warn(
          `Unauthorized read ack: user ${userId} tried to mark ${messageId}`,
        );
        client.emit('message_read_status', {
          messageId,
          status: 'error',
          message: 'Unauthorized',
        });
        return;
      }

      const senderId = updated.sender?.toString();
      if (senderId && isValidObjectId(senderId)) {
        const senderSockets = await this.redisService.getUserSockets(senderId);
        senderSockets.forEach((socketId) => {
          this.server.to(socketId).emit('message_read_ack', {
            messageId,
            readBy: userId,
            timeStamp: new Date().toISOString(),
          });
        });
      }

      client.emit('message_read_status', {
        messageId,
        status: 'read',
      });

      this.logger.log(`User ${userId} marked message ${messageId} as read.`);
    } catch (err) {
      this.logger.error(
        `Error during message_read for ${messageId} by ${userId}: ${err.message}`,
      );
      client.emit('message_read_status', {
        messageId,
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @MessageBody() dto: EditMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('edit_message_status', {
        messageId: dto.messageId,
        status: 'error',
        message: err.message,
      });
      return;
    }

    try {
      const updatedMessage = await this.chatService.editMessage(
        dto.messageId,
        userId,
        dto.newContent,
      );

      const receiverId = updatedMessage.receiver?.toString();
      if (receiverId && receiverId !== userId) {
        const receiverSockets =
          await this.redisService.getUserSockets(receiverId);
        receiverSockets.forEach((socketId) => {
          this.server.to(socketId).emit('message_edited', {
            messageId: updatedMessage._id,
            newContent: updatedMessage.content,
            editedAt: updatedMessage.editedAt,
          });
        });
      }

      client.emit('edit_message_status', {
        messageId: updatedMessage._id,
        status: 'edited',
        content: updatedMessage.content,
        editedAt: updatedMessage.editedAt,
      });

      this.logger.log(`User ${userId} edited message ${dto.messageId}`);
    } catch (err) {
      this.logger.error(
        `Edit failed for message ${dto.messageId} by ${userId}: ${err.message}`,
      );
      client.emit('edit_message_status', {
        messageId: dto.messageId,
        status: 'error',
        message: err.message,
      });
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() dto: DeleteMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let userId: string;

    try {
      userId = await this.validateTokenAndGetUserId(client);
    } catch (err) {
      client.emit('delete_message_status', {
        messageId: dto.messageId,
        status: 'error',
        message: err.message,
      });
      return;
    }

    try {
      const maybeDeleted = await this.chatService.deleteMessage(
        dto.messageId,
        userId,
      );

      if (!isDeletedMessagePayload(maybeDeleted)) {
        client.emit('error', {
          message:
            'Failed to delete message. ' +
            (typeof maybeDeleted === 'object' ? maybeDeleted.message : ''),
        });
        return;
      }

      const deletedMessage = maybeDeleted;

      const receiverId = deletedMessage.receiver?.toString();
      if (receiverId) {
        const sockets = await this.redisService.getUserSockets(receiverId);
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('message_deleted', {
            messageId: deletedMessage._id,
            deletedAt: deletedMessage.deletedAt,
          });
        });
      }

      client.emit('delete_message_status', {
        messageId: deletedMessage._id,
        status: 'deleted',
        deletedAt: deletedMessage.deletedAt,
      });

      this.logger.log(`User ${userId} deleted message ${dto.messageId}`);
    } catch (err) {
      this.logger.error(
        `Delete failed for message ${dto.messageId} by ${userId}: ${err.message}`,
      );
      client.emit('delete_message_status', {
        messageId: dto.messageId,
        status: 'error',
        message: err.message,
      });
    }
  }
}
