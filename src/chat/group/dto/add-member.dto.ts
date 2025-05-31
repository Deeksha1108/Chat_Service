import { IsNotEmpty, IsMongoId } from 'class-validator';

export class AddMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsMongoId()
  addedBy: string;

  @IsNotEmpty()
  @IsMongoId()
  newMemberId: string;
}
