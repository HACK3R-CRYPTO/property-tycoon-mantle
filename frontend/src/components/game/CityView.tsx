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

interface CityViewProps {
  properties: Property[];
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

export function CityView({ properties, onPropertyClick, onEmptyTileClick }: CityViewProps) {
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

      // Draw grid
      const gridGraphics = new Graphics();
      gridGraphics.lineStyle(1, 0x2a2a3e, 0.5);

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
        
        // Check if clicked on property
        const property = properties.find(p => p.x === x && p.y === y);
        if (property) {
          onPropertyClick?.(property);
        } else {
          onEmptyTileClick?.(x, y);
        }
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

  // Render properties
  useEffect(() => {
    if (!propertiesLayerRef.current || !spritesLoaded) return;

    // Clear existing properties
    propertiesLayerRef.current.removeChildren();

    properties.forEach((property) => {
      const propertyGraphics = new Graphics();
      const color = PROPERTY_COLORS[property.propertyType];
      
      // Draw property tile
      propertyGraphics.beginFill(color, 0.8);
      propertyGraphics.drawRect(
        property.x * TILE_SIZE + 2,
        property.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      propertyGraphics.endFill();
      
      // Border
      propertyGraphics.lineStyle(2, color, 1);
      propertyGraphics.drawRect(
        property.x * TILE_SIZE + 2,
        property.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Property type label
      const label = new Text({
        text: property.propertyType[0],
        style: {
          fontSize: 18,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      label.x = property.x * TILE_SIZE + TILE_SIZE / 2 - label.width / 2;
      label.y = property.y * TILE_SIZE + TILE_SIZE / 2 - label.height / 2;

      propertyGraphics.addChild(label);
      propertyGraphics.eventMode = 'static';
      propertyGraphics.cursor = 'pointer';
      propertyGraphics.on('pointerdown', () => {
        onPropertyClick?.(property);
      });

      propertiesLayerRef.current.addChild(propertyGraphics);
    });
  }, [properties, spritesLoaded, onPropertyClick]);

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

