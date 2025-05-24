import { Body, Controller, Post } from '@nestjs/common';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { GroupChatService } from './group.service';

@Controller('groups')
export class GroupChatController {
  constructor(private readonly groupService: GroupChatService) {}

  @Post()
  async createGroup(@Body() createDto: CreateGroupChatDto) {
    return this.groupService.createGroup(createDto);
  }

  @Post('add-member')
  async addMember(
    @Body('groupId') groupId: string,
    @Body('userId') userId: string
  ) {
    return this.groupService.addParticipant(groupId, userId);
  }

  @Post('remove-member')
  async removeMember(
    @Body('groupId') groupId: string,
    @Body('userId') userId: string
  ) {
    return this.groupService.removeParticipant(groupId, userId);
  }
}