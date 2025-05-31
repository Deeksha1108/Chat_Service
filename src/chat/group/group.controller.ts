import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PromoteToAdminDto } from './dto/promote-admin.dto';
import { SendGroupInviteDto } from './dto/send-group-invite.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // Create new group
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.createGroup(createGroupDto);
  }

  // Add member to group (admin only)
  @Post('add-member')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addMember(@Body() addMemberDto: AddMemberDto) {
    console.log('Received payload:', addMemberDto);
    return this.groupService.addMember(addMemberDto);
  }

  // Send messages to group
  @Post('send-message')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async sendMessage(@Body() dto: SendGroupMessageDto) {
    const message = await this.groupService.createMessage(dto);
    return { message };
  }

  @Get('tagged-messages/:groupId/:userId')
  async getTaggedMessages(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    const messages = await this.groupService.getTaggedMessages(groupId, userId);
    return { messages };
  }

  // Promote member to admin (admin only)
  @Patch('promote-admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async promoteToAdmin(@Body() promoteToAdminDto: PromoteToAdminDto) {
    return this.groupService.promoteToAdmin(promoteToAdminDto);
  }

  // Send invite to user (admin only)
  @Post(':groupId/invite')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async sendInvite(
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupInviteDto,
  ) {
    return this.groupService.sendInvite(
      groupId,
      dto.invitedBy,
      dto.invitedUserId,
    );
  }

  // Respond to invite (accept or decline)
  @Patch('invite/:inviteId/respond')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async respondToInvite(
    @Param('inviteId') inviteId: string,
    @Body('userId') userId: string,
    @Body('status') status: 'accepted' | 'declined',
  ) {
    return this.groupService.respondToInvite(inviteId, userId, status);
  }
}
