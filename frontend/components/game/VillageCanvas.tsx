'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Building } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';
import { SpriteManager } from '@/lib/game/SpriteManager';
import { getBuildingSprite, CRITICAL_ASSETS, LAZY_LOAD_ASSETS, BuildingType } from '@/lib/config/spriteAssets';
import { DecorationManager, type Decoration } from '@/lib/game/DecorationManager';

interface VillageCanvasProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
}

const GRID_WIDTH = 80; // 80 columns
const GRID_HEIGHT = 40; // 40 rows (2:1 ratio)
const TILE_SIZE = 15; // pixels per tile
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE; // 1200px
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE; // 600px
const BACKGROUND_IMAGE = '/assets/bg/map001.svg';

export function VillageCanvas({ buildings, onBuildingClick }: VillageCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [decorations, setDecorations] = useState<Decoration[]>([]);

  // Preload sprites
  useEffect(() => {
    const preloadSprites = async () => {
      try {
        await SpriteManager.preloadAssets(CRITICAL_ASSETS);
        setSpritesLoaded(true);

        // Lazy load decoration assets in background
        // DISABLED: Decoration assets not available yet
        // await SpriteManager.preloadAssets(LAZY_LOAD_ASSETS);
      } catch (error) {
        console.error('Error preloading sprites:', error);
        setSpritesLoaded(true); // Continue anyway with fallback
      }
    };
    preloadSprites();
  }, []);

  // Generate decorations once buildings are available
  // DISABLED: Decoration assets not available yet
  // useEffect(() => {
  //   if (buildings.length > 0 && decorations.length === 0) {
  //     const generatedDecorations = DecorationManager.generateDecorations({
  //       gridWidth: GRID_WIDTH,
  //       gridHeight: GRID_HEIGHT,
  //       density: 0.12,
  //       seed: 42,
  //       buildings,
  //       categories: ['tree', 'plant'],
  //     });
  //     setDecorations(generatedDecorations);
  //   }
  // }, [buildings, decorations.length]);

  useEffect(() => {
    if (!canvasRef.current || !spritesLoaded) return;

    // Initialize Pixi application
    const app = new PIXI.Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundAlpha: 0, // Transparent background
      antialias: true,
    });

    appRef.current = app;
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);

    // Draw grid lines with semi-transparent background
    const gridGraphics = new PIXI.Graphics();

    // Add semi-transparent white background to differentiate play area
    gridGraphics.beginFill(0xffffff, 0.1); // White with 10% opacity
    gridGraphics.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gridGraphics.endFill();

    // Draw grid lines
    gridGraphics.lineStyle(1, 0x000000, 0.3); // Black lines with 30% opacity

    // Vertical lines
    for (let x = 0; x <= GRID_WIDTH; x++) {
      gridGraphics.moveTo(x * TILE_SIZE, 0);
      gridGraphics.lineTo(x * TILE_SIZE, CANVAS_HEIGHT);
    }

    // Horizontal lines
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      gridGraphics.moveTo(0, y * TILE_SIZE);
      gridGraphics.lineTo(CANVAS_WIDTH, y * TILE_SIZE);
    }

    app.stage.addChild(gridGraphics);
    console.log('🗺️ Grid lines drawn');

    // Draw decorations (after background, before buildings)
    // DISABLED: Decoration assets not available yet
    // decorations.forEach((decoration) => {
    //   drawDecoration(app, decoration);
    // });

    // Draw buildings
    buildings.forEach((building) => {
      drawBuilding(app, building, onBuildingClick);
    });

    // Cleanup
    return () => {
      app.destroy(true, { children: true });
    };
  }, [buildings, onBuildingClick, spritesLoaded, decorations]);

  return (
    <div
      className="flex items-center justify-center rounded-lg border-4 border-amber-600 p-4 shadow-2xl bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
    >
      <div ref={canvasRef} className="rounded-md shadow-lg" />
    </div>
  );
}

function drawBuilding(
  app: PIXI.Application,
  building: Building,
  onBuildingClick?: (building: Building) => void,
) {
  const visualConfig = getBuildingVisual(building.type);
  const color = parseInt(visualConfig.color.replace('#', ''), 16);

  const width = visualConfig.size.width * TILE_SIZE;
  const height = visualConfig.size.height * TILE_SIZE;
  const x = building.positionX * TILE_SIZE;
  const y = building.positionY * TILE_SIZE;

  // Create container for building
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  // Building base (3D effect)
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.2);
  shadow.drawRect(2, 2, width, height);
  shadow.endFill();
  container.addChild(shadow);

  const isWall = building.type === 'wall';

  if (isWall) {
    // Walls are rendered as colored rectangles with seamless blending
    const buildingRect = new PIXI.Graphics();
    buildingRect.beginFill(color);
    buildingRect.lineStyle(0); // No border for seamless blending
    buildingRect.drawRect(0, 0, width, height);
    buildingRect.endFill();
    container.addChild(buildingRect);
  } else {
    // Non-wall buildings use sprites
    const spriteConfig = getBuildingSprite(building.type as BuildingType);
    const texture = SpriteManager.getTextureSync(spriteConfig.path);

    if (texture) {
      // Use sprite rendering
      const buildingSprite = new PIXI.Sprite(texture);

      // Calculate scale to fit the building size
      const scaleX = width / texture.width;
      const scaleY = height / texture.height;
      const scale = Math.min(scaleX, scaleY) * (spriteConfig.scaleMultiplier || 1.0);

      buildingSprite.scale.set(scale, scale);
      buildingSprite.anchor.set(spriteConfig.anchor?.x || 0.5, spriteConfig.anchor?.y || 0.5);
      buildingSprite.x = width / 2;
      buildingSprite.y = height / 2 + (spriteConfig.yOffset || 0);

      container.addChild(buildingSprite);
    } else {
      // Fallback to colored rectangle
      const buildingRect = new PIXI.Graphics();
      buildingRect.beginFill(color);
      buildingRect.lineStyle(2, 0x000000, 0.5);
      buildingRect.drawRoundedRect(0, 0, width, height, 4);
      buildingRect.endFill();
      container.addChild(buildingRect);
    }
  }

  // Health bars are NOT shown in village view - only in battle mode

  // Building name text
  const text = new PIXI.Text(visualConfig.name, {
    fontFamily: 'Arial',
    fontSize: 10,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 2,
    align: 'center',
  });
  text.anchor.set(0.5, 0);
  text.x = width / 2;
  text.y = -15;
  container.addChild(text);

  // Interaction
  if (onBuildingClick) {
    container.on('pointerdown', () => {
      onBuildingClick(building);
    });
    container.on('pointerover', () => {
      container.alpha = 0.8; // Hover effect
    });
    container.on('pointerout', () => {
      container.alpha = 1.0;
    });
  }

  app.stage.addChild(container);
}

function drawDecoration(app: PIXI.Application, decoration: Decoration) {
  const texture = SpriteManager.getTextureSync(decoration.config.path);
  if (!texture) {
    // Decoration sprite not loaded yet, skip
    return;
  }

  const sprite = new PIXI.Sprite(texture);
  const x = decoration.positionX * TILE_SIZE;
  const y = decoration.positionY * TILE_SIZE;

  // Calculate scale to fit grid size
  const targetSize = TILE_SIZE * decoration.config.gridSize;
  const scale = Math.min(
    targetSize / texture.width,
    targetSize / texture.height
  );

  sprite.scale.set(scale, scale);
  sprite.anchor.set(
    decoration.config.anchor?.x || 0.5,
    decoration.config.anchor?.y || 0.5
  );

  // Position sprite (center of occupied tiles)
  sprite.x = x + (TILE_SIZE * decoration.config.gridSize) / 2;
  sprite.y = y + (TILE_SIZE * decoration.config.gridSize) / 2;

  // Add slight transparency for better blending
  sprite.alpha = 0.85;

  app.stage.addChild(sprite);
}
