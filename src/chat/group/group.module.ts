import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { GroupGateway } from './group.gateway';

import { Group, GroupSchema } from './schema/group.schema';
import {
  GroupMessage,
  GroupMessageSchema,
} from './schema/group-message.schema';
import { GroupInvite, GroupInviteSchema } from './schema/group-invite.schema';

import { GroupAdminGuard } from '../auth/guards/group-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SocketModule } from 'src/socket/socket.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMessage.name, schema: GroupMessageSchema },
      { name: GroupInvite.name, schema: GroupInviteSchema },
    ]),
    JwtModule.register({}),
    SocketModule,
    RedisModule,
  ],
  providers: [GroupService, GroupGateway, GroupAdminGuard, JwtAuthGuard],
  controllers: [GroupController],
})
export class GroupModule {}
