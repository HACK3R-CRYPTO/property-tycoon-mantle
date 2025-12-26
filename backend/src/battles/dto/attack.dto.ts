import { IsString, IsArray, ValidateNested, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TroopType } from '../../common/config/troops.config';

class TroopDto {
  @IsEnum(TroopType)
  type: TroopType;

  @IsNumber()
  @IsNotEmpty()
  count: number;
}

export class AttackDto {
  @IsString()
  @IsNotEmpty()
  defenderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TroopDto)
  troops: TroopDto[];
}
