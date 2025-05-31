import { IsMongoId, IsNotEmpty } from 'class-validator';

export class RemoveMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsMongoId()
  memberIdToRemove: string;
}
