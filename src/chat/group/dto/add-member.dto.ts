import { IsNotEmpty, IsMongoId } from 'class-validator';

export class AddMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsMongoId()
  newMemberId: string;
}
