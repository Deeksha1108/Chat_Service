import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schema/message.schema';
import { Conversation } from './schema/conversation.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
  ) {}

  async findOrCreateConversation(user1: string, user2: string) {
    const participants = [user1, user2]
      .map((id) => new Types.ObjectId(id))
      .sort();
    let conv = await this.conversationModel.findOne({ participants });
    if (!conv) {
      conv = new this.conversationModel({ participants });
      await conv.save();
    }
    return conv;
  }

  async createMessage(
    senderId: string,
    receiverId: string,
    conversationId: string,
    content: string,
  ) {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(conversationId)
    ) {
      throw new Error('Invalid sender or conversation ID');
    }
    const message = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      conversationId: new Types.ObjectId(conversationId),
      content,
      delivered: false,
      read: false,
    });
    return message.save();
  }

  async getConversations(userId: string) {
    return this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
      })
      .exec();
  }

  async saveMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    conversationId: string;
  }) {
    return this.messageModel.create(data);
  }


  async getMessages(conversationId: string) {
    return this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 });
  }

async markAsDelivered(messageId: string) {
  return this.messageModel.findByIdAndUpdate(
    messageId,
    { isDelivered: true, deliveredAt: new Date() },
    { new: true },
  );
}


  async markAsRead(messageId: string) {
    return this.messageModel.findByIdAndUpdate(
      messageId,
      { read: true, readAt: new Date() },
      { new: true },
    );
  }

  async getUnreadCount(userId: string) {
    return this.messageModel.aggregate([
      { $match: { receiver: new Types.ObjectId(userId), read: false } },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]);
  }
}
