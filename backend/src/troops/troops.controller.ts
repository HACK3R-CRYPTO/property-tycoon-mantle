import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TroopsService } from './troops.service';
import { TrainTroopDto } from './dto/train-troop.dto';
import { getAllTroopTypes, getTroopConfig } from '../common/config/troops.config';

@Controller('troops')
@UseGuards(JwtAuthGuard)
export class TroopsController {
  constructor(private readonly troopsService: TroopsService) {}

  /**
   * Get all available troop types and their stats
   */
  @Get('available')
  getAvailableTroops() {
    const troopTypes = getAllTroopTypes();
    return troopTypes.map(type => getTroopConfig(type));
  }

  /**
   * Train a new troop
   */
  @Post('train')
  async trainTroop(@Request() req, @Body() dto: TrainTroopDto) {
    return this.troopsService.trainTroop(req.user.userId, dto);
  }

  /**
   * Get training queue
   */
  @Get('queue')
  async getTrainingQueue(@Request() req) {
    return this.troopsService.getTrainingQueue(req.user.userId);
  }

  /**
   * Get user's army
   */
  @Get('army')
  async getArmy(@Request() req) {
    return this.troopsService.getArmy(req.user.userId, true);
  }

  /**
   * Cancel a training
   */
  @Delete('queue/:id')
  async cancelTraining(@Request() req, @Param('id') trainingId: string) {
    return this.troopsService.cancelTraining(req.user.userId, trainingId);
  }
}
