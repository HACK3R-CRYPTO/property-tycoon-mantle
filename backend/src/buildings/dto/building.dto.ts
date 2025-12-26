import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max } from 'class-validator';

export class PlaceBuildingDto {
  @ApiProperty({ example: 'gold_mine', description: 'Building type' })
  @IsString()
  type: string;

  @ApiProperty({ example: 10, description: 'X position on grid (0-39)' })
  @IsInt()
  @Min(0)
  @Max(39)
  positionX: number;

  @ApiProperty({ example: 10, description: 'Y position on grid (0-39)' })
  @IsInt()
  @Min(0)
  @Max(39)
  positionY: number;
}

export class MoveBuildingDto {
  @ApiProperty({ example: 15, description: 'New X position on grid (0-39)' })
  @IsInt()
  @Min(0)
  @Max(39)
  positionX: number;

  @ApiProperty({ example: 15, description: 'New Y position on grid (0-39)' })
  @IsInt()
  @Min(0)
  @Max(39)
  positionY: number;
}
