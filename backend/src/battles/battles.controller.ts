import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattlesService } from './battles.service';
import { TroopType, TROOP_CONFIGS } from '../common/config/troops.config';
import { AttackDto } from './dto/attack.dto';
import { DeployTroopDto } from './dto/deploy-troop.dto';
import { BattleSessionManager } from './battle-session.manager';

@Controller('battles')
export class BattlesController {
  constructor(
    private readonly battlesService: BattlesService,
    private readonly battleSessionManager: BattleSessionManager,
  ) {}

  /**
   * Cleanup stale battles every 5 minutes
   * Marks battles as 'completed' if their session no longer exists
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStaleBattleCleanup() {
    console.log('Running stale battle cleanup...');
    await this.battlesService.cleanupStaleBattles();
  }

  /**
   * GET /battles/public/recent
   * Get recent battles (public, no auth required)
   * For landing page spectator view
   */
  @Get('public/recent')
  async getRecentBattles(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const battles = await this.battlesService.getAllRecentBattles(limitNum);

    return {
      battles: battles.map((battle) => ({
        id: battle.id,
        attackerVillage: battle.attackerVillage,
        defenderVillage: battle.defenderVillage,
        attackerTroops: battle.attackerTroops,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }

  /**
   * POST /battles/attack
   * Start an attack against a defender village
   */
  @Post('attack')
  @UseGuards(JwtAuthGuard)
  async attack(@Request() req, @Body() attackDto: AttackDto) {
    const attackerVillageId = req.user.villageId;

    if (!attackDto.defenderId || !attackDto.troops || attackDto.troops.length === 0) {
      throw new BadRequestException('Invalid attack data: defenderId and troops are required');
    }

    // Validate troop types
    for (const troop of attackDto.troops) {
      if (!Object.values(TroopType).includes(troop.type)) {
        throw new BadRequestException(`Invalid troop type: ${troop.type}`);
      }
      if (troop.count <= 0) {
        throw new BadRequestException(`Troop count must be positive: ${troop.type}`);
      }
    }

    // TODO: Validate that attacker has these troops available
    // TODO: Deduct troops from attacker's army

    const battle = await this.battlesService.createBattle(
      attackerVillageId,
      attackDto.defenderId,
      attackDto.troops,
    );

    return {
      message: 'Battle completed',
      battle: {
        id: battle.id,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        createdAt: battle.createdAt,
      },
    };
  }

  /**
   * POST /battles/start
   * Start a real-time battle session
   */
  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startBattle(
    @Request() req,
    @Body() body: { defenderId: string; troops: { type: TroopType; count: number }[] },
  ) {
    const userId = req.user.userId;
    const attackerVillageId = req.user.villageId;

    console.log('Starting battle:', { userId, attackerVillageId, defenderId: body.defenderId });

    if (!body.defenderId || !body.troops || body.troops.length === 0) {
      throw new BadRequestException('Invalid battle data: defenderId and troops are required');
    }

    // Validate troop types
    for (const troop of body.troops) {
      if (!Object.values(TroopType).includes(troop.type)) {
        throw new BadRequestException(`Invalid troop type: ${troop.type}`);
      }
      if (troop.count <= 0) {
        throw new BadRequestException(`Troop count must be positive: ${troop.type}`);
      }
    }

    const result = await this.battlesService.startBattle(
      userId,
      attackerVillageId,
      body.defenderId,
      body.troops,
    );

    return {
      message: 'Battle session created',
      ...result,
    };
  }

  /**
   * POST /battles/:battleId/deploy
   * Deploy a troop during an active battle (REST API for troop deployment)
   */
  @Post(':battleId/deploy')
  @UseGuards(JwtAuthGuard)
  async deployTroop(
    @Request() req,
    @Param('battleId') battleId: string,
    @Body() deployDto: DeployTroopDto,
  ) {
    const userId = req.user.userId;
    const villageId = req.user.villageId;

    console.log(
      `User ${userId} deploying ${deployDto.troopType} at (${deployDto.position.x}, ${deployDto.position.y}) in battle ${battleId}`,
    );

    // Validate battle session exists
    const session = this.battleSessionManager.getSession(battleId);
    if (!session) {
      throw new NotFoundException('Battle session not found or has ended');
    }

    // Enforce that only the attacker can deploy troops (no spectators)
    if (session.attackerVillageId !== villageId) {
      throw new ForbiddenException(
        'Only the attacker can deploy troops. You are spectating this battle.',
      );
    }

    // Double-check user ID matches
    if (session.attackerId !== userId) {
      throw new ForbiddenException('Only the attacker can deploy troops');
    }

    // Validate troop type
    if (!Object.values(TroopType).includes(deployDto.troopType)) {
      throw new BadRequestException(`Invalid troop type: ${deployDto.troopType}`);
    }

    // Get troop configuration
    const troopConfig = TROOP_CONFIGS[deployDto.troopType];
    if (!troopConfig) {
      throw new BadRequestException(`Troop configuration not found for: ${deployDto.troopType}`);
    }

    // Deploy troop via session manager
    const troop = this.battleSessionManager.deployTroop(
      battleId,
      deployDto.troopType,
      deployDto.position,
      {
        health: troopConfig.health,
        damage: troopConfig.damage,
        speed: troopConfig.moveSpeed,
        range: troopConfig.range,
        targetType: 'ground', // For now, all troops target ground
      },
    );

    if (!troop) {
      throw new BadRequestException(
        'Failed to deploy troop. Maximum troop count may have been reached.',
      );
    }

    return {
      message: 'Troop deployed successfully',
      troop: {
        id: troop.id,
        type: troop.type,
        position: troop.position,
      },
    };
  }

  /**
   * GET /battles/find-opponent
   * Find a random opponent to attack
   */
  @Get('find-opponent')
  @UseGuards(JwtAuthGuard)
  async findOpponent(@Request() req) {
    const villageId = req.user.villageId;

    console.log('Find opponent - villageId:', villageId);
    console.log('Find opponent - user:', req.user);

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const opponentId = await this.battlesService.findRandomOpponent(villageId);

    if (!opponentId) {
      throw new NotFoundException('No opponents found');
    }

    // TODO: Load opponent village details (buildings, resources, etc.)
    return {
      opponentVillageId: opponentId,
      message: 'Opponent found',
    };
  }

  /**
   * GET /battles/defenses
   * Get defense history for the current user (attacks against user's village)
   */
  @Get('defenses')
  @UseGuards(JwtAuthGuard)
  async getDefenses(@Request() req, @Query('limit') limit?: string) {
    const villageId = req.user.villageId;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    console.log('getDefenses - villageId:', villageId, 'limit:', limitNum);

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const history = await this.battlesService.getDefenseHistory(villageId, limitNum);

    return {
      battles: history.map((battle) => ({
        id: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }

  /**
   * GET /battles/active
   * Get user's active/ongoing battles they can rejoin
   */
  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActiveBattles(@Request() req) {
    const villageId = req.user.villageId;

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const activeBattles = await this.battlesService.getActiveBattlesForUser(villageId);

    return {
      battles: activeBattles.map((battle) => ({
        id: battle.id,
        attackerVillage: battle.attackerVillage,
        defenderVillage: battle.defenderVillage,
        attackerTroops: battle.attackerTroops,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }

  /**
   * GET /battles/session/:sessionId
   * Get battle session details by session ID (for rejoining battles)
   */
  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getBattleSession(@Request() req, @Param('sessionId') sessionId: string) {
    const userId = req.user.userId;

    const sessionData = await this.battlesService.getBattleSessionById(sessionId, userId);

    if (!sessionData) {
      throw new NotFoundException('Battle session not found or has ended');
    }

    return sessionData;
  }

  /**
   * GET /battles/:id
   * Get battle details and replay data
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getBattle(@Request() req, @Param('id') battleId: string) {
    const battle = await this.battlesService.getBattleById(battleId);

    if (!battle) {
      throw new NotFoundException('Battle not found');
    }

    // Ensure user has access to this battle (either attacker or defender)
    const userVillageId = req.user.villageId;
    if (battle.attackerId !== userVillageId && battle.defenderId !== userVillageId) {
      throw new NotFoundException('Battle not found');
    }

    return {
      battle: {
        id: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        attackerTroops: battle.attackerTroops,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        battleLog: battle.battleLog,
        createdAt: battle.createdAt,
      },
    };
  }

  /**
   * GET /battles
   * Get battle history for the current user (attacks made by user)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req, @Query('limit') limit?: string) {
    const villageId = req.user.villageId;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    console.log('getHistory - villageId:', villageId, 'limit:', limitNum);
    console.log('getHistory - user:', req.user);

    if (!villageId) {
      throw new BadRequestException('Village ID not found in user session');
    }

    const history = await this.battlesService.getBattleHistory(villageId, limitNum);

    return {
      battles: history.map((battle) => ({
        id: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        destructionPercentage: battle.destructionPercentage,
        stars: battle.stars,
        lootGold: battle.lootGold,
        lootElixir: battle.lootElixir,
        status: battle.status,
        createdAt: battle.createdAt,
      })),
    };
  }
}
