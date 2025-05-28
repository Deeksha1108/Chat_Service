import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @ArrayNotEmpty()
  @ArrayUnique()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  members: string[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
