import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { Group, GroupSchema } from './schema/group.schema';
import { GroupMessage, GroupMessageSchema } from './schema/group-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMessage.name, schema: GroupMessageSchema },
    ]),
  ],
  providers: [GroupService],
  controllers: [GroupController],
  // exports: [GroupService],
})
export class GroupModule {}
