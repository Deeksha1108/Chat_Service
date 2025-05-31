import { IsMongoId, IsNotEmpty } from 'class-validator';

export class LeaveGroupDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsMongoId()
  userId: string;
}
