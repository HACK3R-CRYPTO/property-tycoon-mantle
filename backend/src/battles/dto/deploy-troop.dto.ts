import { IsEnum, IsNotEmpty, IsNumber, IsObject, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TroopType } from '../../common/config/troops.config';

class PositionDto {
  @IsNumber()
  @Min(0)
  @Max(79)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(39)
  y: number;
}

export class DeployTroopDto {
  @IsEnum(TroopType)
  @IsNotEmpty()
  troopType: TroopType;

  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  @IsNotEmpty()
  position: PositionDto;
}
