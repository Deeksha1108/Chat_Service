import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class UpdateGroupDto {
  @IsMongoId()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  newName: string;
}
