import { GroupGateway } from './group.gateway';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PromoteToAdminDto } from './dto/promote-admin.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { Group, GroupDocument } from './schema/group.schema';
import { GroupInvite, GroupInviteDocument } from './schema/group-invite.schema';
import {
  GroupMessage,
  GroupMessageDocument,
} from './schema/group-message.schema';

import { Redis } from 'ioredis';

const MAX_GROUP_LIMIT = 10;

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(GroupInvite.name)
    private readonly inviteModel: Model<GroupInviteDocument>,
    @InjectModel(GroupMessage.name)
    private readonly messageModel: Model<GroupMessageDocument>,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  private async getGroup(groupId: string): Promise<GroupDocument> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  private async getInvite(inviteId: string): Promise<GroupInviteDocument> {
    const cacheKey = `invite:${inviteId}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return new this.inviteModel(parsed);
    }
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');

    await this.redisClient.set(cacheKey, JSON.stringify(invite));
    return invite;
  }

  async createGroup(dto: CreateGroupDto) {
    const existing = await this.groupModel.findOne({ name: dto.name });
    if (existing) throw new BadRequestException('Group name already exists');
    const newGroup = new this.groupModel({
      name: dto.name,
      description: dto.description,
      members: [{ user: new Types.ObjectId(dto.createdBy), role: 'admin' }],
      createdBy: new Types.ObjectId(dto.createdBy),
    });
    const saved = await newGroup.save();
    this.logger.log(`Group "${saved.name}" created by user ${dto.createdBy}`);
    return saved;
  }

  async addMember(dto: AddMemberDto) {
    const group = await this.getGroup(dto.groupId);

    const isAdmin = group.members.find(
      (m) => m.user.toString() === dto.addedBy && m.role === 'admin',
    );
    if (!isAdmin) throw new ForbiddenException('Only admin can add members');

    const alreadyExists = group.members.find(
      (m) => m.user.toString() === dto.newMemberId,
    );
    if (alreadyExists) throw new BadRequestException('User already a member');

    group.members.push({
      user: new Types.ObjectId(dto.newMemberId),
      role: 'member',
    });

    await group.save();
    await this.redisClient.del(`group:${dto.groupId}`);
    this.logger.log(
      `User ${dto.userId} added to group ${dto.groupId} by ${dto.addedBy}`,
    );
    return group;
  }

  async promoteToAdmin(dto: PromoteToAdminDto) {
    const group = await this.getGroup(dto.groupId);

    const isAdmin = group.members.find(
      (m) => m.user.toString() === dto.promotedBy && m.role === 'admin',
    );
    if (!isAdmin) throw new ForbiddenException('Only admin can promote');

    const member = group.members.find((m) => m.user.toString() === dto.userId);
    if (!member) throw new NotFoundException('User is not a member');

    member.role = 'admin';
    await group.save();
    await this.redisClient.del(`group:${dto.groupId}`);
    this.logger.log(
      `User ${dto.userId} promoted to admin in group ${dto.groupId} by ${dto.promotedBy}`,
    );

    return group;
  }

  async sendInvite(groupId: string, invitedBy: string, invitedUserId: string) {
    const group = await this.getGroup(groupId);

    const isAdmin = group.members.find(
      (m) => m.user.toString() === invitedBy && m.role === 'admin',
    );
    if (!isAdmin) throw new ForbiddenException('Only admin can send invite');

    const alreadyMember = group.members.find(
      (m) => m.user.toString() === invitedUserId,
    );
    if (alreadyMember) throw new BadRequestException('User already in group');

    const existingInvite = await this.inviteModel.findOne({
      groupId,
      invitedUserId,
      status: 'pending',
    });
    if (existingInvite) throw new BadRequestException('Invite already sent');

    const invite = await this.inviteModel.create({
      groupId,
      invitedBy,
      invitedUserId,
      status: 'pending',
    });

    await this.redisClient.set(`invite:${invite._id}`, JSON.stringify(invite));
    this.logger.log(
      `Invite sent to user ${invitedUserId} for group ${groupId} by ${invitedBy}`,
    );
    return invite;
  }

  async respondToInvite(
    inviteId: string,
    userId: string,
    status: 'accepted' | 'declined',
  ): Promise<GroupInviteDocument> {
    const invite = await this.inviteModel.findById(inviteId);

    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.invitedUserId.toString() !== userId) {
      throw new ForbiddenException('Not your invite');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException('Invite already responded');
    }

    if (status === 'accepted') {
      const groupsJoined = await this.groupModel.countDocuments({
        'members.user': userId,
      });

      if (groupsJoined >= MAX_GROUP_LIMIT) {
        throw new BadRequestException(
          `You can only be a member of up to ${MAX_GROUP_LIMIT} groups.`,
        );
      }

      await this.groupModel.findByIdAndUpdate(invite.groupId, {
        $addToSet: {
          members: {
            user: new Types.ObjectId(userId),
            role: 'member',
          },
        },
      });
      await this.redisClient.del(`invite:${inviteId}`);
    }
    invite.status = status;
    await invite.save();
    await this.redisClient.del(`group:${invite.groupId}`);
    this.logger.log(
      `User ${userId} ${status} invite ${inviteId} for group ${invite.groupId}`,
    );
    return invite;
  }

  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    const group = await this.getGroup(groupId);
    return group.members.some(
      (member) => member.user.toString() === userId.toString(),
    );
  }

  async createMessage(dto: SendGroupMessageDto) {
    const isMember = await this.isUserInGroup(dto.senderId, dto.groupId);
    if (!isMember) {
      throw new ForbiddenException('User is not a member of the group');
    }
    const newMessage = new this.messageModel({
      groupId: dto.groupId,
      senderId: dto.senderId,
      content: dto.content,
      taggedUserIds: dto.taggedUserIds || [],
    });

    const saved = await newMessage.save();

    this.logger.log(
      `Message sent in group ${dto.groupId} by user ${dto.senderId}`,
    );
    return saved;
  }

  async getTaggedMessages(groupId: string, userId: string) {
    return this.messageModel.find({
      groupId,
      taggedUserIds: userId,
    });
  }
}
