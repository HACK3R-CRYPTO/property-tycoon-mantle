import { IsEnum } from 'class-validator';
import { TroopType } from '../../common/config/troops.config';

export class TrainTroopDto {
  @IsEnum(TroopType)
  troopType: TroopType;
}
