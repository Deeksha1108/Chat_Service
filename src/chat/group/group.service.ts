import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateGroupDto } from './dto/create-group.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { Group, GroupDocument } from './schema/group.schema';
import {
  GroupMessage,
  GroupMessageDocument,
} from './schema/group-message.schema';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMessage.name)
    private groupMessageModel: Model<GroupMessageDocument>,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto): Promise<Group> {
    const createdGroup = new this.groupModel(createGroupDto);
    return createdGroup.save();
  }

  async sendGroupMessage(
    groupId: string,
    sendGroupMessageDto: SendGroupMessageDto,
  ): Promise<GroupMessage> {
    const { senderId, content } = sendGroupMessageDto;

    // Check if group exists
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const groupMessage = new this.groupMessageModel({
      sender: new Types.ObjectId(senderId),
      group: new Types.ObjectId(groupId),
      content,
      timestamp: new Date(),
    });

    return groupMessage.save();
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    // Confirm group exists
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.groupMessageModel
      .find({ group: groupId })
      .sort({ timestamp: 1 })
      .exec();
  }

  async getGroupsByUser(userId: string): Promise<Group[]> {
    // Find groups where user is a member
    return this.groupModel.find({ members: userId }).exec();
  }
}
