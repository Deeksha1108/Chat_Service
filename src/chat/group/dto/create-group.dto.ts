import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsMongoId,
} from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @ArrayNotEmpty()
  @ArrayUnique()
  @IsArray()
  @ArrayMinSize(2)
  @IsMongoId({ each: true })
  memberIds: string[];

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  @IsMongoId()
  createdBy: string;
}
