import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from '../common/schemas/conversation.schema';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { Message } from '../private/schema/message.schema';
import { MessageDocument } from '../common/schemas/message.schema';

@Injectable()
export class GroupChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async createGroup(dto: CreateGroupChatDto) {
    const group = await this.conversationModel.create({
      createdBy: dto.adminId,
      participants: dto.participants,
      isGroup: true,
      groupName: dto.name,
      groupAdmin: dto.adminId,
      messages: [],
    });

    return {
      message: 'Group created successfully',
      groupId: group._id,
      groupName: group.groupName,
    };
  }

  async addParticipant(groupId: string, userId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group || !group.isGroup) {
      throw new NotFoundException('Group not found');
    }

    if (group.participants.includes(userId)) {
      throw new BadRequestException('User already in group');
    }

    group.participants.push(userId);
    await group.save();

    return { message: 'User added to group', groupId };
  }

  async removeParticipant(groupId: string, userId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group || !group.isGroup) {
      throw new NotFoundException('Group not found');
    }

    group.participants = group.participants.filter(
      (participantId: string) => participantId.toString() !== userId,
    );

    await group.save();

    return { message: 'User removed from group', groupId };
  }

  async validateGroupMember(groupId: string, userId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group || !group.isGroup) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.participants.some(
      (id: string) => id.toString() === userId,
    );

    if (!isMember) {
      throw new BadRequestException('User is not a member of this group');
    }

    return true;
  }

  async saveGroupMessage(dto: SendGroupMessageDto) {
    const { groupId, content, senderId } = dto;
    const group = await this.conversationModel.findById(groupId);
    if (!group || !group.isGroup) {
      throw new NotFoundException('Group not found');
    }

    const message = await this.messageModel.create({
      sender: new Types.ObjectId(senderId),
      content,
      conversationId: new Types.ObjectId(groupId),
      delivered: false,
      read: false,
    });

    group.messages.push(message._id as Types.ObjectId);
    await group.save();

    return {
      groupId,
      senderId,
      content,
      timestamp: message.createdAt,
      messageId: message._id,
    };
  }
}
