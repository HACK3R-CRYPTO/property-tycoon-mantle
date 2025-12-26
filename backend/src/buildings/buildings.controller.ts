import { Controller, Get, Post, Put, Delete, UseGuards, Req, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VillagesService } from '../villages/villages.service';
import { PlaceBuildingDto, MoveBuildingDto } from './dto/building.dto';
import { BUILDING_CONFIGS } from '../common/config/buildings.config';

@ApiTags('buildings')
@Controller('buildings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BuildingsController {
  constructor(
    private buildingsService: BuildingsService,
    private villagesService: VillagesService,
  ) {}

  @Get('configs')
  @ApiOperation({ summary: 'Get all building configurations' })
  @ApiResponse({ status: 200, description: 'Building configurations retrieved' })
  getBuildingConfigs() {
    return BUILDING_CONFIGS;
  }

  @Post('add-starter-buildings')
  @ApiOperation({
    summary: 'Add starter buildings to current village (migration helper)',
  })
  @ApiResponse({ status: 200, description: 'Starter buildings added' })
  async addStarterBuildings(@Req() req) {
    const village = await this.villagesService.findByUserId(req.user.userId);
    if (!village) {
      return { message: 'Village not found', buildingsAdded: 0 };
    }

    const buildingsAdded = await this.buildingsService.addStarterBuildingsToVillage(village.id);

    return {
      message: `Added ${buildingsAdded} starter buildings to your village`,
      buildingsAdded,
    };
  }

  @Post('fix-collector-capacities')
  @ApiOperation({
    summary: 'Fix collector internal storage capacities (migration helper)',
  })
  @ApiResponse({ status: 200, description: 'Collector capacities updated' })
  async fixCollectorCapacities() {
    const result = await this.buildingsService.fixCollectorCapacities();
    return {
      message: 'All collector buildings updated with correct capacities',
      result,
    };
  }

  @Post('place')
  @ApiOperation({ summary: 'Place a new building in the village' })
  @ApiResponse({ status: 201, description: 'Building placed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid placement or insufficient resources' })
  async placeBuilding(@Req() req, @Body() placeBuildingDto: PlaceBuildingDto) {
    const village = await this.villagesService.findByUserId(req.user.userId);
    if (!village) {
      return { message: 'Village not found' };
    }

    const building = await this.buildingsService.placeBuilding(
      village.id,
      placeBuildingDto.type,
      placeBuildingDto.positionX,
      placeBuildingDto.positionY,
    );

    return {
      message: 'Building placed successfully',
      building,
    };
  }

  @Put(':id/move')
  @ApiOperation({ summary: 'Move an existing building to a new position' })
  @ApiResponse({ status: 200, description: 'Building moved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid placement' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async moveBuilding(@Param('id') id: string, @Body() moveBuildingDto: MoveBuildingDto) {
    const building = await this.buildingsService.moveBuilding(
      id,
      moveBuildingDto.positionX,
      moveBuildingDto.positionY,
    );

    return {
      message: 'Building moved successfully',
      building,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a building from the village' })
  @ApiResponse({ status: 200, description: 'Building deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete Town Hall' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async deleteBuilding(@Req() req, @Param('id') id: string) {
    const village = await this.villagesService.findByUserId(req.user.userId);
    if (!village) {
      return { message: 'Village not found' };
    }

    await this.buildingsService.deleteBuilding(id, village.id);

    return {
      message: 'Building deleted successfully',
    };
  }
}
