import { IsMongoId, IsNotEmpty } from 'class-validator';

export class PromoteToAdminDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsMongoId()
  promotedBy: string;

  @IsNotEmpty()
  @IsMongoId()
  memberIdToPromote: string;
}
