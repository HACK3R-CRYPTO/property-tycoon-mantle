'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Application, Container, Graphics, Text, Sprite as PIXISprite } from 'pixi.js';
import { Button } from '@/components/ui/button';
import { battlesApi, PublicBattle } from '@/lib/api/battles';
import { useAuthStore } from '@/lib/stores';
import {
  connectSpectateSocket,
  disconnectSpectateSocket,
  joinBattleAsSpectator,
  leaveSpectatorBattle,
  onSpectateEvent,
  onSpectateEventBatch,
  onSpectateEnd,
  offSpectateEvent,
  offSpectateEventBatch,
  offSpectateEnd,
  BattleEvent,
} from '@/lib/socket';
import { ArrowLeft, Eye, Clock, Star, Trophy, Flame, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BUILDING_CONFIGS, BuildingType } from '@/lib/config/buildingsData';
import { SpriteManager } from '@/lib/game/SpriteManager';
import { getBuildingSprite, CRITICAL_ASSETS } from '@/lib/config/spriteAssets';
import { motion } from 'framer-motion';

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
  width: number;
}

// Grid and rendering constants - UPDATED TO MATCH VILLAGE
const GRID_WIDTH = 80;
const GRID_HEIGHT = 40;
const TILE_SIZE = 15;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export default function SpectateBattlePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const battleId = params.id as string;
  const returnTo = searchParams.get('returnTo') || '/';
  const { isAuthenticated } = useAuthStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const buildingsLayerRef = useRef<Container | null>(null);
  const troopsLayerRef = useRef<Container | null>(null);
  const effectsLayerRef = useRef<Container | null>(null);

  // Event queue for sequential processing
  const eventQueue = useRef<BattleEvent[]>([]);
  const isProcessingRef = useRef(false);

  const [battle, setBattle] = useState<PublicBattle | null>(null);
  const [battleStatus, setBattleStatus] = useState<string>('Loading battle...');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [destructionPercentage, setDestructionPercentage] = useState(0);
  const [stars, setStars] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Store sprites
  const buildingSpritesRef = useRef<Map<string, BuildingSprite>>(new Map());
  const troopSpritesRef = useRef<Map<string, TroopSprite>>(new Map());

  // Preload sprites on mount
  useEffect(() => {
    const preloadSprites = async () => {
      try {
        await SpriteManager.preloadAssets(CRITICAL_ASSETS);
        setSpritesLoaded(true);
      } catch (error) {
        console.error('Error preloading spectate sprites:', error);
        setSpritesLoaded(true);
      }
    };
    preloadSprites();
  }, []);

  // Load battle data
  useEffect(() => {
    if (!battleId) return;

    const loadBattle = async () => {
      try {
        const data = await battlesApi.getRecentBattles(100);
        const battleData = data.battles.find((b) => b.id === battleId);

        if (!battleData) {
          setBattleStatus('Battle not found');
          return;
        }

        setBattle(battleData);
        setDestructionPercentage(battleData.destructionPercentage || 0);
        setStars(battleData.stars || 0);

        if (battleData.status === 'completed') {
          setBattleStatus(`Battle ended ${formatDistanceToNow(new Date(battleData.createdAt), { addSuffix: true })}`);
        } else {
          setBattleStatus('Connecting to live battle...');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load battle:', error);
        setBattleStatus('Failed to load battle');
        setIsLoading(false);
      }
    };

    loadBattle();
  }, [battleId]);

  // Initialize Pixi.js canvas
  useEffect(() => {
    if (!canvasRef.current || appRef.current || !battle) return;

    const app = new Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x1a1a1a,
      antialias: true,
    });

    canvasRef.current?.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const buildingsLayer = new Container();
    const troopsLayer = new Container();
    const effectsLayer = new Container();

    app.stage.addChild(buildingsLayer);
    app.stage.addChild(troopsLayer);
    app.stage.addChild(effectsLayer);

    buildingsLayerRef.current = buildingsLayer;
    troopsLayerRef.current = troopsLayer;
    effectsLayerRef.current = effectsLayer;

    drawGrid(app.stage);

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [battle]);

  // Draw grid
  const drawGrid = (stage: Container) => {
    const grid = new Graphics();
    grid.lineStyle(1, 0x333333, 0.2);

    for (let x = 0; x <= GRID_WIDTH; x++) {
      grid.moveTo(x * TILE_SIZE, 0);
      grid.lineTo(x * TILE_SIZE, CANVAS_HEIGHT);
    }

    for (let y = 0; y <= GRID_HEIGHT; y++) {
      grid.moveTo(0, y * TILE_SIZE);
      grid.lineTo(CANVAS_WIDTH, y * TILE_SIZE);
    }

    stage.addChild(grid);
  };

  const getBuildingColor = (type: string): number => {
    switch (type.toUpperCase()) {
      case 'TOWN_HALL': return 0xff6b6b;
      case 'GOLD_MINE': return 0xffd700;
      case 'ELIXIR_COLLECTOR': return 0x9b59b6;
      case 'ARMY_CAMP': return 0x3498db;
      case 'CANNON': return 0x95a5a6;
      case 'ARCHER_TOWER': return 0x34495e;
      case 'WALL': return 0x8B4513; // Saddle brown - matches village mode
      default: return 0xbdc3c7;
    }
  };

  const getTroopColor = (type: string): number => {
    switch (type) {
      case 'BARBARIAN': return 0xff6b6b;
      case 'ARCHER': return 0x9b59b6;
      case 'GIANT': return 0x3498db;
      default: return 0x95a5a6;
    }
  };

  const createHealthBar = (health: number, maxHealth: number, width: number): Graphics => {
    const healthBar = new Graphics();
    const barHeight = 3;
    const healthPercent = health / maxHealth;

    healthBar.beginFill(0x000000, 0.5);
    healthBar.drawRect(0, 0, width, barHeight);
    healthBar.endFill();

    healthBar.beginFill(healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c);
    healthBar.drawRect(0, 0, width * healthPercent, barHeight);
    healthBar.endFill();

    return healthBar;
  };

  const renderBuilding = (building: any) => {
    if (!buildingsLayerRef.current) return;

    const buildingContainer = new Container();

    const buildingType = building.type.toLowerCase() as BuildingType;
    const config = BUILDING_CONFIGS[buildingType];
    const buildingWidth = config ? config.size.width * TILE_SIZE : 2 * TILE_SIZE;
    const buildingHeight = config ? config.size.height * TILE_SIZE : 2 * TILE_SIZE;

    const spriteConfig = getBuildingSprite(buildingType);
    const texture = SpriteManager.getTextureSync(spriteConfig.path);

    if (texture && spritesLoaded) {
      const buildingSprite = new PIXISprite(texture);

      const scaleX = buildingWidth / texture.width;
      const scaleY = buildingHeight / texture.height;
      const scale = Math.min(scaleX, scaleY) * (spriteConfig.scaleMultiplier || 1.0);

      buildingSprite.scale.set(scale, scale);
      buildingSprite.anchor.set(spriteConfig.anchor?.x || 0.5, spriteConfig.anchor?.y || 0.5);
      buildingSprite.x = buildingWidth / 2;
      buildingSprite.y = buildingHeight / 2 + (spriteConfig.yOffset || 0);

      buildingContainer.addChild(buildingSprite);
    } else {
      const sprite = new Graphics();
      sprite.beginFill(getBuildingColor(building.type));
      sprite.drawRect(0, 0, buildingWidth, buildingHeight);
      sprite.endFill();
      sprite.lineStyle(1, 0x000000, 0.5);
      sprite.drawRect(0, 0, buildingWidth, buildingHeight);
      buildingContainer.addChild(sprite);
    }

    // Only add labels to non-wall buildings
    if (building.type.toLowerCase() !== 'wall') {
      const label = new Text(building.type.replace(/_/g, ' '), {
        fontSize: 8,
        fill: 0xffffff,
      });
      label.position.set(buildingWidth / 2, buildingHeight / 2);
      label.anchor.set(0.5);
      buildingContainer.addChild(label);
    }

    buildingContainer.position.set(building.position.x * TILE_SIZE, building.position.y * TILE_SIZE);
    buildingsLayerRef.current.addChild(buildingContainer);

    // Check if building is already destroyed (health = 0)
    const isDestroyed = building.health <= 0;

    const healthBar = createHealthBar(building.health, building.maxHealth, buildingWidth);
    healthBar.position.set(building.position.x * TILE_SIZE, (building.position.y - 0.5) * TILE_SIZE);
    buildingsLayerRef.current.addChild(healthBar);

    // Hide health bar and grey out building if destroyed
    if (isDestroyed) {
      buildingContainer.alpha = 0.3;
      healthBar.visible = false;
    }

    buildingSpritesRef.current.set(building.id, {
      id: building.id,
      type: building.type,
      sprite: buildingContainer,
      position: building.position,
      health: building.health,
      maxHealth: building.maxHealth,
      healthBar,
      width: buildingWidth,
    });
  };

  // Battle event handlers
  const handleBattleEvent = useCallback((event: BattleEvent) => {
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
      case 'BUILDING_ATTACK':
        handleBuildingAttack(event.data);
        break;
      case 'BUILDING_DESTROYED':
        handleBuildingDestroyed(event.data);
        break;
      case 'TROOP_DEATH':
        handleTroopDeath(event.data);
        break;
      case 'BATTLE_END':
        handleBattleEnd(event.data);
        break;
    }
  }, []);

  const handleBattleEnd = useCallback((result: any) => {
    setBattleStatus(`Battle ended! ${result.stars} stars - ${result.destructionPercentage}% destruction`);
    setDestructionPercentage(result.destructionPercentage);
    setStars(result.stars);
  }, []);

  const handleTroopSpawn = (data: any) => {
    if (!troopsLayerRef.current) return;

    const troopContainer = new Container();
    const sprite = new Graphics();
    sprite.beginFill(getTroopColor(data.troopType));
    sprite.drawCircle(0, 0, TILE_SIZE / 2.5);
    sprite.endFill();
    sprite.lineStyle(1, 0x000000, 0.5);
    sprite.drawCircle(0, 0, TILE_SIZE / 2.5);

    troopContainer.addChild(sprite);

    const pixelX = data.position.x * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = data.position.y * TILE_SIZE + TILE_SIZE / 2;
    troopContainer.position.set(pixelX, pixelY);

    troopsLayerRef.current.addChild(troopContainer);

    const healthBar = createHealthBar(data.health, data.health, TILE_SIZE);
    healthBar.position.set(data.position.x * TILE_SIZE, (data.position.y - 0.3) * TILE_SIZE);
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

  const handleTroopMove = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) {
      handleTroopSpawn({
        troopId: data.troopId,
        troopType: 'BARBARIAN',
        position: data.to,
        health: 100,
      });
      return;
    }

    troopSprite.sprite.position.set(
      data.to.x * TILE_SIZE + TILE_SIZE / 2,
      data.to.y * TILE_SIZE + TILE_SIZE / 2
    );
    troopSprite.position = data.to;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.position.set(data.to.x * TILE_SIZE, (data.to.y - 0.3) * TILE_SIZE);
    }
  };

  const handleBuildingAttack = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite || !buildingSprite.healthBar) return;

    buildingSprite.health = data.remainingHealth;

    buildingSprite.healthBar.clear();
    const barWidth = buildingSprite.width;
    const barHeight = 3;
    const healthPercent = buildingSprite.health / buildingSprite.maxHealth;

    buildingSprite.healthBar.beginFill(0x000000, 0.5);
    buildingSprite.healthBar.drawRect(0, 0, barWidth, barHeight);
    buildingSprite.healthBar.endFill();

    buildingSprite.healthBar.beginFill(
      healthPercent > 0.5 ? 0x2ecc71 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c
    );
    buildingSprite.healthBar.drawRect(0, 0, barWidth * healthPercent, barHeight);
    buildingSprite.healthBar.endFill();

    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to, data.troopType);
    } else {
      createMeleeEffect(buildingSprite.position);
    }
  };

  const handleTroopAttacked = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.health = data.remainingHealth;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.clear();
      const barWidth = TILE_SIZE;
      const barHeight = 3;
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

    if (data.projectile) {
      createProjectile(data.projectile.from, data.projectile.to);
    }
  };

  const handleBuildingDestroyed = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    buildingSprite.sprite.alpha = 0.3;
    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.visible = false;
    }
  };

  const handleTroopDeath = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.sprite.destroy();
    if (troopSprite.healthBar) {
      troopSprite.healthBar.destroy();
    }
    troopSpritesRef.current.delete(data.troopId);
  };

  const createProjectile = (from: { x: number; y: number }, to: { x: number; y: number }, troopType?: string) => {
    if (!effectsLayerRef.current) return;

    const projectile = new Graphics();

    if (troopType === 'ARCHER') {
      projectile.lineStyle(2, 0x8b4513, 1);
      projectile.moveTo(0, 0);
      projectile.lineTo(8, 0);
      projectile.lineTo(6, -2);
      projectile.moveTo(8, 0);
      projectile.lineTo(6, 2);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      projectile.rotation = Math.atan2(dy, dx);
    } else {
      projectile.beginFill(0xffff00);
      projectile.drawCircle(0, 0, 3);
      projectile.endFill();
    }

    projectile.position.set(from.x * TILE_SIZE + TILE_SIZE / 2, from.y * TILE_SIZE + TILE_SIZE / 2);
    effectsLayerRef.current.addChild(projectile);

    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      projectile.position.set(
        (from.x + (to.x - from.x) * progress) * TILE_SIZE + TILE_SIZE / 2,
        (from.y + (to.y - from.y) * progress) * TILE_SIZE + TILE_SIZE / 2
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        projectile.destroy();
      }
    };

    animate();
  };

  const createMeleeEffect = (position: { x: number; y: number }) => {
    if (!effectsLayerRef.current) return;

    const slash = new Graphics();
    slash.lineStyle(3, 0xff0000, 0.8);
    slash.arc(0, 0, TILE_SIZE, -Math.PI / 4, Math.PI / 4);

    slash.position.set(position.x * TILE_SIZE + TILE_SIZE, position.y * TILE_SIZE + TILE_SIZE);
    effectsLayerRef.current.addChild(slash);

    const duration = 200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      slash.alpha = 1 - progress;
      slash.rotation = progress * Math.PI / 2;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        slash.destroy();
      }
    };

    animate();
  };

  // Connect to WebSocket for live battles
  useEffect(() => {
    if (!battle || battle.status !== 'active') return;

    const socket = connectSpectateSocket();

    // Process events sequentially with delay
    const processNextEvent = () => {
      if (eventQueue.current.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      const event = eventQueue.current.shift()!;
      handleBattleEvent(event);

      // Schedule next event after 100ms
      setTimeout(processNextEvent, 100);
    };

    // Handle batched events - add to queue
    const handleBatchedEvents = (batch: { battleId: string; events: BattleEvent[]; timestamp: number }) => {
      console.log(`[Spectate] Received batch of ${batch.events.length} events`);
      
      // Add all events to the queue
      eventQueue.current.push(...batch.events);

      // Start processing if not already processing
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        processNextEvent();
      }
    };

    onSpectateEventBatch(handleBatchedEvents);
    onSpectateEnd(handleBattleEnd);

    const joinBattleRoom = () => {
      joinBattleAsSpectator(battleId)
        .then((response) => {
          setBattleStatus('Spectating live battle');
          setIsConnected(true);

          if (response.session && response.session.buildings && buildingsLayerRef.current) {
            response.session.buildings.forEach((building: any) => {
              renderBuilding(building);
            });
          }

          if (response.session && response.session.troops && troopsLayerRef.current) {
            response.session.troops.forEach((troop: any) => {
              handleTroopSpawn({
                troopId: troop.id,
                troopType: troop.type,
                position: troop.position,
                health: troop.health,
              });
            });
          }
        })
        .catch((error) => {
          setBattleStatus('Failed to join battle - it may have ended');
          setIsConnected(false);
        });
    };

    if (socket.connected) {
      joinBattleRoom();
    } else {
      socket.on('connect', () => {
        joinBattleRoom();
      });
    }

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      setBattleStatus('Connection failed - battle may have ended');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      // Clear queue on cleanup
      eventQueue.current = [];
      isProcessingRef.current = false;
      
      offSpectateEventBatch(handleBatchedEvents);
      offSpectateEnd(handleBattleEnd);
      leaveSpectatorBattle().catch(console.error);
      disconnectSpectateSocket();
    };
  }, [battle, battleId, handleBattleEvent, handleBattleEnd]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent mb-4"></div>
          <h2 className="text-2xl font-bold text-white">Loading battle...</h2>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Battle not found</h2>
          <Button
            onClick={() => router.push(returnTo)}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {returnTo === '/war-room' || returnTo === '/village' ? 'Back to Village' : 'Return Home'}
          </Button>
        </div>
      </div>
    );
  }

  const isLive = battle.status === 'active';

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Full-screen canvas */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={canvasRef}
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            boxShadow: '0 0 100px rgba(0,0,0,0.8)'
          }}
        />
      </div>

      {/* Floating UI Elements */}

      {/* Top Left - Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-6 left-6 z-50"
      >
        <Button
          onClick={() => router.push(returnTo)}
          className="bg-gray-900/90 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500 text-white hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-amber-500/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </motion.div>

      {/* Top Right - Live Indicator */}
      {isLive && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed top-6 right-6 z-50"
        >
          <div className="bg-gradient-to-br from-red-900/95 to-red-950/95 backdrop-blur-xl rounded-2xl border border-red-500/50 shadow-2xl px-6 py-3 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-200 font-bold uppercase tracking-wide text-sm">Live Battle</span>
          </div>
        </motion.div>
      )}

      {/* Top Center - Battle Info Panel */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl p-4 min-w-[500px]">
          <div className="flex items-center justify-between gap-6">
            {/* Destruction */}
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/30">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Destruction</div>
                <div className="text-2xl font-bold text-white">{destructionPercentage}%</div>
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Stars</div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${star <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {isLive && (
              <div className="flex items-center gap-2 ml-4">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300">{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Bottom - Battle Info */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl p-6 min-w-[600px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
              <Eye className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Spectator Mode</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Attacker */}
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 border border-blue-500/20 rounded-xl p-4">
              <div className="text-xs text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Attacker
              </div>
              <div className="font-bold text-white text-lg mb-1">{battle.attackerVillage.name}</div>
              <div className="text-sm text-gray-400">
                {battle.attackerTroops.reduce((sum, t) => sum + t.count, 0)} troops deployed
              </div>
            </div>

            {/* Defender */}
            <div className="bg-gradient-to-br from-red-900/20 to-red-950/20 border border-red-500/20 rounded-xl p-4">
              <div className="text-xs text-red-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Defender
              </div>
              <div className="font-bold text-white text-lg mb-1">{battle.defenderVillage.name}</div>
              <div className="text-sm text-gray-400">
                Village defense
              </div>
            </div>
          </div>

          {/* Loot info for completed battles */}
          {!isLive && (
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-yellow-500/10 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-300">Gold Looted</span>
                <span className="text-yellow-400 font-bold">🪙 {battle.lootGold.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between bg-purple-500/10 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-300">Elixir Looted</span>
                <span className="text-purple-400 font-bold">💜 {battle.lootElixir.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Status message */}
          <div className="mt-4 pt-4 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              {isLive
                ? 'Watching live battle updates in real-time'
                : `Battle ended ${formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}`
              }
            </p>
          </div>

          {/* Action buttons */}
          {isAuthenticated && (
            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => router.push('/attack')}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg hover:shadow-amber-500/50 transition-all"
              >
                Start Your Battle
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
