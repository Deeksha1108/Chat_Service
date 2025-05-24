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
    private conversationModel: Model<Conversation>,
  ) {}

  async findOrCreateConversation(user1: string, user2: string) {
    const participants = [user1, user2].sort();
    let conv = await this.conversationModel.findOne({ participants });
    if (!conv) {
      conv = new this.conversationModel({ participants });
      await conv.save();
    }
    return conv;
  }

  async createMessage(sender: string, conversationId: string, content: string) {
    const message = new this.messageModel({
      sender: new Types.ObjectId(sender),
      conversationId: new Types.ObjectId(conversationId),
      content,
      delivered: false,
      read: false,
    });
    return message.save();
  }

  async getConversations(userId: string) {
    return this.conversationModel.find({ participants: userId });
  }

  async getMessages(conversationId: string) {
    return this.messageModel.find({ conversationId }).sort({ createdAt: 1 });
  }

  async markAsDelivered(messageId: string) {
    return this.messageModel.findByIdAndUpdate(
      messageId,
      { delivered: true },
      { new: true },
    );
  }

  async markAsRead(messageId: string) {
    return this.messageModel.findByIdAndUpdate(
      messageId,
      { read: true },
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
