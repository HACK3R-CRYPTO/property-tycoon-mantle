"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Application,
  Container,
  Graphics,
  Text,
  Sprite as PIXISprite,
} from "pixi.js";
import { Button } from "@/components/ui/button";
import { BattleBuilding, BattleSession, battlesApi } from "@/lib/api/battles";
import { useAuthStore, useBattleStore, useVillageStore } from "@/lib/stores";
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
  onSpectateEventBatch,
  offSpectateEventBatch,
} from "@/lib/socket";
import { ArrowLeft, Clock, Star, Swords, Trophy, Flame } from "lucide-react";
import { BattleSummary } from "@/components/game/BattleSummary";
import { BUILDING_CONFIGS, BuildingType } from "@/lib/config/buildingsData";
import { SpriteManager } from "@/lib/game/SpriteManager";
import { getBuildingSprite, CRITICAL_ASSETS } from "@/lib/config/spriteAssets";
import { motion, AnimatePresence } from "framer-motion";

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
const TILE_SIZE = 15; // Match village tile size
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export default function BattlePage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, user } = useAuthStore();
  const { village, fetchVillage } = useVillageStore();
  const {
    battleSession: storedBattleSession,
    selectedTroops,
    clearBattle,
  } = useBattleStore();
  const sessionId = params.id as string;
  const villageId = village?.id;

  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const buildingsLayerRef = useRef<Container | null>(null);
  const troopsLayerRef = useRef<Container | null>(null);
  const effectsLayerRef = useRef<Container | null>(null);

  const [battleSession, setBattleSession] = useState<BattleSession | null>(
    null
  );
  const [selectedTroopType, setSelectedTroopType] = useState<string | null>(
    null
  );
  const [deployedCounts, setDeployedCounts] = useState<Record<string, number>>(
    {}
  );
  const [battleStarted, setBattleStarted] = useState(false);
  const [destructionPercentage, setDestructionPercentage] = useState(0);
  const [battleStatus, setBattleStatus] = useState<string>(
    "Connecting to battle server..."
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [battleEndResult, setBattleEndResult] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [battleStartTime, setBattleStartTime] = useState<number | null>(null);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [stars, setStars] = useState(0);
  const [draggedTroop, setDraggedTroop] = useState<{
    type: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Event queue for sequential processing
  const eventQueue = useRef<BattleEvent[]>([]);
  const isProcessingRef = useRef(false);

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
        console.error("Error preloading battle sprites:", error);
        setSpritesLoaded(true);
      }
    };
    preloadSprites();
  }, []);

  // Ensure village is loaded
  useEffect(() => {
    if (!village && isAuthenticated) {
      fetchVillage();
    }
  }, [village, isAuthenticated, fetchVillage]);

  const troops = selectedTroops || battleSession?.troops || [];

  // Load battle session
  useEffect(() => {
    if (!sessionId) {
      router.push("/village");
      return;
    }

    if (battleSession && battleSession.session.id === sessionId) {
      return;
    }

    const loadBattleSession = async () => {
      if (storedBattleSession && storedBattleSession.session.id === sessionId) {
        setBattleSession(storedBattleSession);
        setIsLoading(false);
      } else {
        try {
          const session = await battlesApi.getBattleSession(sessionId);
          setBattleSession(session);
          setIsLoading(false);

          const { setBattleSession: storeSession, setSelectedTroops } =
            useBattleStore.getState();
          storeSession(session);
          if (session.troops && session.troops.length > 0) {
            setSelectedTroops(session.troops);
          }
        } catch (error) {
          console.error("Failed to fetch battle session:", error);
          setBattleStatus("Battle session not found or has ended");
          setIsLoading(false);
        }
      }
    };

    loadBattleSession();
  }, [sessionId]);

  // Initialize Pixi.js canvas
  useEffect(() => {
    if (
      !canvasRef.current ||
      appRef.current ||
      !battleSession ||
      !spritesLoaded
    ) {
      return;
    }

    const initPixi = () => {
      const app = new Application({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1a1a1a, // Dark background
        antialias: true,
      });

      if (canvasRef.current) {
        canvasRef.current.innerHTML = "";
        canvasRef.current.appendChild(app.view as HTMLCanvasElement);
      }

      appRef.current = app;

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

      // Draw subtle grid
      drawGrid(app.stage);

      // Render buildings
      renderBuildings(battleSession.session.buildings, buildingsLayer);

      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, {
          children: true,
          texture: false,
          baseTexture: false,
        });
        appRef.current = null;
      }
      stageRef.current = null;
      buildingsLayerRef.current = null;
      troopsLayerRef.current = null;
      effectsLayerRef.current = null;
      buildingSpritesRef.current.clear();
      troopSpritesRef.current.clear();
    };
  }, [battleSession?.battleId, spritesLoaded]);

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

  // Render buildings
  const renderBuildings = (buildings: BattleBuilding[], layer: Container) => {
    buildings.forEach((building) => {
      const buildingContainer = new Container();

      const buildingType = building.type.toLowerCase() as BuildingType;
      const config = BUILDING_CONFIGS[buildingType];
      const buildingWidth = config
        ? config.size.width * TILE_SIZE
        : 2 * TILE_SIZE;
      const buildingHeight = config
        ? config.size.height * TILE_SIZE
        : 2 * TILE_SIZE;

      const spriteConfig = getBuildingSprite(buildingType);
      const texture = SpriteManager.getTextureSync(spriteConfig.path);

      if (texture && spritesLoaded) {
        const buildingSprite = new PIXISprite(texture);
        const scaleX = buildingWidth / texture.width;
        const scaleY = buildingHeight / texture.height;
        const scale =
          Math.min(scaleX, scaleY) * (spriteConfig.scaleMultiplier || 1.0);

        buildingSprite.scale.set(scale, scale);
        buildingSprite.anchor.set(
          spriteConfig.anchor?.x || 0.5,
          spriteConfig.anchor?.y || 0.5
        );
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
      if (building.type.toLowerCase() !== "wall") {
        const label = new Text(building.type.replace(/_/g, " "), {
          fontSize: 8,
          fill: 0xffffff,
        });
        label.position.set(buildingWidth / 2, buildingHeight / 2);
        label.anchor.set(0.5);
        buildingContainer.addChild(label);
      }

      buildingContainer.position.set(
        building.position.x * TILE_SIZE,
        building.position.y * TILE_SIZE
      );
      layer.addChild(buildingContainer);

      // Check if building is already destroyed (health = 0)
      const isDestroyed = building.health <= 0;

      const healthBar = createHealthBar(
        building.health,
        building.maxHealth,
        buildingWidth
      );
      healthBar.position.set(
        building.position.x * TILE_SIZE,
        (building.position.y - 0.5) * TILE_SIZE
      );

      // Hide health bar and grey out building if destroyed
      if (isDestroyed) {
        buildingContainer.alpha = 0.3;
        healthBar.visible = false;
      }

      layer.addChild(healthBar);

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
    });
  };

  const getBuildingColor = (type: string): number => {
    switch (type.toUpperCase()) {
      case "TOWN_HALL":
        return 0xff6b6b;
      case "GOLD_MINE":
        return 0xffd700;
      case "ELIXIR_COLLECTOR":
        return 0x9b59b6;
      case "ARMY_CAMP":
        return 0x3498db;
      case "CANNON":
        return 0x95a5a6;
      case "ARCHER_TOWER":
        return 0x34495e;
      case "WALL":
        return 0x8b4513; // Saddle brown - matches village mode
      default:
        return 0xbdc3c7;
    }
  };

  const createHealthBar = (
    health: number,
    maxHealth: number,
    width: number
  ): Graphics => {
    const healthBar = new Graphics();
    const barHeight = 3;
    const healthPercent = health / maxHealth;

    healthBar.beginFill(0x000000, 0.5);
    healthBar.drawRect(0, 0, width, barHeight);
    healthBar.endFill();

    healthBar.beginFill(
      healthPercent > 0.5
        ? 0x2ecc71
        : healthPercent > 0.25
          ? 0xf39c12
          : 0xe74c3c
    );
    healthBar.drawRect(0, 0, width * healthPercent, barHeight);
    healthBar.endFill();

    return healthBar;
  };

  // Battle countdown timer
  useEffect(() => {
    if (!battleStarted || battleEndResult) return;

    if (!battleStartTime) {
      setBattleStartTime(Date.now());
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - (battleStartTime || Date.now())) / 1000
      );
      const remaining = Math.max(0, 180 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [battleStarted, battleStartTime, battleEndResult]);

  // Battle event handlers
  const handleBattleEndEvent = useCallback((result: any) => {
    setBattleStatus(
      `Battle Over! ${result.stars} Stars - ${result.destructionPercentage}% Destruction`
    );
    setDestructionPercentage(result.destructionPercentage);
    setStars(result.stars || 0);
    setBattleEndResult(result);
  }, []);

  const handleBattleEvent = useCallback(
    (event: BattleEvent) => {
      switch (event.type) {
        case "TROOP_SPAWN":
          handleTroopSpawn(event.data);
          break;
        case "TROOP_MOVE":
          handleTroopMove(event.data);
          break;
        case "TROOP_ATTACK":
          handleTroopAttacked(event.data);
          break;
        case "TROOP_DEATH":
          handleTroopDeath(event.data);
          break;
        case "BUILDING_ATTACK":
          handleBuildingAttack(event.data);
          break;
        case "BUILDING_DESTROYED":
          handleBuildingDestroyed(event.data);
          break;
        case "BATTLE_END":
          handleBattleEndEvent(event.data);
          break;
      }
    },
    [handleBattleEndEvent]
  );

  // Handle canvas click for troop deployment
  const handleCanvasClick = useCallback(
    (event: any) => {
      if (!selectedTroopType || !battleSession) return;

      const troopsList = selectedTroops || [];
      const troopConfig = troopsList.find(
        (t: any) => t.type === selectedTroopType
      );
      if (!troopConfig) return;

      const deployed = deployedCounts[selectedTroopType] || 0;
      if (deployed >= troopConfig.count) {
        setBattleStatus(`No more ${selectedTroopType} available!`);
        return;
      }

      const pos = event.data.global;
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);

      const troopTypeToDepl = selectedTroopType;

      // Deploy troop via REST API (not WebSocket)
      battlesApi
        .deployTroop(battleSession.battleId, troopTypeToDepl, {
          x: gridX,
          y: gridY,
        })
        .then((response) => {
          setDeployedCounts((prev) => ({
            ...prev,
            [troopTypeToDepl]: (prev[troopTypeToDepl] || 0) + 1,
          }));

          setBattleStarted(true);
          setBattleStatus(
            `Deployed ${troopTypeToDepl} at (${gridX}, ${gridY})`
          );
        })
        .catch((error) => {
          console.error("Failed to deploy troop:", error);
          setBattleStatus(`Failed to deploy ${troopTypeToDepl}`);
        });
    },
    [selectedTroopType, battleSession, selectedTroops, deployedCounts]
  );

  // Update click handler
  useEffect(() => {
    if (!appRef.current?.stage) return;

    appRef.current.stage.off("pointerdown", handleCanvasClick);
    appRef.current.stage.on("pointerdown", handleCanvasClick);

    return () => {
      if (appRef.current?.stage) {
        appRef.current.stage.off("pointerdown", handleCanvasClick);
      }
    };
  }, [handleCanvasClick]);

  // Connect to WebSocket
  useEffect(() => {
    if (!battleSession || !villageId) return;

    const token = localStorage.getItem("auth_token");

    if (!token) {
      setBattleStatus("Authentication error - please log in again");
      setIsConnected(false);
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    // Use spectate socket for all event streaming (read-only)
    const socket = connectSpectateSocket();

    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        setBattleStatus("Connection failed - retrying...");
      }
    }, 5000);

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
    const handleBatchedEvents = (batch: {
      battleId: string;
      events: BattleEvent[];
      timestamp: number;
    }) => {
      console.log(`[Battle] Received batch of ${batch.events.length} events`);

      // Add all events to the queue
      eventQueue.current.push(...batch.events);

      // Start processing if not already processing
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        processNextEvent();
      }
    };

    socket.on("connect", () => {
      setIsConnected(true);
      setBattleStatus("Select a troop below, then click on the map to deploy!");
      clearTimeout(connectionTimeout);

      onSpectateEventBatch(handleBatchedEvents);
      onSpectateEvent(handleBattleEvent);
      onSpectateEnd(handleBattleEndEvent);

      // Join battle as spectator (public socket, no auth required)
      joinBattleAsSpectator(battleSession.battleId)
        .then((response) => {
          // All users connect via spectate socket now
          // Deployment permission is checked via REST API
          setBattleStatus(
            "Select a troop below, then click on the map to deploy!"
          );
          setIsConnected(true);
        })
        .catch((error: any) => {
          if (
            error.message &&
            (error.message.includes("ended") ||
              error.message.includes("not found"))
          ) {
            setBattleStatus("This battle has ended. Redirecting...");
            setTimeout(() => router.push("/village"), 2000);
          } else {
            setBattleStatus("Failed to join battle - please refresh");
          }
        });
    });

    socket.on("connect_error", (error) => {
      setIsConnected(false);
      setBattleStatus("Connection error - check if backend is running");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setBattleStatus("Disconnected from battle server");
    });

    return () => {
      // Clear queue on cleanup
      eventQueue.current = [];
      isProcessingRef.current = false;

      offSpectateEventBatch(handleBatchedEvents);
      offSpectateEvent(handleBattleEvent);
      offSpectateEnd(handleBattleEndEvent);

      clearTimeout(connectionTimeout);
      leaveSpectatorBattle().catch(console.error);
      disconnectSpectateSocket();
      clearBattle();
    };
  }, [
    battleSession,
    villageId,
    router,
    handleBattleEvent,
    handleBattleEndEvent,
    clearBattle,
  ]);

  // Troop spawn handler
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
    healthBar.position.set(
      data.position.x * TILE_SIZE,
      (data.position.y - 0.3) * TILE_SIZE
    );
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

  const getTroopColor = (type: string): number => {
    switch (type) {
      case "BARBARIAN":
        return 0xff6b6b;
      case "ARCHER":
        return 0x9b59b6;
      case "GIANT":
        return 0x3498db;
      default:
        return 0x95a5a6;
    }
  };

  const handleTroopMove = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    troopSprite.sprite.position.set(
      data.to.x * TILE_SIZE + TILE_SIZE / 2,
      data.to.y * TILE_SIZE + TILE_SIZE / 2
    );
    troopSprite.position = data.to;

    if (troopSprite.healthBar) {
      troopSprite.healthBar.position.set(
        data.to.x * TILE_SIZE,
        (data.to.y - 0.3) * TILE_SIZE
      );
    }
  };

  const handleBuildingAttack = (data: any) => {
    const buildingSprite = buildingSpritesRef.current.get(data.buildingId);
    if (!buildingSprite) return;

    buildingSprite.health = data.remainingHealth;

    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.clear();
      const barWidth = buildingSprite.width;
      const barHeight = 3;
      const healthPercent = buildingSprite.health / buildingSprite.maxHealth;

      buildingSprite.healthBar.beginFill(0x000000, 0.5);
      buildingSprite.healthBar.drawRect(0, 0, barWidth, barHeight);
      buildingSprite.healthBar.endFill();

      buildingSprite.healthBar.beginFill(
        healthPercent > 0.5
          ? 0x2ecc71
          : healthPercent > 0.25
            ? 0xf39c12
            : 0xe74c3c
      );
      buildingSprite.healthBar.drawRect(
        0,
        0,
        barWidth * healthPercent,
        barHeight
      );
      buildingSprite.healthBar.endFill();
    }

    if (data.projectile) {
      createProjectile(
        data.projectile.from,
        data.projectile.to,
        data.troopType
      );
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
        healthPercent > 0.5
          ? 0x2ecc71
          : healthPercent > 0.25
            ? 0xf39c12
            : 0xe74c3c
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

    createExplosion(data.position);
    buildingSprite.sprite.alpha = 0.3;
    if (buildingSprite.healthBar) {
      buildingSprite.healthBar.visible = false;
    }
  };

  const handleTroopDeath = (data: any) => {
    const troopSprite = troopSpritesRef.current.get(data.troopId);
    if (!troopSprite) return;

    createExplosion(data.position, 0.5);
    troopSprite.sprite.destroy();
    if (troopSprite.healthBar) {
      troopSprite.healthBar.destroy();
    }
    troopSpritesRef.current.delete(data.troopId);
  };

  const createProjectile = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    troopType?: string
  ) => {
    if (!effectsLayerRef.current) return;

    const projectile = new Graphics();

    if (troopType === "ARCHER") {
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

    projectile.position.set(
      from.x * TILE_SIZE + TILE_SIZE / 2,
      from.y * TILE_SIZE + TILE_SIZE / 2
    );
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

    slash.position.set(
      position.x * TILE_SIZE + TILE_SIZE,
      position.y * TILE_SIZE + TILE_SIZE
    );
    effectsLayerRef.current.addChild(slash);

    const duration = 200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      slash.alpha = 1 - progress;
      slash.rotation = (progress * Math.PI) / 2;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        slash.destroy();
      }
    };

    animate();
  };

  const createExplosion = (
    position: { x: number; y: number },
    scale: number = 1
  ) => {
    if (!effectsLayerRef.current) return;

    const explosion = new Graphics();
    explosion.beginFill(0xff4500, 0.8);
    explosion.drawCircle(0, 0, TILE_SIZE * scale);
    explosion.endFill();

    explosion.position.set(position.x * TILE_SIZE, position.y * TILE_SIZE);
    effectsLayerRef.current.addChild(explosion);

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

  // Get troop icon
  const getTroopIcon = (type: string) => {
    switch (type) {
      case "BARBARIAN":
        return "⚔️";
      case "ARCHER":
        return "🏹";
      case "GIANT":
        return "🦾";
      default:
        return "👤";
    }
  };

  if (isLoading || !battleSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent mb-4"></div>
          <h2 className="text-2xl font-bold text-white">Loading battle...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Full-screen canvas */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={canvasRef}
          className={`${selectedTroopType && isConnected ? "cursor-crosshair" : ""}`}
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            boxShadow: "0 0 100px rgba(0,0,0,0.8)",
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
          onClick={() => router.push("/village")}
          className="bg-gray-900/90 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500 text-white hover:bg-gray-800/90 transition-all duration-300 shadow-lg hover:shadow-amber-500/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Exit Battle
        </Button>
      </motion.div>

      {/* Top Center - Battle Info Panel */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl p-4 min-w-[600px]">
          <div className="flex items-center justify-between gap-6">
            {/* Timer */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
                <Clock
                  className={`w-6 h-6 ${timeRemaining < 30 ? "text-red-500 animate-pulse" : "text-blue-400"}`}
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Time
                </div>
                <div
                  className={`text-2xl font-bold font-mono ${timeRemaining < 30 ? "text-red-500" : "text-white"}`}
                >
                  {Math.floor(timeRemaining / 60)}:
                  {(timeRemaining % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>

            {/* Destruction */}
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/30">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Destruction
                </div>
                <div className="text-2xl font-bold text-white">
                  {destructionPercentage}%
                </div>
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Stars
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${star <= stars ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 ml-4">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              />
              <span className="text-sm text-gray-300">
                {isConnected ? "Connected" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom - Horizontal Troop Selector */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
              <Swords className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400 uppercase tracking-wide">
                Deploy Troops
              </span>
            </div>

            {troops.map((troop: any, index: number) => {
              const deployed = deployedCounts[troop.type] || 0;
              const remaining = troop.count - deployed;
              const isSelected = selectedTroopType === troop.type;

              return (
                <motion.button
                  key={troop.type}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setSelectedTroopType(troop.type);
                    setBattleStatus(
                      `${troop.type} selected! Click on the map to deploy.`
                    );
                  }}
                  disabled={remaining === 0}
                  className={`
                    relative group
                    ${
                      isSelected
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400 scale-110"
                        : "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-amber-500/50"
                    }
                    ${remaining === 0 ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
                    border-2 rounded-xl p-4 min-w-[120px]
                    transition-all duration-300 shadow-lg
                    ${isSelected ? "shadow-amber-500/50" : "hover:shadow-amber-500/20"}
                  `}
                >
                  {/* Shimmer effect */}
                  {isSelected && (
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                        style={{ transform: "translateX(-100%)" }}
                      />
                    </div>
                  )}

                  {/* Troop Icon */}
                  <div className="text-4xl mb-2">
                    {getTroopIcon(troop.type)}
                  </div>

                  {/* Troop Name */}
                  <div
                    className={`text-sm font-bold mb-1 ${isSelected ? "text-white" : "text-gray-300"}`}
                  >
                    {troop.type}
                  </div>

                  {/* Count */}
                  <div
                    className={`text-lg font-mono font-bold ${remaining === 0 ? "text-red-400" : isSelected ? "text-white" : "text-amber-400"}`}
                  >
                    {remaining}/{troop.count}
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {battleStatus && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-700"
              >
                <p className="text-sm text-center text-gray-300">
                  {battleStatus}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Battle Summary Modal */}
      {battleEndResult && (
        <BattleSummary
          battleResult={battleEndResult}
          onReturnToVillage={() => router.push("/village")}
        />
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
