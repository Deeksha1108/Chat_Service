import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { Group, GroupSchema } from './schema/group.schema';
import {
  GroupMessage,
  GroupMessageSchema,
} from './schema/group-message.schema';
import { GroupInvite, GroupInviteSchema } from './schema/group-invite.schema';
import { GroupGateway } from './group.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMessage.name, schema: GroupMessageSchema },
      { name: GroupInvite.name, schema: GroupInviteSchema },
    ]),
  ],
  providers: [GroupService, GroupGateway],
  controllers: [GroupController],
})
export class GroupModule {}
