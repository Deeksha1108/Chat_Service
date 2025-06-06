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
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SendMessageDto } from './dto/send-message.dto';
import { isValidObjectId, Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { InjectModel } from '@nestjs/mongoose';

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
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    // const userId = client.handshake.auth?.userId?.toString();
    const userId = client.handshake.auth?.userId?.toString() || 'test-user'; // 🧪 Default for testing

    // if (!userId || !isValidObjectId(userId)) {
    // this.logger.warn(
    //   `Connection rejected: invalid or missing userId from socket ${client.id}`,
    // );
    //   return client.disconnect();
    // }
    try {
      await this.redisService.setUserSocket(userId, client.id);
      this.logger.log(
        `User ${userId} connected. Socket ${client.id} registered.`,
      );
    } catch (err) {
      this.logger.error(
        `Redis error while setting socket for user ${userId}: ${err.message}`,
      );
    }
    if (!client.rooms.has(userId)) {
      client.join(userId);
      this.logger.log(`Socket ${client.id} joined room ${userId}`);
    } else {
      this.logger.log(`Socket ${client.id} already in room ${userId}`);
    }

    try {
      const offlineMessages =
        await this.redisService.getOfflineMessages(userId);
      if (offlineMessages && offlineMessages.length > 0) {
        for (const rawMsg of offlineMessages) {
          try {
            const msg = JSON.parse(rawMsg);
            client.emit('receive_message', msg);
          } catch (e) {
            this.logger.warn(
              `Failed to parse offline message for ${userId}: ${e.message}`,
            );
          }
        }
        await this.redisService.clearOfflineMessages(userId);
        this.logger.log(
          `Delivered ${offlineMessages.length} offline messages to user ${userId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error fetching offline messages for ${userId}: ${err.message}`,
      );
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    // const userId = client.handshake.auth?.userId?.toString();
    const userId = client.handshake.auth?.userId?.toString() || 'test-user'; // 🧪 For testing

    //   if (!userId || !isValidObjectId(userId)) {
    // this.logger.warn(`Disconnect with invalid or missing userId on socket ${client.id}`);
    //   return;
    // }
    try {
      await this.redisService.removeUserSocket(userId, client.id);
      this.logger.log(
        `Socket ${client.id} disconnected. Cleaned Redis entry for ${userId}`,
      );
    } catch (err) {
      this.logger.error(
        `Error removing socket ${client.id} for ${userId} from Redis: ${err.message}`,
      );
    }
    this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;

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
        this.logger.log(
          `User ${userId} already in room ${roomId} (socket ${client.id})`,
        );
      }
    } catch (error) {
      const status =
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
          ? error.message
          : 'Failed to join room';

      client.emit('room_error', { message: status });
      this.logger.warn(
        `Join room failed: user=${userId}, room=${roomId}, socket=${client.id}, reason=${status}`,
      );
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    //   const { senderId, receiverId, roomId, content } = data;
    //   if (![senderId, receiverId, roomId, content].every(Boolean)) {
    //     return client.emit('error', { message: 'Missing fields in message' });
    //   }

    //   if (![senderId, receiverId, roomId].every(isValidObjectId)) {
    //     return client.emit('error', { message: 'Invalid IDs in message' });
    //   }

    //   // const senderId = client.handshake.auth?.userId?.toString();
    //  const senderId = data.senderId; // 🧪 Use from DTO directly for testing

    //   // if (!senderId) {
    //   //   this.logger.warn(`Invalid senderId from socket ${client.id}`);
    //   //   client.emit('message_status', {
    //   //     status: 'error',
    //   //     error: 'Unauthorized sender',
    //   //   });
    //   //   return;
    //   // }

    //   const isMember = await this.chatService.isUserInRoom(senderId, roomId);
    //   if (!isMember) {
    //     return client.emit('error', { message: 'Unauthorized room access' });
    //   }

    try {
      let savedMessage = await this.chatService.sendMessage(data);
      client.emit('message_sent', savedMessage);

      const receiverSockets = await this.redisService.getUserSockets(
        data.receiverId,
      );

      if (receiverSockets.length === 0) {
        await this.redisService.addOfflineMessage(
          data.receiverId,
          JSON.stringify(savedMessage),
        );
        this.logger.log(
          `Receiver ${data.receiverId} is offline. Message queued.`,
        );
      } else {
        const updatedMessage = await this.chatService.markAsDelivered(
          savedMessage.id,
        );

        if (!updatedMessage) {
          this.logger.warn(`Message not found while marking as delivered`);
        } else {
          savedMessage = updatedMessage;
        }

        receiverSockets.forEach((socketId) => {
          this.server.to(socketId).emit('receive_message', savedMessage);
        });

        this.logger.log(`Message delivered to receiver ${data.receiverId}`);
      }
    } catch (err) {
      this.logger.error(
        `Error sending message from ${data.senderId} to ${data.receiverId}: ${err.message}`,
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
  ) {
    const userId = client.handshake.auth?.userId?.toString();

    if (!userId || !isValidObjectId(userId)) {
      this.logger.warn(
        `Invalid userId in message_received ack: socket=${client.id}`,
      );
      client.emit('message_received_status', {
        messageId,
        status: 'error',
        message: 'Invalid userId',
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
  ) {
    // const userId = client.handshake.auth?.userId?.toString();
    const userId = 'test-user'; // 🧪 For testing

    // if (!userId || !messageId || !isValidObjectId(messageId)) {
    // this.logger.warn(
    //   `Invalid delivery ack: userId=${userId}, messageId=${messageId}, socket=${client.id}`,
    // );

    //   return client.emit('messageDeliveryAck', {
    //     messageId,
    //     status: 'error',
    //     message: 'Invalid request',
    //   });
    // }

    try {
      const updated = await this.chatService.markAsDelivered(messageId);
      if (!updated) {
        this.logger.warn(
          `Message ${messageId} not found while marking as delivered`,
        );
        client.emit('messageDeliveryAck', {
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
        return client.emit('message_delivered_ack', {
          messageId,
          status: 'error',
          message: 'Unauthorized action',
        });
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
  ) {
    const userId = client.handshake.auth?.userId?.toString();

    if (
      !userId ||
      !isValidObjectId(userId) ||
      !messageId ||
      !isValidObjectId(messageId)
    ) {
      this.logger.warn(
        `Invalid read ack: userId=${userId}, messageId=${messageId}, socket=${client.id}`,
      );
      client.emit('message_read_status', {
        messageId,
        status: 'error',
        message: 'Invalid input',
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
}
