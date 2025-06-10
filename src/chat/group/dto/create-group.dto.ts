import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsMongoId,
  IsOptional,
} from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ArrayNotEmpty()
  @ArrayUnique()
  @IsArray()
  @ArrayMinSize(2)
  @IsMongoId({ each: true })
  members: string[];
}
