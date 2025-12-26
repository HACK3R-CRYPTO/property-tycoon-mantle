'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, Sprite } from 'pixi.js';
import { useAccount } from 'wagmi';

interface Property {
  id: string;
  tokenId: number;
  propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
  value: bigint;
  x: number;
  y: number;
}

interface PropertyMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;
const TILE_SIZE = 40;

const PROPERTY_COLORS = {
  Residential: 0x4a90e2, // Blue
  Commercial: 0x50c878, // Green
  Industrial: 0xffa500, // Orange
  Luxury: 0xff69b4, // Pink
};

export function PropertyMap({ properties, onPropertyClick }: PropertyMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const { address } = useAccount();

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

      // Draw grid
      const gridGraphics = new Graphics();
      gridGraphics.lineStyle(1, 0x2a2a3e, 0.5);

      for (let x = 0; x <= GRID_SIZE; x++) {
        gridGraphics.moveTo(x * TILE_SIZE, 0);
        gridGraphics.lineTo(x * TILE_SIZE, CANVAS_HEIGHT);
      }

      for (let y = 0; y <= GRID_SIZE; y++) {
        gridGraphics.moveTo(0, y * TILE_SIZE);
        gridGraphics.lineTo(CANVAS_WIDTH, y * TILE_SIZE);
      }

      gridLayer.addChild(gridGraphics);

      // Render properties
      properties.forEach((property) => {
        const propertyGraphics = new Graphics();
        const color = PROPERTY_COLORS[property.propertyType];
        
        propertyGraphics.beginFill(color, 0.8);
        propertyGraphics.drawRect(property.x * TILE_SIZE, property.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        propertyGraphics.endFill();
        propertyGraphics.lineStyle(2, color, 1);
        propertyGraphics.drawRect(property.x * TILE_SIZE, property.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Add property label
        const label = new Text({
          text: property.propertyType[0],
          style: {
            fontSize: 16,
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

        propertiesLayer.addChild(propertyGraphics);
      });

      // Cleanup
      return () => {
        app.destroy(true, { children: true });
        appRef.current = null;
      };
    };

    initPixi();
  }, [properties, onPropertyClick]);

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-white/10 p-4">
      <h3 className="text-white mb-4 font-semibold">Property Portfolio Map</h3>
      <div ref={canvasRef} className="w-full flex justify-center" />
      <div className="mt-4 flex gap-4 justify-center text-xs text-gray-400">
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
  );
}

