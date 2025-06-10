import { IsMongoId, IsNotEmpty } from 'class-validator';

export class SendGroupInviteDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsMongoId()
  @IsNotEmpty()
  invitedUserId: string;
}
