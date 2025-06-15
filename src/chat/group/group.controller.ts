import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PromoteToAdminDto } from './dto/promote-admin.dto';
import { SendGroupInviteDto } from './dto/send-group-invite.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupAdminGuard } from 'src/guards/group-admin.guard';
import { AuthRequest } from 'src/types/express';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Group Chat')
@Controller('groups')
export class GroupController {
  private readonly logger = new Logger(GroupController.name);

  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createGroup(@Body() dto: CreateGroupDto, @Req() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.groupService.createGroup(dto, userId);
  }

  @Post(':groupId/members')
  @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Add a member to a group (admin only)' })
  @ApiParam({
    name: 'groupId',
    type: String,
    description: 'The ID of the group where the member will be added',
  })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only admins can add members' })
  @ApiResponse({ status: 400, description: 'Validation or input error' })
  async addMember(
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.groupService.addMember({ ...dto, groupId }, userId);
  }

  @Delete(':groupId/members/:memberId')
  @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Remove a member from a group (admin only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid groupId or memberId' })
  @ApiResponse({ status: 403, description: 'Only admins can remove members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: RemoveMemberDto })
  async removeMember(
    @Body() dto: RemoveMemberDto,
    @Req() req: AuthRequest & { user: { id: string } },
  ) {
    const userId = req.user['id'];
    return this.groupService.removeMember(dto, userId);
  }

  @Patch(':groupId/admins/:memberId')
  @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Promote a group member to admin (admin only)' })
  @ApiResponse({ status: 200, description: 'Member promoted to admin' })
  @ApiResponse({ status: 403, description: 'Only admins can promote members' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: PromoteToAdminDto })
  async promoteToAdmin(
    @Body() dto: PromoteToAdminDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.groupService.promoteToAdmin({ ...dto });
  }

  @Post(':groupId/messages')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Send a message to a group' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid groupId or message content',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID' })
  @ApiBody({ type: SendGroupMessageDto })
  async sendMessage(
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupMessageDto,
    @Req() req: AuthRequest & { user: { id: string } },
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.groupService.createMessage({ ...dto, groupId }, userId);
  }

  @Get(':groupId/tagged-messages')
  @ApiOperation({
    summary: 'Get all messages where the current user is tagged',
  })
  @ApiResponse({
    status: 200,
    description: 'Tagged messages fetched successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Number of messages per page',
  })
  async getTaggedMessages(
    @Param('groupId') groupId: string,
    @Req() req: AuthRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = req.user?.['id'];
    if (!userId) throw new UnauthorizedException('Unauthorized');
    const messages = await this.groupService.getTaggedMessages(
      groupId,
      userId,
      parseInt(page),
      parseInt(limit),
    );
    return { messages };
  }

  @Post(':groupId/invite')
  @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Send a group invite to a user' })
  @ApiResponse({ status: 201, description: 'Group invite sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or group ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only admins can invite users' })
  @ApiParam({ name: 'groupId', type: String, description: 'ID of the group' })
  @ApiBody({ type: SendGroupInviteDto })
  async sendInvite(
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupInviteDto,
    @Req() req: AuthRequest,
  ) {
    const invitedBy = req.user?.id;
    if (!invitedBy) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.groupService.sendInvite(groupId, invitedBy, dto.invitedUserId);
  }

  @Patch('invite/:inviteId/respond')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Respond to a group invite (accept or reject)' })
  @ApiResponse({ status: 200, description: 'Response to invite recorded' })
  @ApiResponse({ status: 400, description: 'Invalid invite or status' })
  @ApiParam({ name: 'inviteId', type: String, description: 'Invite ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: '665abc123456def7890abc12',
          description: 'User ID who is responding to the invite',
        },
        status: {
          type: 'string',
          enum: ['accepted', 'rejected'],
          example: 'accepted',
          description: 'Status of the invite response',
        },
      },
      required: ['userId', 'status'],
    },
  })
  async respondToInvite(
    @Param('inviteId') inviteId: string,
    @Body('userId') userId: string,
    @Body('status') status: 'accepted' | 'rejected',
  ) {
    return this.groupService.respondToInvite(inviteId, userId, status);
  }

  @Patch(':groupId/name')
  @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update the name of a group (admin only)' })
  @ApiResponse({ status: 200, description: 'Group name updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid group ID or name' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only admins can update the group name',
  })
  @ApiParam({
    name: 'groupId',
    type: String,
    description: 'ID of the group to update',
  })
  @ApiBody({ type: UpdateGroupDto })
  async updateGroupName(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.groupService.updateGroupName(dto.groupId, dto.newName, userId);
  }

  @Delete(':groupId/leave')
  @ApiOperation({ summary: 'Leave a group (must be a member)' })
  @ApiParam({
    name: 'groupId',
    type: String,
    description: 'ID of the group to leave',
    example: '665abc123456def7890abc12',
  })
  @ApiResponse({ status: 200, description: 'Successfully left the group' })
  @ApiResponse({
    status: 400,
    description: 'User is not a member of the group',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Admin must assign another admin before leaving',
  })
  async leaveGroup(@Param('groupId') groupId: string, @Req() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.groupService.leaveGroup(groupId, userId);
  }
}
