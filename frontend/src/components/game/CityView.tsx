'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, Sprite } from 'pixi.js';

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
  onEmptyTileClick?: (x: number, y: number) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const TILE_SIZE = 40;

const PROPERTY_COLORS = {
  Residential: 0x4a90e2, // Blue
  Commercial: 0x50c878, // Green
  Industrial: 0xffa500, // Orange
  Luxury: 0xff69b4, // Pink
};

export function CityView({ properties, otherPlayersProperties = [], onPropertyClick, onEmptyTileClick }: CityViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const gridLayerRef = useRef<Container | null>(null);
  const propertiesLayerRef = useRef<Container | null>(null);
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Initialize Pixi app
  useEffect(() => {
    if (!canvasRef.current || appRef.current) {
      console.log('🚫 CityView: Skipping Pixi init', { 
        hasCanvasRef: !!canvasRef.current, 
        hasAppRef: !!appRef.current 
      });
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
          backgroundColor: 0x1a1a2e,
          antialias: true,
        });

        if (canvasRef.current) {
          canvasRef.current.appendChild(app.canvas);
          appRef.current = app;
          console.log('✅ CityView: Pixi.js initialized successfully', {
            canvasWidth: CANVAS_WIDTH,
            canvasHeight: CANVAS_HEIGHT,
            canvasElement: app.canvas,
          });
        } else {
          console.error('❌ CityView: canvasRef.current is null after init');
          return;
        }
      } catch (error) {
        console.error('❌ CityView: Failed to initialize Pixi.js:', error);
        return;
      }

      // Create layers
      const stage = new Container();
      const gridLayer = new Container();
      const propertiesLayer = new Container();

      stage.addChild(gridLayer);
      stage.addChild(propertiesLayer);
      app.stage.addChild(stage);

      stageRef.current = stage;
      gridLayerRef.current = gridLayer;
      propertiesLayerRef.current = propertiesLayer;

      console.log('✅ CityView: Layers created', {
        hasStage: !!stageRef.current,
        hasGridLayer: !!gridLayerRef.current,
        hasPropertiesLayer: !!propertiesLayerRef.current,
      });

      // Draw background terrain/land tiles (always draw all tiles as empty land)
      const terrainGraphics = new Graphics();
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          // Draw empty land tile with subtle pattern (PixiJS v8 API)
          terrainGraphics
            .rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            .fill({ color: 0x2d2d44, alpha: 0.6 });
          
          // Add subtle texture pattern (dots) to show it's buildable land
          terrainGraphics
            .circle(x * TILE_SIZE + TILE_SIZE / 4, y * TILE_SIZE + TILE_SIZE / 4, 2)
            .fill({ color: 0x3a3a55, alpha: 0.3 });
          terrainGraphics
            .circle(x * TILE_SIZE + (TILE_SIZE * 3) / 4, y * TILE_SIZE + (TILE_SIZE * 3) / 4, 2)
            .fill({ color: 0x3a3a55, alpha: 0.3 });
        }
      }
      gridLayer.addChild(terrainGraphics);

      // Draw grid lines (more visible) - PixiJS v8 API
      const gridGraphics = new Graphics();
      gridGraphics.setStrokeStyle({ width: 1, color: 0x4a4a6e, alpha: 0.8 });

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
      
      gridGraphics.stroke();

      gridLayer.addChild(gridGraphics);

      // Make stage interactive
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      
      app.stage.on('pointerdown', (e) => {
        const x = Math.floor(e.global.x / TILE_SIZE);
        const y = Math.floor(e.global.y / TILE_SIZE);
        
        // Validate coordinates
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;
        
        // Check if clicked on your property
        const yourProperty = properties.find(p => p.x === x && p.y === y);
        if (yourProperty) {
          onPropertyClick?.(yourProperty);
          return;
        }
        
        // Check if clicked on other player's property
        const otherProperty = otherPlayersProperties.find(p => p.x === x && p.y === y);
        if (otherProperty) {
          // Don't allow building on other players' properties
          return;
        }
        
        // It's an empty tile
        onEmptyTileClick?.(x, y);
      });

      setSpritesLoaded(true);
      console.log('✅ CityView: Sprites loaded, ready to render properties');
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  // Update click handler when properties or callbacks change
  useEffect(() => {
    if (!appRef.current || !spritesLoaded) return;
    
    const stage = appRef.current.stage;
    
    // Remove old pointerdown handler
    stage.removeAllListeners('pointerdown');
    
    // Add new handler that checks current properties
    stage.on('pointerdown', (e) => {
      const x = Math.floor(e.global.x / TILE_SIZE);
      const y = Math.floor(e.global.y / TILE_SIZE);
      
      // Validate coordinates
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;
      
      // Check if clicked on your property
      const yourProperty = properties.find(p => p.x === x && p.y === y);
      if (yourProperty) {
        onPropertyClick?.(yourProperty);
        return;
      }
      
      // Check if clicked on other player's property
      const otherProperty = otherPlayersProperties.find(p => p.x === x && p.y === y);
      if (otherProperty) {
        // Don't allow building on other players' properties
        return;
      }
      
      // It's an empty tile - call the handler
      console.log('Empty tile clicked:', x, y);
      onEmptyTileClick?.(x, y);
    });
  }, [properties, otherPlayersProperties, spritesLoaded, onPropertyClick, onEmptyTileClick]);

  // Render properties (yours and other players') and selected tile
  useEffect(() => {
    console.log('🎨 CityView: Render effect triggered', {
      hasPropertiesLayer: !!propertiesLayerRef.current,
      hasGridLayer: !!gridLayerRef.current,
      spritesLoaded,
      propertiesCount: properties.length,
    });

    if (!propertiesLayerRef.current || !gridLayerRef.current || !spritesLoaded) {
      console.warn('⚠️ CityView: Cannot render - missing refs or sprites not loaded', {
        hasPropertiesLayer: !!propertiesLayerRef.current,
        hasGridLayer: !!gridLayerRef.current,
        spritesLoaded,
      });
      return;
    }

    // Store ref value to avoid TypeScript null checks
    const propertiesLayer = propertiesLayerRef.current;

    // Clear existing properties
    propertiesLayer.removeChildren();
    console.log('🧹 CityView: Cleared existing properties');
    

    // Render other players' properties first (dimmer, in background)
    otherPlayersProperties.forEach((property) => {
      if (property.isOwned) return; // Skip if it's yours (will render below)
      
      const propertyGraphics = new Graphics();
      const color = PROPERTY_COLORS[property.propertyType];
      
      // Draw other player's property (dimmer, with border) - PixiJS v8 API
      const xPos = property.x * TILE_SIZE + 2;
      const yPos = property.y * TILE_SIZE + 2;
      
      propertyGraphics
        .rect(xPos, yPos, TILE_SIZE - 4, TILE_SIZE - 4)
        .fill({ color, alpha: 0.4 });
      
      // Dashed border to show it's not yours
      propertyGraphics
        .rect(xPos, yPos, TILE_SIZE - 4, TILE_SIZE - 4)
        .setStrokeStyle({ width: 2, color, alpha: 0.6 })
        .stroke();

      // Property type label (smaller, dimmer) - Create container for Graphics + Text
      const propertyContainer = new Container();
      propertyContainer.addChild(propertyGraphics);
      
      const label = new Text({
        text: property.propertyType[0],
        style: {
          fontSize: 14,
          fill: 0xaaaaaa,
          fontWeight: 'bold',
        },
      });
      label.x = property.x * TILE_SIZE + TILE_SIZE / 2 - label.width / 2;
      label.y = property.y * TILE_SIZE + TILE_SIZE / 2 - label.height / 2;
      propertyContainer.addChild(label);
      propertyContainer.eventMode = 'static';
      propertyContainer.cursor = 'default';
      propertyContainer.interactiveChildren = false;
      // Don't block clicks - let stage handle them
      propertyContainer.hitArea = null;

      propertiesLayer.addChild(propertyContainer);
    });

    // Render your properties on top (bright, clickable)
    console.log(`🎨 CityView: Rendering ${properties.length} properties`);
    properties.forEach((property) => {
      const propertyGraphics = new Graphics();
      const color = PROPERTY_COLORS[property.propertyType];
      
      const xPos = property.x * TILE_SIZE + 2;
      const yPos = property.y * TILE_SIZE + 2;
      
      console.log(`🎨 CityView: Drawing property #${property.tokenId} at (${property.x}, ${property.y}) -> pixel (${xPos}, ${yPos})`, {
        propertyType: property.propertyType,
        color: color.toString(16),
        tileSize: TILE_SIZE,
      });
      
      // Draw property tile (bright) - PixiJS v8 API
      propertyGraphics
        .rect(xPos, yPos, TILE_SIZE - 4, TILE_SIZE - 4)
        .fill({ color, alpha: 0.9 });
      
      // Bright border with glow effect
      propertyGraphics
        .rect(xPos, yPos, TILE_SIZE - 4, TILE_SIZE - 4)
        .setStrokeStyle({ width: 3, color, alpha: 1 })
        .stroke();

      // Property type label (bright) - Create container for Graphics + Text
      const propertyContainer = new Container();
      propertyContainer.addChild(propertyGraphics);
      
      const label = new Text({
        text: property.propertyType[0],
        style: {
          fontSize: 20,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      label.x = property.x * TILE_SIZE + TILE_SIZE / 2 - label.width / 2;
      label.y = property.y * TILE_SIZE + TILE_SIZE / 2 - label.height / 2;
      propertyContainer.addChild(label);
      
      propertyContainer.eventMode = 'static';
      propertyContainer.cursor = 'pointer';
      propertyContainer.interactiveChildren = false;
      // Set hitArea to only the property rectangle, not the full tile
      propertyContainer.hitArea = {
        contains: (x: number, y: number) => {
          const tileX = property.x * TILE_SIZE + 2;
          const tileY = property.y * TILE_SIZE + 2;
          return x >= tileX && x <= tileX + TILE_SIZE - 4 && 
                 y >= tileY && y <= tileY + TILE_SIZE - 4;
        }
      };
      // Handle click on property
      propertyContainer.on('pointerdown', (e) => {
        e.stopPropagation(); // Stop event from reaching stage
        onPropertyClick?.(property);
      });

      propertiesLayer.addChild(propertyContainer);
      console.log(`✅ CityView: Added property #${property.tokenId} graphics to layer`, {
        childrenCount: propertiesLayer.children.length,
      });
    });
    
    console.log(`✅ CityView: Finished rendering. Total children in propertiesLayer: ${propertiesLayer.children.length}`);
      }, [properties, otherPlayersProperties, spritesLoaded, onPropertyClick]);

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-white/10 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Your Property Portfolio</h3>
        <div className="flex gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>Residential</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Commercial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span>Industrial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-500 rounded" />
            <span>Luxury</span>
          </div>
        </div>
      </div>
      <div ref={canvasRef} className="w-full flex justify-center rounded-lg overflow-hidden border border-white/10" />
    </div>
  );
}
