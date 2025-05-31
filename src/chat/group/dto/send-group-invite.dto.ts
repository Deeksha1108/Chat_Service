import { IsMongoId } from 'class-validator';

export class SendGroupInviteDto {
  @IsMongoId()
  invitedBy: string;

  @IsMongoId()
  invitedUserId: string;
}
