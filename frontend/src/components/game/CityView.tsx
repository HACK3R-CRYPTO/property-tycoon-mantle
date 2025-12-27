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
    if (!canvasRef.current || appRef.current) return;

    const initPixi = async () => {
      const app = new Application();
      await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      if (canvasRef.current) {
        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;
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

      // Draw background terrain/land tiles (always draw all tiles as empty land)
      const terrainGraphics = new Graphics();
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          // Draw empty land tile with subtle pattern
          terrainGraphics.beginFill(0x2d2d44, 0.6); // Darker land color
          terrainGraphics.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          terrainGraphics.endFill();
          
          // Add subtle texture pattern (dots) to show it's buildable land
          terrainGraphics.beginFill(0x3a3a55, 0.3);
          terrainGraphics.drawCircle(x * TILE_SIZE + TILE_SIZE / 4, y * TILE_SIZE + TILE_SIZE / 4, 2);
          terrainGraphics.drawCircle(x * TILE_SIZE + (TILE_SIZE * 3) / 4, y * TILE_SIZE + (TILE_SIZE * 3) / 4, 2);
          terrainGraphics.endFill();
        }
      }
      gridLayer.addChild(terrainGraphics);

      // Draw grid lines (more visible)
      const gridGraphics = new Graphics();
      gridGraphics.lineStyle(1, 0x4a4a6e, 0.8); // More visible grid lines

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
    if (!propertiesLayerRef.current || !gridLayerRef.current || !spritesLoaded) return;

    // Clear existing properties
    propertiesLayerRef.current.removeChildren();
    

    // Render other players' properties first (dimmer, in background)
    otherPlayersProperties.forEach((property) => {
      if (property.isOwned) return; // Skip if it's yours (will render below)
      
      const propertyGraphics = new Graphics();
      const color = PROPERTY_COLORS[property.propertyType];
      
      // Draw other player's property (dimmer, with border)
      propertyGraphics.beginFill(color, 0.4); // Dimmer
      propertyGraphics.drawRect(
        property.x * TILE_SIZE + 2,
        property.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      propertyGraphics.endFill();
      
      // Dashed border to show it's not yours
      propertyGraphics.lineStyle(2, color, 0.6);
      propertyGraphics.drawRect(
        property.x * TILE_SIZE + 2,
        property.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Property type label (smaller, dimmer)
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

      propertyGraphics.addChild(label);
      propertyGraphics.eventMode = 'static';
      propertyGraphics.cursor = 'default';
      propertyGraphics.interactiveChildren = false;
      // Don't block clicks - let stage handle them
      propertyGraphics.hitArea = null;

      propertiesLayerRef.current.addChild(propertyGraphics);
    });

    // Render your properties on top (bright, clickable)
    properties.forEach((property) => {
      const propertyGraphics = new Graphics();
      const color = PROPERTY_COLORS[property.propertyType];
      
      // Draw property tile (bright)
      propertyGraphics.beginFill(color, 0.9);
      propertyGraphics.drawRect(
        property.x * TILE_SIZE + 2,
        property.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      propertyGraphics.endFill();
      
      // Bright border with glow effect
      propertyGraphics.lineStyle(3, color, 1);
      propertyGraphics.drawRect(
        property.x * TILE_SIZE + 2,
        property.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Property type label (bright)
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

      propertyGraphics.addChild(label);
      propertyGraphics.eventMode = 'static';
      propertyGraphics.cursor = 'pointer';
      propertyGraphics.interactiveChildren = false;
      // Set hitArea to only the property rectangle, not the full tile
      propertyGraphics.hitArea = {
        contains: (x: number, y: number) => {
          const tileX = property.x * TILE_SIZE + 2;
          const tileY = property.y * TILE_SIZE + 2;
          return x >= tileX && x <= tileX + TILE_SIZE - 4 && 
                 y >= tileY && y <= tileY + TILE_SIZE - 4;
        }
      };
      // Handle click on property
      propertyGraphics.on('pointerdown', (e) => {
        e.stopPropagation(); // Stop event from reaching stage
        onPropertyClick?.(property);
      });

      propertiesLayerRef.current.addChild(propertyGraphics);
    });
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
