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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupAdminGuard } from '../auth/guards/group-admin.guard';
import { AuthRequest } from 'express';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
// @UseGuards(JwtAuthGuard)
export class GroupController {
  private readonly logger = new Logger(GroupController.name);

  constructor(private readonly groupService: GroupService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createGroup(@Body() dto: CreateGroupDto, @Req() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.groupService.createGroup(dto, userId);
  }

  // Add member to group (admin only)
  @Post(':groupId/members')
  // @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
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
  // @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async removeMember(
    @Body() dto: RemoveMemberDto,
    @Req() req: AuthRequest & { user: { id: string } },
  ) {
    const userId = req.user['id'];
    return this.groupService.removeMember(dto, userId);
  }

  // Promote member to admin (admin only)
  @Patch(':groupId/admins/:memberId')
  // @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
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
  // @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
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
  async respondToInvite(
    @Param('inviteId') inviteId: string,
    @Body('userId') userId: string,
    @Body('status') status: 'accepted' | 'rejected',
  ) {
    return this.groupService.respondToInvite(inviteId, userId, status);
  }

  @Patch(':groupId/name')
  // @UseGuards(GroupAdminGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
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
  async leaveGroup(@Param('groupId') groupId: string, @Req() req: AuthRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorized');
    return this.groupService.leaveGroup(groupId, userId);
  }
}
