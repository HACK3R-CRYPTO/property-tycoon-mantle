'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Building } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';
import { BuildingType, getBuildingConfig } from '@/lib/config/buildingsData';
import { SpriteManager } from '@/lib/game/SpriteManager';
import { getBuildingSprite, calculateSpriteScale, CRITICAL_ASSETS, LAZY_LOAD_ASSETS } from '@/lib/config/spriteAssets';
import { DecorationManager, type Decoration } from '@/lib/game/DecorationManager';

interface VillageCanvasPlacementProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
  onBuildingMove?: (buildingId: string, x: number, y: number) => Promise<void>;
  placementMode?: {
    active: boolean;
    buildingType: BuildingType;
    onPlace: (x: number, y: number) => void;
    onCancel: () => void;
  };
}

const GRID_WIDTH = 80; // 80 columns
const GRID_HEIGHT = 40; // 40 rows (2:1 ratio)
const TILE_SIZE = 15;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE; // 1200px
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE; // 600px
const BACKGROUND_IMAGE = '/assets/bg/map001.svg';

export function VillageCanvasPlacement({
  buildings,
  onBuildingClick,
  onBuildingMove,
  placementMode,
}: VillageCanvasPlacementProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const buildingContainersRef = useRef<Map<string, PIXI.Container>>(new Map());
  const decorationContainerRef = useRef<PIXI.Container | null>(null);
  const previewRef = useRef<PIXI.Graphics | null>(null);
  const suggestedPreviewRef = useRef<PIXI.Graphics | null>(null);
  const draggedBuildingRef = useRef<{ building: Building; startX: number; startY: number } | null>(null);
  const selectedBuildingRef = useRef<Building | null>(null);
  const wallPlacementHistoryRef = useRef<{x: number, y: number}[]>([]);
  const [selectedWalls, setSelectedWalls] = useState<Set<string>>(new Set());
  const selectionGraphicsRef = useRef<Map<string, PIXI.Graphics>>(new Map());
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [decorations, setDecorations] = useState<Decoration[]>([]);

  // Preload all sprites ONCE on mount
  useEffect(() => {
    const preloadSprites = async () => {
      try {
        console.log('🎨 Preloading sprite assets...');
        await SpriteManager.preloadAssets(CRITICAL_ASSETS);
        setSpritesLoaded(true);
        console.log('✅ Sprites loaded successfully');

        // Lazy load decoration assets in background
        // DISABLED: Decoration assets not available yet
        // console.log('🌳 Lazy loading decoration assets...');
        // await SpriteManager.preloadAssets(LAZY_LOAD_ASSETS);
        // console.log('✅ Decoration assets loaded');
      } catch (error) {
        console.error('❌ Error preloading sprites:', error);
        // Fallback: use colored rectangles if sprites fail to load
        setSpritesLoaded(true);
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
  //       density: 0.12, // 12% of tiles have decorations
  //       seed: 42, // Consistent seed for same layout
  //       buildings,
  //       categories: ['tree', 'plant'], // Only trees and plants, no rocks
  //     });
  //     setDecorations(generatedDecorations);
  //   }
  // }, [buildings, decorations.length]);

  // Initialize Pixi app ONCE
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

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

    app.stage.addChildAt(gridGraphics, 0);
    console.log('🗺️ Grid lines drawn');

    // Cleanup
    return () => {
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  // Render decorations on canvas
  useEffect(() => {
    const app = appRef.current;
    if (!app || decorations.length === 0) return;

    // Remove old decoration container if it exists
    if (decorationContainerRef.current) {
      app.stage.removeChild(decorationContainerRef.current);
      decorationContainerRef.current.destroy({ children: true });
    }

    // Create new decoration container
    const decorationContainer = new PIXI.Container();
    decorationContainer.name = 'decorations';
    decorationContainerRef.current = decorationContainer;

    // Render each decoration
    decorations.forEach(decoration => {
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

      decorationContainer.addChild(sprite);
    });

    // Add decoration container to stage (after ground tiles, before buildings)
    // Insert at index 2 (after grid at 0, ground tiles at 1)
    app.stage.addChildAt(decorationContainer, 2);

    console.log(`🎨 Rendered ${decorations.length} decorations on canvas`);
  }, [decorations]);

  // Draw selection highlights for selected walls
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    // Remove old selection graphics
    selectionGraphicsRef.current.forEach((graphics, id) => {
      if (!selectedWalls.has(id)) {
        if (graphics && graphics.parent) {
          app.stage.removeChild(graphics);
        }
        selectionGraphicsRef.current.delete(id);
      }
    });

    // Add new selection graphics
    selectedWalls.forEach((wallId) => {
      if (!selectionGraphicsRef.current.has(wallId)) {
        const wall = buildings.find(b => b.id === wallId);
        if (wall) {
          const graphics = new PIXI.Graphics();
          graphics.lineStyle(3, 0xffff00, 1);
          graphics.drawRect(
            wall.positionX * TILE_SIZE - 2,
            wall.positionY * TILE_SIZE - 2,
            TILE_SIZE + 4,
            TILE_SIZE + 4
          );
          selectionGraphicsRef.current.set(wallId, graphics);
          app.stage.addChild(graphics);
        }
      }
    });
  }, [selectedWalls, buildings]);

  // Draw/update buildings when they change
  useEffect(() => {
    const app = appRef.current;
    if (!app || !spritesLoaded) return; // Wait for sprites to load before rendering buildings

    // Remove old building containers
    buildingContainersRef.current.forEach((container, id) => {
      if (!buildings.find((b) => b.id === id)) {
        if (container && container.parent) {
          app.stage.removeChild(container);
        }
        buildingContainersRef.current.delete(id);
      }
    });

    // Add or update buildings
    buildings.forEach((building) => {
      let container = buildingContainersRef.current.get(building.id);

      if (!container) {
        // Create new building
        container = createBuildingContainer(
          building,
          (clickedBuilding, isShiftClick) => handleBuildingClick(clickedBuilding, isShiftClick),
          onBuildingMove,
          draggedBuildingRef,
          selectedBuildingRef,
          () => buildings,
          () => selectedWalls, // Pass getter function instead of value
          (buildingIds, deltaX, deltaY) => handleMultiMove(buildingIds, deltaX, deltaY),
        );
        buildingContainersRef.current.set(building.id, container);
        app.stage.addChild(container);
      } else {
        // Update existing building position if changed
        // Check if container is still valid (not destroyed)
        if (!container.transform) {
          // Container was destroyed, remove from map and recreate
          buildingContainersRef.current.delete(building.id);
          container = createBuildingContainer(
            building,
            (clickedBuilding, isShiftClick) => handleBuildingClick(clickedBuilding, isShiftClick),
            onBuildingMove,
            draggedBuildingRef,
            selectedBuildingRef,
            () => buildings,
            () => selectedWalls, // Pass getter function instead of value
            (buildingIds, deltaX, deltaY) => handleMultiMove(buildingIds, deltaX, deltaY),
          );
          buildingContainersRef.current.set(building.id, container);
          app.stage.addChild(container);
        } else {
          const visualConfig = getBuildingVisual(building.type);
          const newX = building.positionX * TILE_SIZE;
          const newY = building.positionY * TILE_SIZE;

          if (container.x !== newX || container.y !== newY) {
            container.x = newX;
            container.y = newY;
          }
        }
      }
    });
  }, [buildings, onBuildingMove, spritesLoaded]); // Added spritesLoaded to wait for assets

  const handleBuildingClick = (clickedBuilding: Building, isShiftClick: boolean) => {
    console.log('[Wall Select] Clicked building:', clickedBuilding.type, 'isShift:', isShiftClick, 'currentSelection:', selectedWalls.size);

    if (clickedBuilding.type === 'wall' && isShiftClick) {
      // Shift+click on wall - range selection
      if (selectedWalls.size === 0) {
        // First wall selected
        console.log('[Wall Select] First wall selected via shift-click');
        setSelectedWalls(new Set([clickedBuilding.id]));
      } else {
        // Select range between first selected and clicked wall
        const firstWallId = Array.from(selectedWalls)[0];
        const firstWall = buildings.find(b => b.id === firstWallId);
        console.log('[Wall Select] Range selection - first wall:', firstWall?.positionX, firstWall?.positionY, 'clicked:', clickedBuilding.positionX, clickedBuilding.positionY);
        if (firstWall) {
          const rangeWalls = getWallRange(firstWall, clickedBuilding, buildings);
          console.log('[Wall Select] Range result:', rangeWalls?.length, 'walls');
          if (rangeWalls) {
            setSelectedWalls(new Set(rangeWalls.map(w => w.id)));
          } else {
            console.log('[Wall Select] No valid range found (walls not in continuous line)');
          }
        }
      }
    } else if (clickedBuilding.type === 'wall' && !isShiftClick) {
      // Regular click on wall - single select
      console.log('[Wall Select] Single wall selected');
      setSelectedWalls(new Set([clickedBuilding.id]));
    } else {
      // Not a wall or not shift-click - clear selection and call original handler
      console.log('[Wall Select] Non-wall clicked, clearing selection');
      setSelectedWalls(new Set());
      if (onBuildingClick) {
        onBuildingClick(clickedBuilding);
      }
    }
  };

  const handleMultiMove = async (buildingIds: Set<string>, deltaX: number, deltaY: number) => {
    if (!onBuildingMove) return;

    // Move all selected buildings
    const movePromises = Array.from(buildingIds).map(async (id) => {
      const building = buildings.find(b => b.id === id);
      if (building) {
        const newX = building.positionX + deltaX;
        const newY = building.positionY + deltaY;
        await onBuildingMove(id, newX, newY);
      }
    });

    await Promise.all(movePromises);
  };

  // Clear wall history when placement mode becomes inactive
  useEffect(() => {
    if (!placementMode?.active) {
      wallPlacementHistoryRef.current = [];
      console.log('[Wall Placement] Cleared history - placement mode inactive');
    }
  }, [placementMode?.active]);

  // Handle placement mode with continuous wall placement
  useEffect(() => {
    const app = appRef.current;
    if (!app || !placementMode?.active) {
      // Remove previews if they exist
      if (previewRef.current) {
        app?.stage.removeChild(previewRef.current);
        previewRef.current = null;
      }
      if (suggestedPreviewRef.current) {
        app?.stage.removeChild(suggestedPreviewRef.current);
        suggestedPreviewRef.current = null;
      }
      return;
    }

    const canvas = app.view as HTMLCanvasElement;
    const preview = new PIXI.Graphics();
    preview.name = 'preview';
    previewRef.current = preview;
    app.stage.addChild(preview);

    // Create suggested preview for walls
    let suggestedPreview: PIXI.Graphics | null = null;
    if (placementMode.buildingType === BuildingType.WALL) {
      suggestedPreview = new PIXI.Graphics();
      suggestedPreview.name = 'suggestedPreview';
      suggestedPreviewRef.current = suggestedPreview;
      app.stage.addChild(suggestedPreview);
    }

    const config = getBuildingConfig(placementMode.buildingType);
    let suggestedPosition: {x: number, y: number} | null = null;

    // Calculate suggested position for walls based on last 2 placements
    if (placementMode.buildingType === BuildingType.WALL && wallPlacementHistoryRef.current.length >= 1) {
      const history = wallPlacementHistoryRef.current;
      console.log('[Wall Placement] Calculating suggested position, history length:', history.length);
      if (history.length === 1) {
        // Only one wall placed, suggest right or below
        const last = history[0];
        suggestedPosition = { x: last.x + 1, y: last.y };
        // Check if right is valid, otherwise try below
        if (!checkPlacementValid(suggestedPosition.x, suggestedPosition.y, 1, 1, buildings, null)) {
          suggestedPosition = { x: last.x, y: last.y + 1 };
          if (!checkPlacementValid(suggestedPosition.x, suggestedPosition.y, 1, 1, buildings, null)) {
            suggestedPosition = null;
          }
        }
        console.log('[Wall Placement] First wall, suggested:', suggestedPosition);
      } else {
        // Two or more walls placed, determine direction
        const last = history[history.length - 1];
        const secondLast = history[history.length - 2];
        const dx = last.x - secondLast.x;
        const dy = last.y - secondLast.y;

        // Continue in same direction
        suggestedPosition = { x: last.x + dx, y: last.y + dy };
        if (!checkPlacementValid(suggestedPosition.x, suggestedPosition.y, 1, 1, buildings, null)) {
          suggestedPosition = null;
        }
        console.log('[Wall Placement] Direction:', { dx, dy }, 'suggested:', suggestedPosition);
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const gridX = Math.floor(pixelX / TILE_SIZE);
      const gridY = Math.floor(pixelY / TILE_SIZE);

      const valid = checkPlacementValid(gridX, gridY, config.size.width, config.size.height, buildings, null);

      preview.clear();
      const color = valid ? 0x00ff00 : 0xff0000;
      preview.beginFill(color, 0.4);
      preview.lineStyle(2, color, 0.8);
      preview.drawRect(gridX * TILE_SIZE, gridY * TILE_SIZE, config.size.width * TILE_SIZE, config.size.height * TILE_SIZE);
      preview.endFill();

      // Draw suggested preview for walls
      if (suggestedPreview && suggestedPosition) {
        suggestedPreview.clear();
        suggestedPreview.beginFill(0x00ffff, 0.3);
        suggestedPreview.lineStyle(2, 0x00ffff, 0.6);
        suggestedPreview.drawRect(
          suggestedPosition.x * TILE_SIZE,
          suggestedPosition.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
        suggestedPreview.endFill();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const gridX = Math.floor(pixelX / TILE_SIZE);
      const gridY = Math.floor(pixelY / TILE_SIZE);

      const valid = checkPlacementValid(gridX, gridY, config.size.width, config.size.height, buildings, null);
      if (valid) {
        placementMode.onPlace(gridX, gridY);

        // For walls, add to placement history and don't cancel
        if (placementMode.buildingType === BuildingType.WALL) {
          wallPlacementHistoryRef.current.push({ x: gridX, y: gridY });
          console.log('[Wall Placement] Added to history:', { x: gridX, y: gridY }, 'Total history:', wallPlacementHistoryRef.current.length);
          // Keep only last 10 placements for history
          if (wallPlacementHistoryRef.current.length > 10) {
            wallPlacementHistoryRef.current.shift();
          }
        }
      }
    };

    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      wallPlacementHistoryRef.current = [];
      placementMode.onCancel();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        wallPlacementHistoryRef.current = [];
        placementMode.onCancel();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleRightClick);
      window.removeEventListener('keydown', handleKeyDown);
      if (previewRef.current && app?.stage) {
        app.stage.removeChild(previewRef.current);
        previewRef.current = null;
      }
      if (suggestedPreviewRef.current && app?.stage) {
        app.stage.removeChild(suggestedPreviewRef.current);
        suggestedPreviewRef.current = null;
      }
    };
  }, [placementMode, buildings]);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
    >
      <div
        ref={canvasRef}
        className=""
        style={{ cursor: placementMode?.active ? 'crosshair' : 'default' }}
      />
      {placementMode?.active && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 text-white shadow-xl">
          <p className="text-sm">
            {placementMode.buildingType === BuildingType.WALL
              ? 'Click to place walls • Cyan = suggested • Right-click or ESC to cancel'
              : 'Click to place • Right-click or ESC to cancel'}
          </p>
        </div>
      )}
      {selectedWalls.size > 0 && (
        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 text-white">
          <p className="text-sm">
            {selectedWalls.size} wall{selectedWalls.size > 1 ? 's' : ''} selected • Drag to move • Click elsewhere to deselect
          </p>
        </div>
      )}
    </div>
  );
}

function createBuildingContainer(
  building: Building,
  onBuildingClick?: (building: Building, isShiftClick: boolean) => void,
  onBuildingMove?: (buildingId: string, x: number, y: number) => Promise<void>,
  draggedBuildingRef?: React.MutableRefObject<{ building: Building; startX: number; startY: number } | null>,
  selectedBuildingRef?: React.MutableRefObject<Building | null>,
  getBuildings?: () => Building[],
  getSelectedWalls?: () => Set<string>, // Changed to getter function
  onMultiMove?: (buildingIds: Set<string>, deltaX: number, deltaY: number) => Promise<void>,
): PIXI.Container {
  const visualConfig = getBuildingVisual(building.type);
  const color = parseInt(visualConfig.color.replace('#', ''), 16);
  const width = visualConfig.size.width * TILE_SIZE;
  const height = visualConfig.size.height * TILE_SIZE;

  const container = new PIXI.Container();
  container.x = building.positionX * TILE_SIZE;
  container.y = building.positionY * TILE_SIZE;
  container.eventMode = 'static';
  container.cursor = 'grab';

  // Shadow
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.2);
  shadow.drawRect(2, 2, width, height);
  shadow.endFill();
  container.addChild(shadow);

  // Building sprite or colored rectangle (walls use rectangles with blending)
  let buildingSprite: PIXI.Sprite | null = null;
  let buildingRect: PIXI.Graphics | null = null;

  const isWall = building.type === 'wall';

  if (isWall) {
    // Walls are rendered as colored rectangles with seamless blending
    buildingRect = new PIXI.Graphics();
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
      buildingSprite = new PIXI.Sprite(texture);

      // Calculate scale to fit the building size
      const targetWidth = width;
      const targetHeight = height;
      const scaleX = targetWidth / texture.width;
      const scaleY = targetHeight / texture.height;
      const scale = Math.min(scaleX, scaleY) * (spriteConfig.scaleMultiplier || 1.0);

      buildingSprite.scale.set(scale, scale);

      // Center the sprite
      buildingSprite.anchor.set(spriteConfig.anchor?.x || 0.5, spriteConfig.anchor?.y || 0.5);
      buildingSprite.x = width / 2;
      buildingSprite.y = height / 2 + (spriteConfig.yOffset || 0);

      container.addChild(buildingSprite);
    } else {
      // Fallback to colored rectangle if sprite not loaded
      buildingRect = new PIXI.Graphics();
      buildingRect.beginFill(color);
      buildingRect.lineStyle(2, 0x000000, 0.5);
      buildingRect.drawRoundedRect(0, 0, width, height, 4);
      buildingRect.endFill();
      container.addChild(buildingRect);
    }
  }

  // Health bars are NOT shown in village view - only in battle mode

  // Label removed - no labels above buildings

  // Drag state
  let isDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let originalPos = { x: container.x, y: container.y };
  let dragPreview: PIXI.Graphics | null = null;
  let dragStartGridPos = { x: 0, y: 0 };

  // Interaction handlers
  container.on('pointerover', () => {
    if (buildingSprite) {
      buildingSprite.tint = 0xcccccc;
    } else if (buildingRect) {
      buildingRect.tint = 0xcccccc;
    }
  });

  container.on('pointerout', () => {
    if (!isDragging) {
      if (buildingSprite) {
        buildingSprite.tint = 0xffffff;
      } else if (buildingRect) {
        buildingRect.tint = 0xffffff;
      }
    }
  });

  container.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
    const isShiftClick = event.shiftKey;

    if (onBuildingClick) {
      onBuildingClick(building, isShiftClick);
      if (selectedBuildingRef && !isShiftClick) {
        selectedBuildingRef.current = building;
      }
    }

    // Start drag
    isDragging = true;
    container.cursor = 'grabbing';
    dragStartPos = { x: event.globalX, y: event.globalY };
    originalPos = { x: container.x, y: container.y };
    dragStartGridPos = { x: building.positionX, y: building.positionY };

    if (draggedBuildingRef) {
      draggedBuildingRef.current = {
        building,
        startX: building.positionX,
        startY: building.positionY,
      };
    }

    // Create drag preview
    if (container.parent) {
      dragPreview = new PIXI.Graphics();
      dragPreview.name = 'dragPreview';
      container.parent.addChild(dragPreview);
    }

    event.stopPropagation();
  });

  container.on('globalpointermove', (event: PIXI.FederatedPointerEvent) => {
    if (!isDragging || !dragPreview) return;

    const dx = event.globalX - dragStartPos.x;
    const dy = event.globalY - dragStartPos.y;

    container.x = originalPos.x + dx;
    container.y = originalPos.y + dy;

    // Calculate grid position
    const gridX = Math.round(container.x / TILE_SIZE);
    const gridY = Math.round(container.y / TILE_SIZE);

    // Check if valid placement (for single or multi-select)
    const buildingConfig = getBuildingVisual(building.type);
    const allBuildings = getBuildings ? getBuildings() : [];
    const selectedWalls = getSelectedWalls ? getSelectedWalls() : new Set<string>();

    let valid = false;
    if (selectedWalls && selectedWalls.size > 1 && selectedWalls.has(building.id)) {
      // Multi-select move - check all walls
      const deltaX = gridX - dragStartGridPos.x;
      const deltaY = gridY - dragStartGridPos.y;
      valid = checkMultiPlacementValid(selectedWalls, deltaX, deltaY, allBuildings);

      // Draw previews for all selected walls
      dragPreview.clear();
      const previewColor = valid ? 0x00ff00 : 0xff0000;
      selectedWalls.forEach(wallId => {
        const wall = allBuildings.find(b => b.id === wallId);
        if (wall) {
          dragPreview!.beginFill(previewColor, 0.3);
          dragPreview!.lineStyle(2, previewColor, 0.8);
          dragPreview!.drawRect(
            (wall.positionX + deltaX) * TILE_SIZE,
            (wall.positionY + deltaY) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          );
          dragPreview!.endFill();
        }
      });
    } else {
      // Single building move
      valid = checkPlacementValid(
        gridX,
        gridY,
        buildingConfig.size.width,
        buildingConfig.size.height,
        allBuildings,
        building.id,
      );

      // Draw preview
      dragPreview.clear();
      const previewColor = valid ? 0x00ff00 : 0xff0000;
      dragPreview.beginFill(previewColor, 0.3);
      dragPreview.lineStyle(2, previewColor, 0.8);
      dragPreview.drawRect(gridX * TILE_SIZE, gridY * TILE_SIZE, width, height);
      dragPreview.endFill();
    }
  });

  container.on('pointerup', async (event: PIXI.FederatedPointerEvent) => {
    if (!isDragging) return;

    isDragging = false;
    container.cursor = 'grab';

    // Calculate final grid position
    const gridX = Math.round(container.x / TILE_SIZE);
    const gridY = Math.round(container.y / TILE_SIZE);

    const buildingConfig = getBuildingVisual(building.type);
    const allBuildings = getBuildings ? getBuildings() : [];
    const selectedWalls = getSelectedWalls ? getSelectedWalls() : new Set<string>();

    // Handle multi-select move
    if (selectedWalls && selectedWalls.size > 1 && selectedWalls.has(building.id)) {
      const deltaX = gridX - dragStartGridPos.x;
      const deltaY = gridY - dragStartGridPos.y;
      const valid = checkMultiPlacementValid(selectedWalls, deltaX, deltaY, allBuildings);

      if (valid && (deltaX !== 0 || deltaY !== 0) && onMultiMove) {
        try {
          await onMultiMove(selectedWalls, deltaX, deltaY);
        } catch (error) {
          container.x = originalPos.x;
          container.y = originalPos.y;
          alert('Failed to move buildings');
        }
      } else {
        container.x = originalPos.x;
        container.y = originalPos.y;
      }
    } else {
      // Single building move
      const valid = checkPlacementValid(
        gridX,
        gridY,
        buildingConfig.size.width,
        buildingConfig.size.height,
        allBuildings,
        building.id,
      );

      if (valid && onBuildingMove && (gridX !== building.positionX || gridY !== building.positionY)) {
        try {
          await onBuildingMove(building.id, gridX, gridY);
        } catch (error) {
          container.x = originalPos.x;
          container.y = originalPos.y;
          alert('Failed to move building');
        }
      } else {
        container.x = originalPos.x;
        container.y = originalPos.y;
      }
    }

    // Remove preview
    if (dragPreview && container.parent) {
      container.parent.removeChild(dragPreview);
      dragPreview = null;
    }

    if (draggedBuildingRef) {
      draggedBuildingRef.current = null;
    }
  });

  container.on('pointerupoutside', () => {
    if (!isDragging) return;

    isDragging = false;
    container.cursor = 'grab';

    // Revert to original position
    container.x = originalPos.x;
    container.y = originalPos.y;

    // Remove preview
    if (dragPreview && container.parent) {
      container.parent.removeChild(dragPreview);
      dragPreview = null;
    }

    if (draggedBuildingRef) {
      draggedBuildingRef.current = null;
    }
  });

  return container;
}

function checkPlacementValid(
  x: number,
  y: number,
  width: number,
  height: number,
  buildings: Building[],
  excludeBuildingId: string | null,
): boolean {
  if (x < 0 || y < 0 || x + width > GRID_WIDTH || y + height > GRID_HEIGHT) {
    return false;
  }

  for (const building of buildings) {
    if (building.id === excludeBuildingId) continue;

    const buildingConfig = getBuildingVisual(building.type);
    const newLeft = x;
    const newRight = x + width;
    const newTop = y;
    const newBottom = y + height;

    const existingLeft = building.positionX;
    const existingRight = building.positionX + buildingConfig.size.width;
    const existingTop = building.positionY;
    const existingBottom = building.positionY + buildingConfig.size.height;

    if (newLeft < existingRight && newRight > existingLeft && newTop < existingBottom && newBottom > existingTop) {
      return false;
    }
  }

  return true;
}

function checkMultiPlacementValid(
  selectedIds: Set<string>,
  deltaX: number,
  deltaY: number,
  allBuildings: Building[],
): boolean {
  // Check if all selected walls can be moved by delta
  for (const id of selectedIds) {
    const wall = allBuildings.find(b => b.id === id);
    if (!wall) continue;

    const newX = wall.positionX + deltaX;
    const newY = wall.positionY + deltaY;

    // Check bounds
    if (newX < 0 || newY < 0 || newX + 1 > GRID_WIDTH || newY + 1 > GRID_HEIGHT) {
      return false;
    }

    // Check collisions with non-selected buildings
    for (const other of allBuildings) {
      if (selectedIds.has(other.id)) continue; // Skip selected walls

      const otherConfig = getBuildingVisual(other.type);
      if (
        newX < other.positionX + otherConfig.size.width &&
        newX + 1 > other.positionX &&
        newY < other.positionY + otherConfig.size.height &&
        newY + 1 > other.positionY
      ) {
        return false;
      }
    }
  }

  return true;
}

function getWallRange(wall1: Building, wall2: Building, allBuildings: Building[]): Building[] | null {
  // Check if walls are in a straight line (horizontal or vertical)
  const dx = wall2.positionX - wall1.positionX;
  const dy = wall2.positionY - wall1.positionY;

  // Not in a straight line
  if (dx !== 0 && dy !== 0) return null;

  // Get all walls in the range
  const rangeWalls: Building[] = [];
  const minX = Math.min(wall1.positionX, wall2.positionX);
  const maxX = Math.max(wall1.positionX, wall2.positionX);
  const minY = Math.min(wall1.positionY, wall2.positionY);
  const maxY = Math.max(wall1.positionY, wall2.positionY);

  if (dx === 0) {
    // Vertical line
    for (let y = minY; y <= maxY; y++) {
      const wall = allBuildings.find(b => b.type === 'wall' && b.positionX === wall1.positionX && b.positionY === y);
      if (!wall) return null; // Gap found
      rangeWalls.push(wall);
    }
  } else {
    // Horizontal line
    for (let x = minX; x <= maxX; x++) {
      const wall = allBuildings.find(b => b.type === 'wall' && b.positionX === x && b.positionY === wall1.positionY);
      if (!wall) return null; // Gap found
      rangeWalls.push(wall);
    }
  }

  return rangeWalls;
}
