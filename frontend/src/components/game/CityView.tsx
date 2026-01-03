'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, Sprite, Texture, Assets } from 'pixi.js';
import { ZoomIn, ZoomOut, Target, Home, Building2, Factory, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Property {
  id: string;
  tokenId: number;
  propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
  value: bigint;
  yieldRate: number;
  x: number;
  y: number;
}

interface OtherPlayerProperty extends Property {
  owner: string;
  isOwned: boolean;
}

interface CityViewProps {
  properties: Property[];
  otherPlayersProperties?: OtherPlayerProperty[];
  onPropertyClick?: (property: Property) => void;
  onOtherPropertyClick?: (property: OtherPlayerProperty) => void;
  onEmptyTileClick?: (x: number, y: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCenter?: () => void;
  zoom?: number;
  showZoomControls?: boolean;
  zoomControlsPosition?: 'bottom-right' | 'left-of-sidebar';
  centerOnCoordinate?: { x: number; y: number } | null;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const TILE_SIZE = 40;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

// Fixed map size - limited city grid
const GRID_WIDTH = 100; // 100 tiles wide
const GRID_HEIGHT = 100; // 100 tiles tall
const MAP_WIDTH = GRID_WIDTH * TILE_SIZE; // Total map width in pixels
const MAP_HEIGHT = GRID_HEIGHT * TILE_SIZE; // Total map height in pixels

// Viewport tiles for rendering
const VIEWPORT_TILES_X = Math.ceil(CANVAS_WIDTH / TILE_SIZE) + 10;
const VIEWPORT_TILES_Y = Math.ceil(CANVAS_HEIGHT / TILE_SIZE) + 10;

// Realistic colors for land, water, and city
const WATER_COLOR = 0x1e3a5f; // Deep blue water
const WATER_DEEP_COLOR = 0x0f1f3a; // Deeper water
const LAND_COLOR = 0x4a5d2e; // Green/brown land
const LAND_GRASS_COLOR = 0x5a6d3e; // Lighter grass
const CITY_GROUND_COLOR = 0x3a3a3a; // Gray urban ground
const CITY_ASPHALT_COLOR = 0x2a2a2a; // Dark asphalt
const ROOF_COLOR = 0x5a5a5a; // Gray roof
const BASE_BUILDING_COLOR = 0x6a6a6a; // Light gray building
const SIDE_SHADE_COLOR = 0x4a4a4a; // Darker gray shadow
const GRID_LINE_COLOR = 0x00d9ff; // Bright neon cyan/blue (more visible)

const PROPERTY_COLORS = {
  Residential: 0x4a90e2, // Blue
  Commercial: 0x50c878, // Green
  Industrial: 0xffa500, // Orange
  Luxury: 0xff69b4, // Pink/Purple
};

// Property icon colors (lighter, more vibrant)
const PROPERTY_ICON_COLORS = {
  Residential: 0x6ab0ff, // Light blue
  Commercial: 0x70d898, // Light green
  Industrial: 0xffb540, // Light orange
  Luxury: 0xff89c4, // Light pink
};

// Generate consistent building positions
const BUILDING_SEED = 12345;

export function CityView({ 
  properties, 
  otherPlayersProperties = [], 
  onPropertyClick,
  onOtherPropertyClick,
  onEmptyTileClick,
  onZoomIn,
  onZoomOut,
  onCenter,
  zoom: externalZoom,
  showZoomControls = true,
  zoomControlsPosition = 'bottom-right',
  centerOnCoordinate
}: CityViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const groundLayerRef = useRef<Container | null>(null);
  const buildingsLayerRef = useRef<Container | null>(null);
  const gridLayerRef = useRef<Container | null>(null);
  const propertiesLayerRef = useRef<Container | null>(null);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [internalZoom, setInternalZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [currentLocation, setCurrentLocation] = useState({ x: 0, y: 0 });
  
  // Use external zoom if provided, otherwise use internal state
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = externalZoom !== undefined ? (() => {}) : setInternalZoom;

  // Seeded random for consistent building placement
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Draw isometric 3D building (improved for better 3D effect)
  const drawIsometricBuilding = (graphics: Graphics, x: number, y: number, height: number) => {
    const centerX = x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = y * TILE_SIZE + TILE_SIZE / 2;
    const baseSize = TILE_SIZE * 0.65;
    const buildingHeight = height * 6;
    
    // Isometric projection
    const isoX = baseSize * 0.5;
    const isoY = baseSize * 0.25;
    
    // Top face (roof) - diamond
    const topPoints = [
      centerX, centerY - buildingHeight - isoY,
      centerX + isoX, centerY - buildingHeight,
      centerX, centerY - buildingHeight + isoY,
      centerX - isoX, centerY - buildingHeight,
    ];
    
    // Front face
    const frontPoints = [
      centerX - isoX, centerY - buildingHeight,
      centerX + isoX, centerY - buildingHeight,
      centerX + isoX, centerY,
      centerX - isoX, centerY,
    ];
    
    // Side face
    const sidePoints = [
      centerX + isoX, centerY - buildingHeight,
      centerX, centerY - buildingHeight + isoY,
      centerX, centerY + isoY,
      centerX + isoX, centerY,
    ];
    
    // Draw faces (back to front for proper depth)
    graphics.poly(sidePoints).fill({ color: SIDE_SHADE_COLOR, alpha: 0.9 });
    graphics.poly(frontPoints).fill({ color: BASE_BUILDING_COLOR, alpha: 0.95 });
    graphics.poly(topPoints).fill({ color: ROOF_COLOR, alpha: 0.9 });
    
    // Outlines for definition (realistic building edges)
    graphics.poly(sidePoints).setStrokeStyle({ width: 1, color: 0x3a3a3a, alpha: 0.7 }).stroke();
    graphics.poly(frontPoints).setStrokeStyle({ width: 1, color: 0x5a5a5a, alpha: 0.7 }).stroke();
    graphics.poly(topPoints).setStrokeStyle({ width: 1, color: 0x4a4a4a, alpha: 0.7 }).stroke();
  };

  // Draw property icon based on type
  const drawPropertyIcon = (graphics: Graphics, x: number, y: number, type: string, color: number, isOwned: boolean = true) => {
    const centerX = x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = y * TILE_SIZE + TILE_SIZE / 2;
    const iconSize = isOwned ? 20 : 16;
    const alpha = 1; // Make all properties fully opaque for solid colors
    
    graphics.clear();
    
    // Draw icon based on property type
    switch (type) {
      case 'Residential':
        // House icon
        graphics
          .rect(centerX - iconSize/2, centerY - iconSize/3, iconSize, iconSize * 0.6)
          .fill({ color, alpha });
        graphics
          .poly([
            centerX - iconSize/2, centerY - iconSize/3,
            centerX, centerY - iconSize/2,
            centerX + iconSize/2, centerY - iconSize/3,
          ])
          .fill({ color, alpha });
        break;
      case 'Commercial':
        // Shopping cart / store icon
        graphics
          .rect(centerX - iconSize/2, centerY - iconSize/2, iconSize, iconSize)
          .fill({ color, alpha });
        graphics
          .circle(centerX - iconSize/3, centerY + iconSize/3, iconSize/6)
          .fill({ color: 0xffffff, alpha: 0.8 });
        graphics
          .circle(centerX + iconSize/3, centerY + iconSize/3, iconSize/6)
          .fill({ color: 0xffffff, alpha: 0.8 });
        break;
      case 'Industrial':
        // Factory icon
        graphics
          .rect(centerX - iconSize/2, centerY - iconSize/2, iconSize * 0.4, iconSize)
          .fill({ color, alpha });
        graphics
          .rect(centerX - iconSize/6, centerY - iconSize/2, iconSize * 0.4, iconSize)
          .fill({ color, alpha });
        graphics
          .rect(centerX + iconSize/6, centerY - iconSize/2, iconSize * 0.4, iconSize)
          .fill({ color, alpha });
        // Chimney
        graphics
          .rect(centerX + iconSize/3, centerY - iconSize/2 - iconSize/4, iconSize/6, iconSize/4)
          .fill({ color, alpha: alpha * 0.8 });
        break;
      case 'Luxury':
        // Skyscraper icon
        graphics
          .rect(centerX - iconSize/3, centerY - iconSize/2, iconSize * 0.6, iconSize)
          .fill({ color, alpha });
        // Top section
        graphics
          .rect(centerX - iconSize/4, centerY - iconSize/2 - iconSize/4, iconSize * 0.5, iconSize/4)
          .fill({ color, alpha: alpha * 0.9 });
        // Windows
        for (let i = 0; i < 3; i++) {
          graphics
            .rect(centerX - iconSize/4, centerY - iconSize/3 + i * iconSize/4, iconSize * 0.5, iconSize/8)
            .fill({ color: 0xffffff, alpha: 0.3 });
        }
        break;
    }
    
    // Add prominent glow ring for owned properties
    if (isOwned) {
      // Outer glow ring (larger, more transparent)
      graphics
        .circle(centerX, centerY, iconSize * 1.2)
        .setStrokeStyle({ width: 3, color, alpha: 0.6 })
        .stroke();
      // Inner ring (smaller, more opaque)
      graphics
        .circle(centerX, centerY, iconSize * 0.9)
        .setStrokeStyle({ width: 2, color, alpha: 0.8 })
        .stroke();
      // Bright center ring
      graphics
        .circle(centerX, centerY, iconSize * 0.7)
        .setStrokeStyle({ width: 1.5, color, alpha: 1 })
        .stroke();
    }
  };

  // Initialize Pixi app
  useEffect(() => {
    if (!canvasRef.current || appRef.current) {
      return;
    }

    const initPixi = async () => {
      console.log('🎨 CityView: Initializing Pixi.js...');
      let app: Application;
      try {
        app = new Application();
        await app.init({
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 0x1a2a3a, // Sky blue background
          antialias: true,
        });

        if (canvasRef.current) {
          app.canvas.style.width = '100%';
          app.canvas.style.height = '100%';
          app.canvas.style.display = 'block';
          app.canvas.style.visibility = 'visible';
          app.canvas.style.position = 'absolute';
          app.canvas.style.top = '0';
          app.canvas.style.left = '0';
          app.canvas.style.zIndex = '10'; // Higher than sidebar for click handling
          app.canvas.style.pointerEvents = 'auto'; // Ensure canvas can receive pointer events
          
          canvasRef.current.appendChild(app.canvas);
          appRef.current = app;
        } else {
          return;
        }
      } catch (error) {
        console.error('❌ CityView: Failed to initialize Pixi.js:', error);
        return;
      }

      // Create layers
      const stage = new Container();
      const groundLayer = new Container();
      const buildingsLayer = new Container();
      const gridLayer = new Container();
      const propertiesLayer = new Container();

      stage.addChild(groundLayer);
      stage.addChild(buildingsLayer);
      stage.addChild(gridLayer);
      stage.addChild(propertiesLayer);
      app.stage.addChild(stage);

      stageRef.current = stage;
      groundLayerRef.current = groundLayer;
      buildingsLayerRef.current = buildingsLayer;
      gridLayerRef.current = gridLayer;
      propertiesLayerRef.current = propertiesLayer;

      // Determine terrain type for a tile
      const getTerrainType = (x: number, y: number): 'water' | 'land' | 'city' => {
        const seed = BUILDING_SEED + x * 1000 + y;
        const rand = seededRandom(seed);
        
        // Create water bodies (rivers, lakes) - ~15% of map
        // Water tends to form in clusters
        const waterNoise = seededRandom(seed * 7) + seededRandom(seed * 11) * 0.5;
        if (waterNoise < 0.15) {
          return 'water';
        }
        
        // City areas - ~40% of non-water tiles (urban development)
        // Cities form in clusters too
        const cityNoise = seededRandom(seed * 13) + seededRandom(seed * 17) * 0.5;
        if (cityNoise < 0.4) {
          return 'city';
        }
        
        // Rest is land (grassland, fields)
        return 'land';
      };

      // Function to render visible tiles (for fixed map)
      const renderVisibleTiles = () => {
        if (!stageRef.current) return;
        
        const stage = stageRef.current;
        // Get current zoom from stage scale (most accurate)
        const currentZoom = Math.max(0.1, stage.scale.x); // Ensure zoom is never 0 or negative
        
        // Calculate visible tile range based on stage position and zoom
        // Stage position is negative when panned (e.g., -100 means panned 100px left)
        // We need to account for the zoom when calculating which tiles are visible
        const viewX = Math.floor(-stage.x / (TILE_SIZE * currentZoom));
        const viewY = Math.floor(-stage.y / (TILE_SIZE * currentZoom));
        
        // Clear layers (but keep properties layer - it's managed separately)
        groundLayer.removeChildren();
        buildingsLayer.removeChildren();
        gridLayer.removeChildren();
        
        const occupiedTiles = new Set<string>();
        properties.forEach(p => occupiedTiles.add(`${p.x},${p.y}`));
        otherPlayersProperties.forEach(p => occupiedTiles.add(`${p.x},${p.y}`));
        
        // Render visible tiles within fixed grid boundaries
        // Add extra buffer to prevent white edges during panning
        const buffer = 10; // Extra tiles to render outside viewport
        const startX = Math.max(0, viewX - buffer);
        const endX = Math.min(GRID_WIDTH - 1, viewX + VIEWPORT_TILES_X + buffer);
        const startY = Math.max(0, viewY - buffer);
        const endY = Math.min(GRID_HEIGHT - 1, viewY + VIEWPORT_TILES_Y + buffer);
        
        for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
            const tileX = x * TILE_SIZE;
            const tileY = y * TILE_SIZE;
            const tileKey = `${x},${y}`;
            const terrainType = getTerrainType(x, y);
            
            // Ground tile with realistic colors
            const groundGraphics = new Graphics();
            const seed = BUILDING_SEED + x * 1000 + y;
            
            if (terrainType === 'water') {
              // Water tiles - deep blue with wave patterns
              const waterDepth = seededRandom(seed + 1);
              const waterColor = waterDepth > 0.5 ? WATER_DEEP_COLOR : WATER_COLOR;
              groundGraphics
                .rect(tileX, tileY, TILE_SIZE, TILE_SIZE)
                .fill({ color: waterColor, alpha: 1 });
              
              // Wave patterns
              for (let i = 0; i < 2; i++) {
                const waveSeed = seed + i * 50;
                const waveX = tileX + TILE_SIZE * seededRandom(waveSeed);
                const waveY = tileY + TILE_SIZE * seededRandom(waveSeed + 1);
                groundGraphics
                  .ellipse(waveX, waveY, TILE_SIZE * 0.3, TILE_SIZE * 0.1)
                  .fill({ color: 0x2a4a6f, alpha: 0.3 });
              }
            } else if (terrainType === 'city') {
              // City tiles - gray asphalt/concrete
              groundGraphics
                .rect(tileX, tileY, TILE_SIZE, TILE_SIZE)
                .fill({ color: CITY_GROUND_COLOR, alpha: 1 });
              
              // Road markings and texture
              const roadPattern = seededRandom(seed + 2);
              if (roadPattern < 0.3) {
                // Road lines
                groundGraphics
                  .rect(tileX, tileY + TILE_SIZE / 2 - 1, TILE_SIZE, 2)
                  .fill({ color: CITY_ASPHALT_COLOR, alpha: 0.8 });
              }
              
              // City texture (small dots for asphalt texture)
              for (let i = 0; i < 3; i++) {
                const textureSeed = seed + i * 100;
                const dotX = tileX + TILE_SIZE * (0.2 + seededRandom(textureSeed) * 0.6);
                const dotY = tileY + TILE_SIZE * (0.2 + seededRandom(textureSeed + 1) * 0.6);
                groundGraphics
                  .circle(dotX, dotY, 1)
                  .fill({ color: CITY_ASPHALT_COLOR, alpha: 0.4 });
              }
            } else {
              // Land tiles - green/brown with grass texture
              const grassVariation = seededRandom(seed + 3);
              const grassColor = grassVariation > 0.5 ? LAND_GRASS_COLOR : LAND_COLOR;
              groundGraphics
                .rect(tileX, tileY, TILE_SIZE, TILE_SIZE)
                .fill({ color: grassColor, alpha: 1 });
              
              // Grass texture patterns
              for (let i = 0; i < 4; i++) {
                const grassSeed = seed + i * 100;
                const grassX = tileX + TILE_SIZE * (0.15 + seededRandom(grassSeed) * 0.7);
                const grassY = tileY + TILE_SIZE * (0.15 + seededRandom(grassSeed + 1) * 0.7);
                const grassSize = 1 + seededRandom(grassSeed + 2) * 1.5;
                groundGraphics
                  .circle(grassX, grassY, grassSize)
                  .fill({ color: 0x3a4d2e, alpha: 0.4 });
              }
            }
            
            groundLayer.addChild(groundGraphics);
            
            // Background buildings only in city areas and not on property tiles
            if (terrainType === 'city' && !occupiedTiles.has(tileKey)) {
              const buildingSeed = BUILDING_SEED + x * 1000 + y;
              if (seededRandom(buildingSeed) < 0.5) { // More buildings in city areas
                const buildingGraphics = new Graphics();
                const height = 1 + Math.floor(seededRandom(buildingSeed + 1) * 5);
                drawIsometricBuilding(buildingGraphics, x, y, height);
                buildingsLayer.addChild(buildingGraphics);
              }
            }
          }
        }
        
        // Grid lines (only visible tiles) - bright neon blue
      const gridGraphics = new Graphics();
        gridGraphics.setStrokeStyle({ width: 1.5, color: GRID_LINE_COLOR, alpha: 0.9 });
        
        // Draw grid lines within fixed boundaries
        const gridStartX = Math.max(0, viewX - 5);
        const gridEndX = Math.min(GRID_WIDTH, viewX + VIEWPORT_TILES_X + 5);
        const gridStartY = Math.max(0, viewY - 5);
        const gridEndY = Math.min(GRID_HEIGHT, viewY + VIEWPORT_TILES_Y + 5);
        
        for (let x = gridStartX; x <= gridEndX; x++) {
          const px = x * TILE_SIZE;
          gridGraphics.moveTo(px, gridStartY * TILE_SIZE);
          gridGraphics.lineTo(px, gridEndY * TILE_SIZE);
        }
        
        for (let y = gridStartY; y <= gridEndY; y++) {
          const py = y * TILE_SIZE;
          gridGraphics.moveTo(gridStartX * TILE_SIZE, py);
          gridGraphics.lineTo(gridEndX * TILE_SIZE, py);
      }
      
      gridGraphics.stroke();
      gridLayer.addChild(gridGraphics);
      };

      // Initial render
      renderVisibleTiles();

      // Make stage interactive
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      
      let isPanning = false;
      let panStartX = 0;
      let panStartY = 0;
      let hasMoved = false; // Track if mouse moved during drag
      let panStartStageX = 0;
      let panStartStageY = 0;
      let renderTimeout: number | null = null; // For debouncing renders during panning
      let lastRenderTime = 0;
      const RENDER_THROTTLE_MS = 100; // Only render every 100ms during panning
      
      app.stage.on('pointerdown', (e) => {
        if (e.button === 0) {
          isPanning = true;
          hasMoved = false;
          // Store the starting mouse position and stage position
          panStartX = e.global.x;
          panStartY = e.global.y;
          panStartStageX = stage.x;
          panStartStageY = stage.y;
        }
      });
      
      app.stage.on('pointermove', (e) => {
        if (isPanning) {
          // Calculate how much the mouse moved
          const deltaX = e.global.x - panStartX;
          const deltaY = e.global.y - panStartY;
          
          // Check if mouse has moved significantly (to distinguish drag from click)
          if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            hasMoved = true;
          }
          
          // Calculate new stage position based on mouse movement
          let newX = panStartStageX + deltaX;
          let newY = panStartStageY + deltaY;
          
          // Get current zoom from stage scale (most accurate)
          const currentZoom = stage.scale.x;
          
          // Get actual container dimensions
          const containerWidth = canvasRef.current?.clientWidth || CANVAS_WIDTH;
          const containerHeight = canvasRef.current?.clientHeight || CANVAS_HEIGHT;
          
          // Calculate map dimensions at current zoom
          const scaledMapWidth = MAP_WIDTH * currentZoom;
          const scaledMapHeight = MAP_HEIGHT * currentZoom;
          
          // Only constrain if map is larger than viewport
          if (scaledMapWidth > containerWidth) {
            const maxX = 0; // Can't pan right past left edge
            const minX = -(scaledMapWidth - containerWidth); // Can't pan left past right edge
            newX = Math.max(minX, Math.min(maxX, newX));
          }
          // If map is smaller, allow free panning (no constraint)
          
          if (scaledMapHeight > containerHeight) {
            const maxY = 0; // Can't pan down past top edge
            const minY = -(scaledMapHeight - containerHeight); // Can't pan up past bottom edge
            newY = Math.max(minY, Math.min(maxY, newY));
          }
          // If map is smaller, allow free panning (no constraint)
          
          // Update stage position immediately for smooth panning (no rendering needed)
          // The stage position change will move the existing graphics smoothly
          stage.x = newX;
          stage.y = newY;
          setPanX(stage.x);
          setPanY(stage.y);
          
          // Don't render tiles during active panning - just move the stage
          // This prevents white screens and performance issues
          // We'll render when panning stops
        }
      });
      
      app.stage.on('pointerup', () => {
        isPanning = false;
        hasMoved = false;
        // Render tiles when panning stops to update visible area
        if (renderTimeout) {
          cancelAnimationFrame(renderTimeout);
        }
        renderTimeout = requestAnimationFrame(() => {
          try {
            renderVisibleTiles();
            lastRenderTime = Date.now();
          } catch (error) {
            console.error('Error rendering tiles after pan:', error);
          }
        });
      });
      
      app.stage.on('pointerupoutside', () => {
        isPanning = false;
        hasMoved = false;
        // Render tiles when panning stops to update visible area
        if (renderTimeout) {
          cancelAnimationFrame(renderTimeout);
        }
        renderTimeout = requestAnimationFrame(() => {
          try {
            renderVisibleTiles();
            lastRenderTime = Date.now();
          } catch (error) {
            console.error('Error rendering tiles after pan:', error);
          }
        });
      });

      setSpritesLoaded(true);
      console.log('✅ CityView: Initialization complete');
    };

    initPixi();

    const handleResize = () => {
      // Canvas size is fixed, but we can adjust if needed
    };
    
    window.addEventListener('resize', handleResize);
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (stageRef.current) {
        const currentZoom = stageRef.current.scale.x;
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));
        
        // Update zoom
        stageRef.current.scale.set(newZoom);
        
        // Use external handlers if provided
        if (delta > 0 && onZoomIn) {
          onZoomIn();
        } else if (delta < 0 && onZoomOut) {
          onZoomOut();
        } else {
          // Update internal zoom if no external handlers
          setInternalZoom(newZoom);
        }
      }
    };
    
    if (canvasRef.current) {
      canvasRef.current.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('wheel', handleWheel);
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  // Update click handler
  useEffect(() => {
    if (!appRef.current || !spritesLoaded || !stageRef.current) return;
    
    const stage = appRef.current.stage;
    const mapStage = stageRef.current;
    let wasPanning = false;
    let panStartTime = 0;
    
    stage.on('pointerdown', () => {
      wasPanning = false;
      panStartTime = Date.now();
    });
    
    stage.on('pointermove', () => {
      if (Date.now() - panStartTime > 50) {
        wasPanning = true;
      }
    });
    
    stage.removeAllListeners('click');
    
    stage.on('click', (e) => {
      if (wasPanning) return;
      
      const worldX = (e.global.x - mapStage.x) / mapStage.scale.x;
      const worldY = (e.global.y - mapStage.y) / mapStage.scale.y;
      const x = Math.floor(worldX / TILE_SIZE);
      const y = Math.floor(worldY / TILE_SIZE);
      
      const yourProperty = properties.find(p => p.x === x && p.y === y);
      if (yourProperty) {
        onPropertyClick?.(yourProperty);
        return;
      }
      
      const otherProperty = otherPlayersProperties.find(p => p.x === x && p.y === y);
      if (otherProperty) {
        // Show other player's property details
        if (onOtherPropertyClick) {
          onOtherPropertyClick(otherProperty);
        }
        return;
      }
      
      onEmptyTileClick?.(x, y);
    });
  }, [properties, otherPlayersProperties, spritesLoaded, onPropertyClick, onEmptyTileClick, zoom, panX, panY]);

  // Render properties with icons
  useEffect(() => {
    if (!propertiesLayerRef.current || !spritesLoaded) {
      return;
    }

    const propertiesLayer = propertiesLayerRef.current;
    propertiesLayer.removeChildren();
    
    // Render other players' properties (show all, not just owned by current user)
    otherPlayersProperties.forEach((property) => {
      // Skip if coordinates are invalid or outside grid
      if (property.x < 0 || property.x >= GRID_WIDTH || property.y < 0 || property.y >= GRID_HEIGHT) {
        return;
      }
      
      const propertyGraphics = new Graphics();
      const color = PROPERTY_ICON_COLORS[property.propertyType];
      drawPropertyIcon(propertyGraphics, property.x, property.y, property.propertyType, color, false);

      const propertyContainer = new Container();
      propertyContainer.addChild(propertyGraphics);
      propertyContainer.visible = true;
      propertyContainer.alpha = 1; // Fully opaque for solid colors
      propertyContainer.eventMode = 'static';
      propertyContainer.cursor = 'pointer'; // Show pointer cursor to indicate clickable
      
      // Make other players' properties clickable to show details
      propertyContainer.hitArea = {
        contains: (x: number, y: number) => {
          const tileX = property.x * TILE_SIZE;
          const tileY = property.y * TILE_SIZE;
          return x >= tileX && x <= tileX + TILE_SIZE && 
                 y >= tileY && y <= tileY + TILE_SIZE;
        }
      };
      
      propertyContainer.on('pointerdown', (e) => {
        e.stopPropagation();
        console.log('📍 Other property clicked:', property);
        // Call handler to show other player's property details
        if (onOtherPropertyClick) {
          console.log('✅ Calling onOtherPropertyClick handler');
          onOtherPropertyClick(property);
        } else {
          console.warn('⚠️ onOtherPropertyClick handler not provided');
        }
      });

      propertiesLayer.addChild(propertyContainer);
    });

    // Render your properties with bright icons
    properties.forEach((property) => {
      // Skip if coordinates are invalid or outside grid
      if (property.x < 0 || property.x >= GRID_WIDTH || property.y < 0 || property.y >= GRID_HEIGHT) {
        return;
      }
      
      const propertyGraphics = new Graphics();
      const color = PROPERTY_ICON_COLORS[property.propertyType];
      drawPropertyIcon(propertyGraphics, property.x, property.y, property.propertyType, color, true);

      const propertyContainer = new Container();
      propertyContainer.addChild(propertyGraphics);
      propertyContainer.visible = true;
      propertyContainer.alpha = 1;
      propertyContainer.eventMode = 'static';
      propertyContainer.cursor = 'pointer';
      
      propertyContainer.hitArea = {
        contains: (x: number, y: number) => {
          const tileX = property.x * TILE_SIZE;
          const tileY = property.y * TILE_SIZE;
          return x >= tileX && x <= tileX + TILE_SIZE && 
                 y >= tileY && y <= tileY + TILE_SIZE;
        }
      };
      
      propertyContainer.on('pointerdown', (e) => {
        e.stopPropagation();
        onPropertyClick?.(property);
      });

      propertiesLayer.addChild(propertyContainer);
    });
      
      if (appRef.current) {
        appRef.current.renderer.render(appRef.current.stage);
      }
      
    console.log(`✅ CityView: Rendered ${properties.length} own properties and ${otherPlayersProperties.length} other players' properties`);
      }, [properties, otherPlayersProperties, spritesLoaded, onPropertyClick]);

  // Zoom functions - use external handlers if provided
  const handleZoomIn = () => {
    if (onZoomIn) {
      onZoomIn();
    } else if (appRef.current && stageRef.current) {
      const currentZoom = stageRef.current.scale.x;
      const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
      stageRef.current.scale.set(newZoom);
      setInternalZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (onZoomOut) {
      onZoomOut();
    } else if (appRef.current && stageRef.current) {
      const currentZoom = stageRef.current.scale.x;
      const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
      stageRef.current.scale.set(newZoom);
      setInternalZoom(newZoom);
    }
  };

  // Center on player properties
  const handleCenter = () => {
    if (onCenter) {
      onCenter();
    } else if (appRef.current && stageRef.current && properties.length > 0) {
      // Calculate center of all properties
      const avgX = properties.reduce((sum, p) => sum + p.x, 0) / properties.length;
      const avgY = properties.reduce((sum, p) => sum + p.y, 0) / properties.length;
      
      const containerWidth = canvasRef.current?.clientWidth || CANVAS_WIDTH;
      const containerHeight = canvasRef.current?.clientHeight || CANVAS_HEIGHT;
      
      // Get current zoom from stage scale
      const currentZoom = stageRef.current.scale.x;
      
      // Center the view on the average property position
      const targetX = avgX * TILE_SIZE * currentZoom;
      const targetY = avgY * TILE_SIZE * currentZoom;
      
      let newX = containerWidth / 2 - targetX;
      let newY = containerHeight / 2 - targetY;
      
      // Constrain to map boundaries
      const maxX = 0;
      const minX = -(MAP_WIDTH * currentZoom - containerWidth);
      const maxY = 0;
      const minY = -(MAP_HEIGHT * currentZoom - containerHeight);
      
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
      
      stageRef.current.x = newX;
      stageRef.current.y = newY;
      setPanX(stageRef.current.x);
      setPanY(stageRef.current.y);
    }
  };

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scale.set(zoom);
    }
  }, [zoom]);
  
  // Sync internal zoom with external zoom if provided
  useEffect(() => {
    if (externalZoom !== undefined && externalZoom !== internalZoom) {
      setInternalZoom(externalZoom);
      if (stageRef.current) {
        stageRef.current.scale.set(externalZoom);
      }
    }
  }, [externalZoom, internalZoom]);

  useEffect(() => {
    if (stageRef.current && canvasRef.current) {
      const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
      const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
      
      // Get current zoom from stage scale
      const currentZoom = stageRef.current.scale.x;
      
      // Constrain panning to map boundaries
      const maxX = 0;
      const minX = -(MAP_WIDTH * currentZoom - containerWidth);
      const maxY = 0;
      const minY = -(MAP_HEIGHT * currentZoom - containerHeight);
      
      const constrainedX = Math.max(minX, Math.min(maxX, panX));
      const constrainedY = Math.max(minY, Math.min(maxY, panY));
      
      stageRef.current.x = constrainedX;
      stageRef.current.y = constrainedY;
      
      // Update state if constrained
      if (constrainedX !== panX || constrainedY !== panY) {
        setPanX(constrainedX);
        setPanY(constrainedY);
      }
    }
  }, [panX, panY, zoom, externalZoom, internalZoom]);

  // Center on specific coordinate when requested
  useEffect(() => {
    if (centerOnCoordinate && appRef.current && stageRef.current && canvasRef.current) {
      const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
      const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
      
      // Get current zoom from stage scale
      const currentZoom = stageRef.current.scale.x;
      
      // Calculate target position
      const targetX = centerOnCoordinate.x * TILE_SIZE * currentZoom;
      const targetY = centerOnCoordinate.y * TILE_SIZE * currentZoom;
      
      let newX = containerWidth / 2 - targetX;
      let newY = containerHeight / 2 - targetY;
      
      // Constrain to map boundaries
      const maxX = 0;
      const minX = -(MAP_WIDTH * currentZoom - containerWidth);
      const maxY = 0;
      const minY = -(MAP_HEIGHT * currentZoom - containerHeight);
      
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
      
      stageRef.current.x = newX;
      stageRef.current.y = newY;
      setPanX(stageRef.current.x);
      setPanY(stageRef.current.y);
    }
  }, [centerOnCoordinate, zoom, externalZoom, internalZoom]);

  // Update current location display based on viewport center
  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    
    const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
    const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
    
    // Calculate the center of the viewport in world coordinates
    // The stage position (panX, panY) represents the top-left corner of the viewport
    // The center of the viewport in screen space is (containerWidth/2, containerHeight/2)
    // Convert screen center to world coordinates
    const screenCenterX = containerWidth / 2;
    const screenCenterY = containerHeight / 2;
    
    // World coordinates = (screen - pan) / zoom
    const worldX = (screenCenterX - panX) / zoom;
    const worldY = (screenCenterY - panY) / zoom;
    
    // Convert to tile coordinates
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    
    setCurrentLocation({ x: tileX, y: tileY });
  }, [panX, panY, zoom]);

  return (
    <div className="relative w-full h-full">
      {/* Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-[#00d9ff]/50 px-4 py-2 shadow-[0_0_10px_rgba(0,217,255,0.3)]">
        <h2 className="text-[#00d9ff] font-bold text-lg">Property Tycoon City</h2>
      </div>

      <div 
        ref={canvasRef} 
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      
      {/* Legend */}
      <div className="absolute top-20 right-4 z-20 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-[#00d9ff]/50 p-3 text-xs shadow-[0_0_10px_rgba(0,217,255,0.2)]">
        <p className="text-[#00d9ff] font-semibold mb-2">Property Types</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-300">Residential</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-300">Commercial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-gray-300">Industrial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-500 rounded"></div>
            <span className="text-gray-300">Luxury</span>
          </div>
        </div>
      </div>
      
      {/* Map Controls - only show if showZoomControls is true */}
      {showZoomControls && (
        <div className={`absolute z-20 flex flex-col gap-2 ${
          zoomControlsPosition === 'left-of-sidebar' 
            ? 'right-[420px] top-4' 
            : 'bottom-4 right-4'
        }`}>
          <Button
            onClick={handleZoomIn}
            size="icon"
            className="bg-gray-900/90 hover:bg-gray-800/90 text-[#00d9ff] border border-[#00d9ff]/50 shadow-[0_0_8px_rgba(0,217,255,0.3)] hover:shadow-[0_0_12px_rgba(0,217,255,0.5)]"
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleZoomOut}
            size="icon"
            className="bg-gray-900/90 hover:bg-gray-800/90 text-[#00d9ff] border border-[#00d9ff]/50 shadow-[0_0_8px_rgba(0,217,255,0.3)] hover:shadow-[0_0_12px_rgba(0,217,255,0.5)]"
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleCenter}
            size="icon"
            className="bg-gray-900/90 hover:bg-gray-800/90 text-[#00d9ff] border border-[#00d9ff]/50 shadow-[0_0_8px_rgba(0,217,255,0.3)] hover:shadow-[0_0_12px_rgba(0,217,255,0.5)]"
            title="Center on Your Properties"
          >
            <Target className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Location Info - Dynamic based on viewport center */}
      <div className="absolute bottom-4 left-4 z-20 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-[#00d9ff]/50 px-3 py-2 text-xs text-[#00d9ff] shadow-[0_0_10px_rgba(0,217,255,0.2)]">
        <p>LOC: {currentLocation.x >= 0 ? `${currentLocation.x}° N` : `${Math.abs(currentLocation.x)}° S`}, {currentLocation.y >= 0 ? `${currentLocation.y}° E` : `${Math.abs(currentLocation.y)}° W`}</p>
        <p>SECTOR: {String.fromCharCode(65 + Math.floor(currentLocation.x / 100))}-{Math.floor(currentLocation.y / 100)}</p>
      </div>
    </div>
  );
}
