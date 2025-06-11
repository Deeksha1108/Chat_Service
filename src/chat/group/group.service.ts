import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  Logger,
  InternalServerErrorException,
  ConflictException,
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
import { RemoveMemberDto } from './dto/remove-member.dto';
import { Server } from 'socket.io';
import { SOCKET_IO_SERVER } from 'src/socket/socket.constants';
import { REDIS_CLIENT } from '../redis/redis.constants';

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
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @Inject(SOCKET_IO_SERVER) private readonly socketServer: Server,
  ) {}

  private async getGroup(
    groupId: string,
    options?: { throwIfDeleted?: boolean },
  ): Promise<GroupDocument> {
    if (!groupId || !groupId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid group ID format');
    }
    const group = await this.groupModel.findById(groupId).lean().exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (options?.throwIfDeleted && group.isDeleted) {
      throw new BadRequestException('This group has been deleted');
    }
    return group;
  }

  private async getInvite(inviteId: string): Promise<GroupInviteDocument> {
    if (!inviteId || !inviteId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid invite ID format');
    }

    const cacheKey = `invite:${inviteId}`;

    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return new this.inviteModel(parsed);
      }

      const invite = await this.inviteModel.findById(inviteId).exec();
      if (!invite) {
        throw new NotFoundException('Invite not found');
      }

      await this.redisClient.set(cacheKey, JSON.stringify(invite), 'EX', 3600);

      return invite;
    } catch (err) {
      this.logger.error(`Failed to retrieve invite ${inviteId}`, err.stack);

      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }

      throw new InternalServerErrorException('Failed to fetch invite');
    }
  }

  async isAdmin(userId: string, groupId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(groupId) || !Types.ObjectId.isValid(userId)) {
      return false;
    }
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const userObjectId = new Types.ObjectId(userId);
    const adminMember = group.members.find(
      (member) =>
        member.userId.equals(userObjectId) &&
        member.role === 'admin' &&
        !member.isRemoved,
    );

    return !!adminMember;
  }

  async removeMember(
    dto: RemoveMemberDto,
    adminUserId: string,
  ): Promise<Group> {
    const { groupId, memberIdToRemove: removeUserId } = dto;

    const isAdmin = await this.isAdmin(adminUserId, groupId);
    if (!isAdmin) {
      throw new ForbiddenException('Only group admins can remove members');
    }

    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const userObjectIdToRemove = new Types.ObjectId(removeUserId);

    const member = group.members.find(
      (m) => m.userId.equals(userObjectIdToRemove) && !m.isRemoved,
    );
    if (!member) {
      throw new NotFoundException(
        'Member not found in group or already removed',
      );
    }

    member.isRemoved = true;

    await group.save();

    return group;
  }

  async createGroup(
    dto: CreateGroupDto,
    userId: string,
  ): Promise<GroupDocument> {
    const { name, description, members } = dto;
    const createdBy = userId;
    if (!name || !name.trim()) {
      throw new BadRequestException('Group name is required');
    }
    if (!createdBy || !Types.ObjectId.isValid(createdBy)) {
      throw new BadRequestException('Invalid creator ID');
    }
    if (!Array.isArray(members) || members.length === 0) {
      throw new BadRequestException('Group must have at least one member');
    }
    const existing = await this.groupModel.findOne({
      name: new RegExp(`^${name}$`, 'i'),
    });
    if (existing) {
      throw new ConflictException('Group name already exists');
    }
    const uniqueMemberIds = Array.from(
      new Set(members.map((id) => id.toString())),
    );
    if (!uniqueMemberIds.includes(createdBy)) {
      uniqueMemberIds.push(createdBy);
    }
    const memberDocs = uniqueMemberIds.map((id) => ({
      user: new Types.ObjectId(id),
      role: id === createdBy ? 'admin' : 'member',
    }));
    const newGroup = new this.groupModel({
      name: name.trim(),
      description: description?.trim() || '',
      members: memberDocs,
      createdBy: new Types.ObjectId(createdBy),
      createdAt: new Date(),
    });

    try {
      const saved = await newGroup.save();
      this.logger.log(`Group "${saved.name}" created by user ${createdBy}`);
      return saved;
    } catch (err) {
      this.logger.error('Error creating group', err.stack);
      throw new InternalServerErrorException('Failed to create group');
    }
  }

  async addMember(
    dto: AddMemberDto,
    addedByUserId: string,
  ): Promise<GroupDocument> {
    const { groupId, newMemberId } = dto;
    if (!groupId || !Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Invalid group ID');
    }
    if (!addedByUserId || !Types.ObjectId.isValid(addedByUserId)) {
      throw new BadRequestException('Invalid admin user ID');
    }
    if (!newMemberId || !Types.ObjectId.isValid(newMemberId)) {
      throw new BadRequestException('Invalid new member ID');
    }
    const group = await this.groupModel
      .findById(groupId)
      .select('members name')
      .exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const isAdmin = group.members.some(
      (m) => m.userId.toString() === addedByUserId && m.role === 'admin',
    );
    if (!isAdmin) {
      throw new ForbiddenException('Only group admins can add members');
    }
    const alreadyMember = group.members.some(
      (m) => m.userId.toString() === newMemberId,
    );
    if (alreadyMember) {
      throw new ConflictException('User is already a member of the group');
    }
    group.members.push({
      userId: new Types.ObjectId(newMemberId),
      role: 'member',
      joinedAt: new Date(),
      isRemoved: false,
    });
    try {
      const updated = await group.save();
      await this.redisClient.del(`group:${groupId}`);
      this.logger.log(
        `User ${newMemberId} added to group "${group.name}" by ${addedByUserId}`,
      );
      return updated;
    } catch (err) {
      this.logger.error(
        `Failed to add member ${newMemberId} to group ${groupId}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to add member to group');
    }
  }

  async sendInvite(
    groupId: string,
    invitedBy: string,
    invitedUserId: string,
  ): Promise<GroupInviteDocument> {
    if (
      ![groupId, invitedBy, invitedUserId].every((id) =>
        Types.ObjectId.isValid(id),
      )
    ) {
      throw new BadRequestException(
        'Invalid input: One or more IDs are malformed',
      );
    }

    const group = await this.groupModel
      .findById(groupId)
      .select('members name')
      .exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.members.some(
      (m) => m.userId.toString() === invitedBy && m.role === 'admin',
    );
    if (!isAdmin) {
      throw new ForbiddenException('Only group admins can send invites');
    }

    const alreadyMember = group.members.some(
      (m) => m.userId.toString() === invitedUserId,
    );
    if (alreadyMember) {
      throw new ConflictException('User is already a member of the group');
    }

    const existingInvite = await this.inviteModel
      .findOne({
        groupId,
        invitedUserId,
        status: 'pending',
      })
      .exec();

    if (existingInvite) {
      throw new ConflictException('An invite is already pending for this user');
    }

    try {
      const invite = await this.inviteModel.create({
        groupId: new Types.ObjectId(groupId),
        invitedBy: new Types.ObjectId(invitedBy),
        invitedUserId: new Types.ObjectId(invitedUserId),
        status: 'pending',
        sentAt: new Date(),
      });
      await this.redisClient.set(
        `invite:${invite._id}`,
        JSON.stringify(invite),
      );
      this.logger.log(
        `Invite [${invite._id}] sent to user ${invitedUserId} for group "${group.name}" by admin ${invitedBy}`,
      );
      return invite;
    } catch (err) {
      this.logger.error(
        `Failed to send invite to ${invitedUserId} for group ${groupId}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to send group invite');
    }
  }

  async respondToInvite(
    inviteId: string,
    userId: string,
    response: 'accepted' | 'rejected',
  ): Promise<GroupInviteDocument> {
    if (!Types.ObjectId.isValid(inviteId)) {
      throw new BadRequestException('Invalid invite ID');
    }
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.invitedUserId.toString() !== userId) {
      throw new ForbiddenException('Unauthorized invite access');
    }

    if (invite.status !== 'pending') {
      throw new ConflictException('Invite already responded to');
    }

    if (response === 'accepted') {
      const group = await this.groupModel.findById(invite.groupId);
      if (!group) throw new NotFoundException('Group no longer exists');

      const groupsJoined = await this.groupModel.countDocuments({
        'members.user': userId,
      });

      if (groupsJoined >= MAX_GROUP_LIMIT) {
        throw new BadRequestException(
          `You can only join up to ${MAX_GROUP_LIMIT} groups.`,
        );
      }

      const alreadyMember = group.members.some(
        (m) => m.userId.toString() === userId,
      );
      if (!alreadyMember) {
        group.members.push({
          userId: new Types.ObjectId(userId),
          role: 'member',
          joinedAt: new Date(),
          isRemoved: false,
        });
        await group.save();
      }
    }

    invite.status = response;
    invite.respondedAt = new Date();
    await invite.save();

    await this.redisClient.del(`invite:${inviteId}`);
    await this.redisClient.del(`group:${invite.groupId}`);
    this.logger.log(
      `User ${userId} ${response} invite ${inviteId} for group ${invite.groupId}`,
    );

    return invite;
  }

  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Invalid userId or groupId');
    }

    const group = await this.groupModel
      .findById(groupId)
      .select('members.user')
      .lean()
      .exec();

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    const isMember = group.members.some(
      (member) => member.userId.toString() === userId.toString(),
    );

    return isMember;
  }

  async createMessage(
    dto: SendGroupMessageDto,
    senderId: string,
  ): Promise<GroupMessageDocument> {
    const { groupId, content, taggedUserIds = [] } = dto;

    if (![senderId, groupId].every(Types.ObjectId.isValid)) {
      throw new BadRequestException('Invalid senderId or groupId');
    }

    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const isMember = await this.isUserInGroup(senderId, groupId);
    if (!isMember) {
      throw new ForbiddenException('User is not a member of the group');
    }

    const validTaggedUserIds = Array.isArray(taggedUserIds)
      ? taggedUserIds.filter((id) => Types.ObjectId.isValid(id))
      : [];

    const uniqueTaggedUserIds = [
      ...new Set(validTaggedUserIds.map((id) => id.toString())),
    ];

    try {
      const message = new this.messageModel({
        groupId: new Types.ObjectId(groupId),
        senderId: new Types.ObjectId(senderId),
        content: content.trim(),
        taggedUserIds: uniqueTaggedUserIds.map((id) => new Types.ObjectId(id)),
        sentAt: new Date(),
      });

      const saved = await message.save();

      this.logger.log(
        `Message [${saved._id}] sent in group ${groupId} by user ${senderId}`,
      );
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to send message in group ${groupId} by user ${senderId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to send group message');
    }
  }

  async getTaggedMessages(
    groupId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    messages: GroupMessageDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(groupId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid groupId or userId');
    }

    const group = await this.groupModel
      .findById(groupId)
      .select('members name');
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some(
      (m) => m.userId.toString() === userId.toString(),
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({
          groupId: new Types.ObjectId(groupId),
          taggedUserIds: new Types.ObjectId(userId),
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),

      this.messageModel.countDocuments({
        groupId: new Types.ObjectId(groupId),
        taggedUserIds: new Types.ObjectId(userId),
      }),
    ]);

    this.logger.log(
      `User ${userId} fetched tagged messages from group ${groupId} [page=${page}, limit=${limit}]`,
    );

    return {
      messages,
      total,
      page,
      limit,
    };
  }

  async promoteToAdmin(dto: PromoteToAdminDto): Promise<GroupDocument> {
    const { groupId, promotedBy, memberIdToPromote } = dto;

    if (
      ![groupId, promotedBy, memberIdToPromote].every(Types.ObjectId.isValid)
    ) {
      throw new BadRequestException(
        'Invalid groupId, userId, or promotedBy ID',
      );
    }

    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const promoter = group.members.find(
      (m) => m.userId.toString() === promotedBy && m.role === 'admin',
    );
    if (!promoter) {
      throw new ForbiddenException('Only admins can promote others');
    }

    const member = group.members.find(
      (m) => m.userId.toString() === memberIdToPromote,
    );
    if (!member) {
      throw new NotFoundException(
        'User to promote is not a member of the group',
      );
    }

    if (member.role === 'admin') {
      throw new ConflictException('User is already an admin');
    }

    member.role = 'admin';
    await group.save();

    await this.redisClient.del(`group:${groupId}`);

    this.socketServer.to(`group_${groupId}`).emit('userPromotedToAdmin', {
      groupId,
      userId: memberIdToPromote,
      promotedBy,
      timestamp: new Date(),
      message: `User ${memberIdToPromote} has been promoted to admin by ${promotedBy}`,
    });

    this.logger.log(
      `User ${memberIdToPromote} promoted to admin in group ${groupId} by admin ${promotedBy}`,
    );

    return group;
  }

  async updateGroupName(
    groupId: string,
    newName: string,
    userId: string,
  ): Promise<GroupDocument> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Invalid groupId');
    }

    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.members.some(
      (member) =>
        member.userId.toString() === userId && member.role === 'admin',
    );
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update the group name');
    }

    group.name = newName;
    await group.save();

    if (this.redisClient) {
      await this.redisClient.del(`group:${groupId}`);
    }

    if (this.socketServer) {
      this.socketServer.to(`group_${groupId}`).emit('groupNameUpdated', {
        groupId,
        newName,
        updatedBy: userId,
        timestamp: new Date(),
      });
    }

    this.logger.log(
      `Group name updated to "${newName}" by user ${userId} in group ${groupId}`,
    );

    return group;
  }

  async leaveGroup(
    groupId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const group = await this.getGroup(groupId, { throwIfDeleted: true });

    const isMember = group.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      throw new BadRequestException('You are not a member of this group');
    }

    const admins = group.members.filter((member) => member.role === 'admin');

    const isAdmin = admins.some((admin) => admin.toString() === userId);

    if (isAdmin && admins.length === 1) {
      throw new ForbiddenException(
        'You are the only admin. Assign another admin before leaving the group',
      );
    }

    group.members = group.members.filter(
      (member) => member.userId.toString() !== userId,
    );

    await this.groupModel.updateOne(
      { _id: groupId },
      { members: group.members },
    );

    return { message: 'You have successfully left the group' };
  }
}
