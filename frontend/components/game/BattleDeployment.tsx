'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Container, Graphics, Text, Sprite, Assets } from 'pixi.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BattleBuilding, BattleSession } from '@/lib/api/battles';
import {
  connectSpectateSocket,
  disconnectSpectateSocket,
  joinBattleAsSpectator,
  leaveSpectatorBattle,
  onSpectateEvent,
  onSpectateEnd,
  offSpectateEvent,
  offSpectateEnd,
  BattleEvent,
} from '@/lib/socket';
import { battlesApi } from '@/lib/api/battles';
import { Sword, Shield, Target, X } from 'lucide-react';

interface BattleDeploymentProps {
  battleSession: BattleSession;
  troops: { type: string; count: number }[];
  userVillageId: string;
  onBattleEnd: (result: any) => void;
  onCancel: () => void;
}

// Troop rendering data
interface TroopSprite {
  id: string;
  type: string;
  sprite: Container;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  healthBar?: Graphics;
}

// Building rendering data
interface BuildingSprite {
  id: string;
  type: string;
  sprite: Container;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  healthBar?: Graphics;
}

// Grid and rendering constants
const GRID_SIZE = 40;
const TILE_SIZE = 20;
const CANVAS_WIDTH = GRID_SIZE * TILE_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * TILE_SIZE;

export function BattleDeployment({
  battleSession,
  troops,
  userVillageId,
  onBattleEnd: onBattleComplete,
  onCancel,
}: BattleDeploymentProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const buildingsLayerRef = useRef<Container | null>(null);
  const troopsLayerRef = useRef<Container | null>(null);
  const effectsLayerRef = useRef<Container | null>(null);

  const [selectedTroopType, setSelectedTroopType] = useState<string | null>(troops[0]?.type || null);
  const [deployedCounts, setDeployedCounts] = useState<Record<string, number>>({});
  const [battleStarted, setBattleStarted] = useState(false);
  const [destructionPercentage, setDestructionPercentage] = useState(0);
  const [battleStatus, setBattleStatus] = useState<string>('Deploy your troops!');

  // Store sprites
  const buildingSpritesRef = useRef<Map<string, BuildingSprite>>(new Map());
  const troopSpritesRef = useRef<Map<string, TroopSprite>>(new Map());

  // Initialize Pixi.js canvas
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initPixi = async () => {
      // Pixi.js v7 syntax - pass options to constructor
      const app = new Application({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x2d5016, // Grass green
        antialias: true,
      });

      canvasRef.current?.appendChild(app.view as HTMLCanvasElement);
      appRef.current = app;

      // Create layers
      const stage = new Container();
      const buildingsLayer = new Container();
      const troopsLayer = new Container();
      const effectsLayer = new Container();

      stage.addChild(buildingsLayer);
      stage.addChild(troopsLayer);
      stage.addChild(effectsLayer);

      app.stage.addChild(stage);

      stageRef.current = stage;
      buildingsLayerRef.current = buildingsLayer;
      troopsLayerRef.current = troopsLayer;
      effectsLayerRef.current = effectsLayer;

      // Draw grid
      drawGrid(app.stage);

      // Render buildings
      renderBuildings(battleSession.session.buildings, buildingsLayer);

      // Add click handler for troop deployment
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointerdown', handleCanvasClick);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Draw grid
  const drawGrid = (stage: Container) => {
    const grid = new Graphics();
    grid.lineStyle(1, 0x444444, 0.3);

    for (let x = 0; x <= GRID_SIZE; x++) {
      grid.moveTo(x * TILE_SIZE, 0);
      grid.lineTo(x * TILE_SIZE, CANVAS_HEIGHT);
    }

    for (let y = 0; y <= GRID_SIZE; y++) {
      grid.moveTo(0, y * TILE_SIZE);
      grid.lineTo(CANVAS_WIDTH, y * TILE_SIZE);
    }

    stage.addChild(grid);
  };

  // Render buildings on canvas
  const renderBuildings = (buildings: BattleBuilding[], layer: Container) => {
    buildings.forEach((building) => {
      const buildingContainer = new Container();

      // Create building sprite (simple rectangle for now)
      const sprite = new Graphics();
      sprite.beginFill(getBuildingColor(building.type));
      sprite.drawRect(0, 0, 2 * TILE_SIZE, 2 * TILE_SIZE);
      sprite.endFill();

      buildingContainer.addChild(sprite);

      // Add label
      const label = new Text(building.type, {
        fontSize: 10,
        fill: 0xffffff,
      });
      label.position.set(TILE_SIZE, TILE_SIZE);
      label.anchor.set(0.5);
      buildingContainer.addChild(label);

      // Position building
      buildingContainer.position.set(building.position.x * TILE_SIZE, building.position.y * TILE_SIZE);

      layer.addChild(buildingContainer);

      // Create health bar
      const healthBar = createHealthBar(building.health, building.maxHealth);
      healthBar.position.set(building.position.x * TILE_SIZE, (building.position.y - 0.5) * TILE_SIZE);
      layer.addChild(healthBar);

      buildingSpritesRef.current.set(building.id, {
        id: building.id,
        type: building.type,
        sprite: buildingContainer,
        position: building.position,
        health: building.health,
        maxHealth: building.maxHealth,
        healthBar,
      });
    });
  };

  // Get building color based on type
  const getBuildingColor = (type: string): number => {
    switch (type) {
      case 'TOWN_HALL':
        return 0xff6b6b;
      case 'GOLD_MINE':
        return 0xffd700;
      case 'ELIXIR_COLLECTOR':
        return 0x9b59b6;
      case 'ARMY_CAMP':
        return 0x3498db;
      case 'CANNON':
        return 0x95a5a6;
      case 'ARCHER_TOWER':
        return 0x34495e;
      case 'WALL':
        return 0x7f8c8d;
      default:
        return 0xbdc3c7;
    }
  };

  // Create health bar
  const createHealthBar = (health: number, maxHealth: number): Graphics => {
    const healthBar = new Graphics();
    const barWidth = 2 * TILE_SIZE;
    const barHeight = 4;
    const healthPercent = health / maxHealth;

    healthBar.beginFill(0x000000, 0.5);
    healthBar.drawRect(0, 0, barWidth, barHeight);
    healthBar.endFill();

    healthBar.beginFill(healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c);
    healthBar.drawRect(0, 0, barWidth * healthPercent, barHeight);
    healthBar.endFill();

    return healthBar;
  };

  // Handle canvas click for troop deployment
  const handleCanvasClick = useCallback(
    (event: any) => {
      if (!selectedTroopType || !battleSession) return;

      const troopConfig = troops.find((t) => t.type === selectedTroopType);
      if (!troopConfig) return;

      const deployed = deployedCounts[selectedTroopType] || 0;
      if (deployed >= troopConfig.count) {
        setBattleStatus(`No more ${selectedTroopType} available!`);
        return;
      }

      const pos = event.data.global;
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);

      // Deploy troop via REST API
      battlesApi.deployTroop(battleSession.battleId, selectedTroopType, { x: gridX, y: gridY })
        .then((response) => {
          setDeployedCounts((prev) => ({
            ...prev,
            [selectedTroopType]: (prev[selectedTroopType] || 0) + 1,
          }));

          setBattleStarted(true);
          setBattleStatus(`Deployed ${selectedTroopType} at (${gridX}, ${gridY})`);
        })
        .catch((error) => {
          console.error('Failed to deploy troop:', error);
          setBattleStatus(`Failed to deploy ${selectedTroopType}`);
        });
    },
    [selectedTroopType, battleSession, troops, deployedCounts]
  );

  // Connect to WebSocket and join battle (using spectate socket for events)
  useEffect(() => {
    const socket = connectSpectateSocket();

    // Join battle as spectator for event streaming
    joinBattleAsSpectator(battleSession.battleId)
      .then(() => {
        console.log('Joined battle room via spectate socket');
      })
      .catch((error) => {
        console.error('Failed to join battle:', error);
      });

    return () => {
      leaveSpectatorBattle().catch(console.error);
      disconnectSpectateSocket();
    };
  }, [battleSession.battleId, userVillageId]);

  // Listen to battle events
  useEffect(() => {
    const handleBattleEvent = (event: BattleEvent) => {
      console.log('Battle event:', event);

      switch (event.type) {
        case 'TROOP_SPAWN':
          handleTroopSpawn(event.data);
          break;
        case 'TROOP_MOVE':
          handleTroopMove(event.data);
          break;
        case 'TROOP_ATTACK':
          handleTroopAttacked(event.data);
          break;
        case 'TROOP_DEATH':
          handleTroopDeath(event.data);
          break;
        case 'BUILDING_ATTACK':
          handleBuildingAttack(event.data);
          break;
        case 'BUILDING_DESTROYED':
          handleBuildingDestroyed(event.data);
          break;
      }
    };

    const handleBattleEndEvent = (result: any) => {
      console.log('Battle ended:', result);
      setBattleStatus(`Battle Over! ${result.stars} Stars - ${result.destructionPercentage}% Destruction`);
      setDestructionPercentage(result.destructionPercentage);

      setTimeout(() => {
        onBattleComplete(result);
      }, 3000);
    };

    onSpectateEvent(handleBattleEvent);
    onSpectateEnd(handleBattleEndEvent);

    return () => {
      offSpectateEvent(handleBattleEvent);
      offSpectateEnd(handleBattleEndEvent);
    };
  }, [onBattleComplete]);

  // Handle troop spawn event
  const handleTroopSpawn = (data: any) => {
    if (!troopsLayerRef.current) return;

    const troopContainer = new Container();

    // Create troop sprite (simple circle for now)
    const sprite = new Graphics();
    sprite.beginFill(getTroopColor(data.troopType));
    sprite.drawCircle(0, 0, TILE_SIZE / 3);
    sprite.endFill();

    troopContainer.addChild(sprite);

    // Position troop
    troopContainer.position.set(data.position.x * TILE_SIZE, data.position.y * TILE_SIZE);

    troopsLayerRef.current.addChild(troopContainer);

    // Create health bar
    const healthBar = createHealthBar(data.health, data.health);
    healthBar.position.set(data.position.x * TILE_SIZE - TILE_SIZE / 2, (data.position.y - 0.5) * TILE_SIZE);
    troopsLayerRef.current.addChild(healthBar);

    troopSpritesRef.current.set(data.troopId, {
      id: data.troopId,
      type: data.troopType,
      sprite: troopContainer,
      position: data.position,
      health: data.health,
      maxHealth: data.health,
      healthBar,
    });
  };

  // Get troop color based on type
  const getTroopColor = (type: string): number => {
    switch (type) {
      case 'BARBARIAN':
        return 0xff6b6b;
      case 'ARCHER':
        return 0x9b59b6;
      case 'GIANT':
        return 0x3498db;
      default:
        return 0x95a5a6;
    }
  };

  // Handle troop move event
  const handleTroopMove = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    // Animate movement (simple for now)
    troopSprite.sprite.position.set(data.to.x * TILE_SIZE, data.to.y * TILE_SIZE);
    troopSprite.position = data.to;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.position.set(data.to.x * TILE_SIZE - TILE_SIZE / 2, (data.to.y - 0.5) * TILE_SIZE);
    }
  };

  // Handle building attack event
  const handleBuildingAttack = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    buildingSprite.health = data.remainingHealth;

    // Update health bar
    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.clear();
      const barWidth = 2 * TILE_SIZE;
      const barHeight = 4;
      const healthPercent = buildingSprite.health / buildingSprite.maxHealth;

      buildingSprite.healthBar.beginFill(0x000000, 0.5);
      buildingSprite.healthBar.drawRect(0, 0, barWidth, barHeight);
      buildingSprite.healthBar.endFill();

      buildingSprite.healthBar.beginFill(
        healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c
      );
      buildingSprite.healthBar.drawRect(0, 0, barWidth * healthPercent, barHeight);
      buildingSprite.healthBar.endFill();
    }

    // Add projectile effect if data includes projectile info
    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to);
    }
  };

  // Handle troop attacked event
  const handleTroopAttacked = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.health = data.remainingHealth;

    // Update health bar
    if (troopSprite.healthBar) {
      troopSprite.healthBar.clear();
      const barWidth = TILE_SIZE;
      const barHeight = 4;
      const healthPercent = troopSprite.health / troopSprite.maxHealth;

      troopSprite.healthBar.beginFill(0x000000, 0.5);
      troopSprite.healthBar.drawRect(0, 0, barWidth, barHeight);
      troopSprite.healthBar.endFill();

      troopSprite.healthBar.beginFill(
        healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c
      );
      troopSprite.healthBar.drawRect(0, 0, barWidth * healthPercent, barHeight);
      troopSprite.healthBar.endFill();
    }

    // Add projectile effect
    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to);
    }
  };

  // Handle building destroyed event
  const handleBuildingDestroyed = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    // Create explosion effect
    createExplosion(data.position);

    // Remove building sprite
    buildingSprite.sprite.alpha = 0.3;
    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.visible = false;
    }
  };

  // Handle troop death event
  const handleTroopDeath = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    // Create small explosion
    createExplosion(data.position, 0.5);

    // Remove troop sprite
    troopSprite.sprite.destroy();
    if (troopSprite.healthBar) {
      troopSprite.healthBar.destroy();
    }
    troopSpritesRef.current.delete(data.troopId);
  };

  // Create projectile effect
  const createProjectile = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (!effectsLayerRef.current) return;

    const projectile = new Graphics();
    projectile.beginFill(0xffff00);
    projectile.drawCircle(0, 0, 3);
    projectile.endFill();

    projectile.position.set(from.x * TILE_SIZE, from.y * TILE_SIZE);
    effectsLayerRef.current.addChild(projectile);

    // Animate projectile (simple linear interpolation)
    const duration = 200; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      projectile.position.set(
        (from.x + (to.x - from.x) * progress) * TILE_SIZE,
        (from.y + (to.y - from.y) * progress) * TILE_SIZE
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        projectile.destroy();
      }
    };

    animate();
  };

  // Create explosion effect
  const createExplosion = (position: { x: number; y: number }, scale: number = 1) => {
    if (!effectsLayerRef.current) return;

    const explosion = new Graphics();
    explosion.beginFill(0xff4500, 0.8);
    explosion.drawCircle(0, 0, TILE_SIZE * scale);
    explosion.endFill();

    explosion.position.set(position.x * TILE_SIZE, position.y * TILE_SIZE);
    effectsLayerRef.current.addChild(explosion);

    // Fade out explosion
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      explosion.alpha = 1 - progress;
      explosion.scale.set(1 + progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        explosion.destroy();
      }
    };

    animate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl bg-slate-900 border-slate-700">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sword className="w-6 h-6 text-red-500" />
                Battle Deployment
              </h2>
              <p className="text-sm text-slate-400 mt-1">{battleStatus}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Canvas */}
          <div className="bg-slate-800 rounded-lg p-4 flex justify-center">
            <div
              ref={canvasRef}
              className="border-2 border-slate-700 rounded"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            />
          </div>

          {/* Troop Selection */}
          <div className="flex gap-2 flex-wrap">
            {troops.map((troop) => {
              const deployed = deployedCounts[troop.type] || 0;
              const remaining = troop.count - deployed;

              return (
                <Button
                  key={troop.type}
                  variant={selectedTroopType === troop.type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTroopType(troop.type)}
                  disabled={remaining === 0}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  {troop.type}: {remaining}/{troop.count}
                </Button>
              );
            })}
          </div>

          {/* Battle Info */}
          <div className="flex gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Battle ID: {battleSession.battleId.slice(0, 8)}</span>
            </div>
            {battleStarted && (
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-red-500" />
                <span>Destruction: {destructionPercentage}%</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
