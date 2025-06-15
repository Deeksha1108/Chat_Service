import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GroupService } from 'src/chat/group/group.service';
import { AuthRequest } from 'src/types/express';

@Injectable()
export class GroupAdminGuard implements CanActivate {
  constructor(private groupService: GroupService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const userId = request.user?.['id'];
    const groupId =
      request.body?.groupId ||
      request.params?.groupId ||
      request.query?.groupId;

    if (!userId || !groupId) {
      throw new ForbiddenException('Missing user or group ID.');
    }

    const isAdmin = await this.groupService.isAdmin(userId, groupId);
    if (!isAdmin) {
      throw new ForbiddenException(
        'Only group admins can perform this action.',
      );
    }

    return true;
  }
}
