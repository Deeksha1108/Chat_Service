import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schema/message.schema';
import { Conversation } from './schema/conversation.schema';
import { Socket } from 'socket.io';

@Injectable()
export class ChatService {
  private readonly logger = new Logger('ChatService');

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
  ) {}

  async findOrCreateConversation(
    user1: string,
    user2: string,
  ): Promise<Conversation> {
    this.logger.log(
      `Finding/Creating conversation between ${user1} and ${user2}`,
    );

    if (user1 === user2) {
      this.logger.warn('User tried to create conversation with self');
      throw new BadRequestException('Action not allowed');
    }

    const participantIds = [user1, user2].sort();

    if (participantIds.length !== 2) {
      this.logger.warn('More than two participants provided');
      throw new BadRequestException('Invalid request');
    }
    if (!participantIds.every(Types.ObjectId.isValid)) {
      this.logger.warn('Invalid participant IDs');
      throw new BadRequestException('Request is not valid');
    }

    const participants = participantIds
      .map((id) => new Types.ObjectId(id))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    const conv = await this.conversationModel.findOneAndUpdate(
      { participants },
      { $setOnInsert: { participants } },
      { upsert: true, new: true },
    );
    this.logger.log('room created successfully and users connected');
    return conv;
  }

  async validateRoomAccess(roomId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(roomId) || !Types.ObjectId.isValid(userId)) {
      this.logger.warn('Invalid ObjectId(s) during access validation');

      throw new BadRequestException('Invalid request');
    }

    const room = await this.conversationModel.findById(roomId);
    this.logger.warn(`Room not found: ${roomId}`);
    if (!room) {
      throw new NotFoundException('Resource not found');
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      this.logger.warn(`User ${userId} is not part of room ${roomId}`);
      throw new ForbiddenException('Access denied');
    }
    this.logger.log(`User ${userId} is authorized for room ${roomId}`);
  }

  async getValidatedUserId(client: Socket): Promise<string> {
    const userId = client.handshake.auth?.userId?.toString();

    if (!userId || !Types.ObjectId.isValid(userId)) {
      this.logger.warn(
        `Socket connection rejected: Invalid userId (${userId})`,
      );
      throw new BadRequestException('Invalid or missing userId');
    }
    this.logger.log(`Socket connection authenticated for user: ${userId}`);
    return userId;
  }

  async createMessage(
    senderId: string,
    receiverId: string,
    roomId: string,
    content: string,
  ): Promise<Message> {
    this.logger.log(
      `Creating message from ${senderId} to ${receiverId} in room ${roomId}`,
    );
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(receiverId) ||
      !Types.ObjectId.isValid(roomId)
    ) {
      this.logger.warn('Invalid ObjectIds for sender, receiver or room');
      throw new BadRequestException('Invalid sender, receiver or room ID');
    }

    if (senderId === receiverId) {
      this.logger.warn(`Sender (${senderId}) tried to message themselves`);
      throw new BadRequestException('Cannot send message to yourself');
    }

    if (!content || !content.trim()) {
      this.logger.warn(
        `Empty message content received from sender: ${senderId}`,
      );

      throw new BadRequestException('Message content cannot be empty');
    }

    const message = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      roomId: new Types.ObjectId(roomId),
      content,
      delivered: false,
      read: false,
    });
    this.logger.log(
      `Message sent successfully from ${senderId} to ${receiverId} (ID: ${message._id})`,
    );
    return await message.save();
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(`Invalid userId provided: ${userId}`);
      throw new BadRequestException('Invalid userId');
    }
    this.logger.log(`Fetching conversations for user: ${userId}`);
    return this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    roomId: string;
  }): Promise<Message> {
    const { senderId, receiverId, content, roomId } = data;

    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(receiverId) ||
      !Types.ObjectId.isValid(roomId)
    ) {
      this.logger.warn(
        `Invalid IDs in sendMessage: senderId=${senderId}, receiverId=${receiverId}, roomId=${roomId}`,
      );
      throw new BadRequestException('Invalid senderId, receiverId, or roomId');
    }

    if (!content || content.trim().length === 0) {
      this.logger.warn(`Empty message content rejected for room: ${roomId}`);
      throw new BadRequestException('Message content cannot be empty');
    }

    const room = await this.conversationModel.findById(roomId);
    if (!room) {
      this.logger.warn(`sendMessage failed: Room not found - ${roomId}`);
      throw new NotFoundException('Conversation (room) not found');
    }
    const isParticipant = room.participants.some(
      (p) => p.toString() === senderId || p.toString() === receiverId,
    );
    if (!isParticipant) {
      this.logger.warn(
        `Unauthorized message attempt by sender: ${senderId} or receiver: ${receiverId} in room: ${roomId}`,
      );
      throw new ForbiddenException('User not part of this conversation');
    }
    this.logger.log(
      `Message sent in room ${roomId} by ${senderId} to ${receiverId}`,
    );
    const message = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      roomId: new Types.ObjectId(roomId),
      content: content.trim(),
      delivered: false,
      read: false,
    });
    return message.save();
  }

  async getMessages(roomId: string, userId: string, page = 1, limit = 25) {
    if (!Types.ObjectId.isValid(roomId)) {
      this.logger.warn(`Invalid roomId provided: ${roomId}`);
      throw new BadRequestException('Invalid roomId');
    }
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(`Invalid userId provided: ${userId}`);
      throw new BadRequestException('Invalid userId');
    }
    const room = await this.conversationModel.findById(roomId);
    if (!room) {
      this.logger.warn(`Room not found during message fetch: ${roomId}`);
      throw new NotFoundException('Conversation not found');
    }

    // Ensure user is a participant of this conversation
    const isParticipant = room.participants.some(
      (id) => id.toString() === userId,
    );
    if (!isParticipant) {
      this.logger.warn(
        `Unauthorized message fetch attempt by ${userId} in room ${roomId}`,
      );
      throw new ForbiddenException('You are not part of this conversation');
    }

    page = Math.max(page, 1);
    limit = Math.min(limit, 100);
    const skip = (page - 1) * limit;

    this.logger.log(
      `Fetching messages for room ${roomId}, user ${userId}, page ${page}, limit ${limit}`,
    );

    const messages = await this.messageModel
      .find({ roomId: new Types.ObjectId(roomId) })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    // Optionally format deleted messages
    return messages.map((msg) => {
      if (msg.deleted) {
        return {
          ...msg,
          content: null,
          isDeleted: true,
        };
      }
      return { ...msg, isDeleted: false };
    });
  }

  async findMessageById(messageId: string, userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(messageId)) {
      this.logger.warn(`Invalid messageId provided: ${messageId}`);
      throw new BadRequestException('Invalid messageId');
    }
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(`Invalid userId provided: ${userId}`);
      throw new BadRequestException('Invalid userId');
    }
    const message = await this.messageModel.findById(messageId).lean();

    if (!message) {
      this.logger.warn(`Message not found: ${messageId}`);
      throw new NotFoundException('Message not found');
    }
    const isAuthorized =
      message.sender.toString() === userId ||
      message.receiver.toString() === userId;

    if (!isAuthorized) {
      this.logger.warn(
        `Unauthorized access attempt by user ${userId} on message ${messageId}`,
      );
      throw new ForbiddenException('You are not allowed to view this message');
    }
    if (message.deleted) {
      return {
        ...message,
        content: null,
        isDeleted: true,
      };
    }
    return {
      ...message,
      isDeleted: false,
    };
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(roomId)) {
      this.logger.warn(
        `Invalid userId or roomId: userId=${userId}, roomId=${roomId}`,
      );
      throw new BadRequestException('Invalid userId or roomId');
    }
    const conversation = await this.conversationModel.findById(roomId).lean();
    if (!conversation) {
      this.logger.warn(`Conversation not found: roomId=${roomId}`);
      return false;
    }
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === userId,
    );
    this.logger.log(
      `User ${userId} ${isParticipant ? 'is' : 'is not'} a participant of room ${roomId}`,
    );
    return isParticipant;
  }

  async markAsDelivered(messageId: string) {
    if (!Types.ObjectId.isValid(messageId)) {
      this.logger.warn(
        `Invalid messageId provided to markAsDelivered: ${messageId}`,
      );
      throw new BadRequestException('Invalid messageId');
    }
    const updatedMessage = await this.messageModel.findByIdAndUpdate(
      messageId,
      { delivered: true, deliveredAt: new Date() },
      { new: true },
    );

    if (!updatedMessage) {
      this.logger.warn(
        `Message with ID ${messageId} not found to mark as delivered.`,
      );
    } else {
      this.logger.log(`Message with ID ${messageId} marked as delivered.`);
    }
    return updatedMessage;
  }

  async bulkMarkAsDelivered(
    messageIds: string[],
  ): Promise<{ modifiedCount: number }> {
    if (
      !Array.isArray(messageIds) ||
      messageIds.length === 0 ||
      !messageIds.every((id) => Types.ObjectId.isValid(id))
    ) {
      this.logger.warn(
        'Invalid or empty messageIds array provided to bulkMarkAsDelivered',
      );
      throw new BadRequestException('Invalid or empty messageIds array');
    }
    const result = await this.messageModel.updateMany(
      {
        _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) },
        delivered: false,
      },
      { $set: { delivered: true, deliveredAt: new Date() } },
    );
    this.logger.log(
      `bulkMarkAsDelivered updated ${result.modifiedCount} messages.`,
    );

    return { modifiedCount: result.modifiedCount };
  }

  async markAsRead(messageId: string): Promise<Message | null> {
    if (!Types.ObjectId.isValid(messageId)) {
      this.logger.warn(
        `Invalid messageId provided to markAsRead: ${messageId}`,
      );
      throw new BadRequestException('Invalid messageId');
    }
    const updatedMessage = await this.messageModel.findByIdAndUpdate(
      messageId,
      { read: true, readAt: new Date() },
      { new: true },
    );

    if (!updatedMessage) {
      this.logger.warn(
        `Message with ID ${messageId} not found to mark as read.`,
      );
      this.logger.warn(`Message with ID ${messageId} not found`);
      return null;
    }
    this.logger.log(`Message with ID ${messageId} marked as read.`);
    return updatedMessage;
  }

  async markAllAsRead(
    roomId: string,
    userId: string,
  ): Promise<{ updatedCount: number }> {
    if (!Types.ObjectId.isValid(roomId) || !Types.ObjectId.isValid(userId)) {
      this.logger.warn(
        `Invalid IDs for markAllAsRead: roomId=${roomId}, userId=${userId}`,
      );
      throw new BadRequestException('Invalid roomId or userId');
    }
    const result = await this.messageModel.updateMany(
      {
        roomId: new Types.ObjectId(roomId),
        receiver: new Types.ObjectId(userId),
        read: false,
      },
      {
        $set: { read: true, readAt: new Date() },
      },
    );
    this.logger.log(
      `Marked ${result.modifiedCount} messages as read in room ${roomId} for user ${userId}`,
    );
    return { updatedCount: result.modifiedCount };
  }

  async getUnreadCount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(`Invalid userId provided to getUnreadCount: ${userId}`);
      throw new BadRequestException('Invalid userId');
    }
    return this.messageModel.aggregate([
      { $match: { receiver: new Types.ObjectId(userId), read: false } },
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
      {
        $project: {
          roomId: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }

  async editMessage(messageId: string, senderId: string, newContent: string) {
    const EDIT_WINDOW_MINUTES = 15;

    if (!newContent || newContent.trim() === '') {
      this.logger.warn(
        `Empty content provided for editing messageId: ${messageId} by user: ${senderId}`,
      );
      throw new BadRequestException('Message content cannot be empty');
    }
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      this.logger.warn(`Edit failed: messageId ${messageId} not found`);
      throw new NotFoundException('Message not found');
    }
    if (message.sender.toString() !== senderId) {
      this.logger.warn(
        `Unauthorized edit attempt on messageId ${messageId} by user ${senderId}`,
      );
      throw new ForbiddenException('Unuthorized');
    }

    if ((message as any).isDeleted) {
      this.logger.warn(`Edit attempt on deleted messageId ${messageId}`);
      throw new BadRequestException('Message does not exist');
    }

    const now = new Date();
    const sentTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - sentTime.getTime()) / (1000 * 60);

    if (diffInMinutes > EDIT_WINDOW_MINUTES) {
      this.logger.warn(
        `Edit window expired for messageId ${messageId} by user ${senderId}`,
      );
      throw new BadRequestException(`Message edit time expired`);
    }

    message.content = newContent;
    message.editedAt = now;
    message.edited = true;
    this.logger.log(
      `Message ${messageId} edited successfully by user ${senderId}`,
    );
    return await message.save();
  }

  async deleteMessage(messageId: string, requesterId: string) {
    if (
      !Types.ObjectId.isValid(messageId) ||
      !Types.ObjectId.isValid(requesterId)
    ) {
      this.logger.warn(
        `Invalid IDs for deleteMessage: messageId=${messageId}, requesterId=${requesterId}`,
      );
      throw new BadRequestException('Invalid messageId or requesterId');
    }
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      this.logger.warn(`Delete failed: messageId ${messageId} not found`);
      throw new NotFoundException('Not found');
    }

    if (message.sender.toString() !== requesterId) {
      this.logger.warn(
        `Unauthorized delete attempt on messageId ${messageId} by user ${requesterId}`,
      );
      throw new ForbiddenException('Unauthorized access');
    }

    if (message.deleted) {
      this.logger.log(
        `Delete called on already deleted messageId ${messageId} by user ${requesterId}`,
      );
      return { success: false, message: 'Message already deleted' };
    }

    // Soft delete: mark as deleted
    message.deleted = true;
    await message.save();
    this.logger.log(
      `Message ${messageId} soft-deleted successfully by user ${requesterId}`,
    );
    return { success: true, message: 'Message deleted successfully' };
  }
}
