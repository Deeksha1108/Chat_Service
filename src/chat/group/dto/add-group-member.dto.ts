import { IsNotEmpty, IsString } from 'class-validator';

export class AddGroupMemberDto {
  @IsNotEmpty()
  @IsString()
  groupId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;
}
