import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // Create a new group
  @Post()
  async createGroup(@Body() dto: CreateGroupDto) {
    const group = await this.groupService.createGroup(dto);
    return { status: 'success', group };
  }

  // Send message to a group
  @Post(':groupId/messages')
  async sendGroupMessage(
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupMessageDto,
  ) {
    const message = await this.groupService.sendGroupMessage(groupId, dto);
    return { status: 'success', message };
  }

  // Get all messages of a group
  @Get(':groupId/messages')
  async getGroupMessages(@Param('groupId') groupId: string) {
    const messages = await this.groupService.getGroupMessages(groupId);
    if (!messages) throw new NotFoundException('Group not found');
    return { status: 'success', messages };
  }

  // Get all groups a user is in
  @Get('user/:userId')
  async getUserGroups(@Param('userId') userId: string) {
    const groups = await this.groupService.getGroupsByUser(userId);
    return { status: 'success', groups };
  }
}
