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
// Isometric tile dimensions (diamond shape: 40 wide, 20 tall)
const ISO_TILE_WIDTH = 40;
const ISO_TILE_HEIGHT = 20;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

// Fixed map size - limited city grid
const GRID_WIDTH = 100; // 100 tiles wide
const GRID_HEIGHT = 100; // 100 tiles tall
// Isometric map dimensions (approximate)
const MAP_WIDTH = GRID_WIDTH * ISO_TILE_WIDTH; // Total map width in pixels
const MAP_HEIGHT = GRID_HEIGHT * ISO_TILE_HEIGHT; // Total map height in pixels

// Viewport tiles for rendering
const VIEWPORT_TILES_X = Math.ceil(CANVAS_WIDTH / ISO_TILE_WIDTH) + 10;
const VIEWPORT_TILES_Y = Math.ceil(CANVAS_HEIGHT / ISO_TILE_HEIGHT) + 10;

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

  // Isometric coordinate conversion (like noodle-quest)
  const calcXPos = (x: number, y: number, gameScale: number = 1): number => {
    const tileWidth = ISO_TILE_WIDTH * gameScale;
    return x * tileWidth / 2 - y * tileWidth / 2 + (GRID_WIDTH * tileWidth / 2);
  };

  const calcYPos = (x: number, y: number, gameScale: number = 1): number => {
    const tileHeight = ISO_TILE_HEIGHT * gameScale;
    return x * tileHeight / 2 + y * tileHeight / 2 + (tileHeight * 2);
  };

  const calcZPos = (x: number, y: number): number => {
    return x * 1 + y * 1;
  };

  // Draw isometric diamond tile (water, land, or city)
  const drawIsometricTile = (graphics: Graphics, x: number, y: number, terrainType: 'water' | 'land', gameScale: number = 1) => {
    const l = calcXPos(x, y, gameScale);
    const t = calcYPos(x, y, gameScale);
    const tileWidth = ISO_TILE_WIDTH * gameScale;
    const tileHeight = ISO_TILE_HEIGHT * gameScale;
    
    // Diamond shape points (isometric)
    const points = [
      l, t, // Top
      l + tileWidth / 2, t + tileHeight / 2, // Right
      l, t + tileHeight, // Bottom
      l - tileWidth / 2, t + tileHeight / 2, // Left
    ];
    
    graphics.clear();
    
    // Fill based on terrain type
    if (terrainType === 'water') {
      // Water - noodle quest style: deeper blue base with lighter highlights
      const waterBase = 0x2d5a8f; // Deep blue
      const waterLight = 0x4a7ab8; // Lighter blue for highlights
      const waterDark = 0x1a3a6a; // Darker blue for depth
      
      graphics.poly(points).fill({ color: waterBase, alpha: 1 });
      
      // Add noodle quest style water pattern - diagonal stripes for depth
      // Top-left to bottom-right diagonal highlight
      const highlightPoints = [
        l - tileWidth / 2, t,
        l, t + tileHeight / 2,
        l - tileWidth / 4, t + tileHeight * 0.75,
        l - tileWidth * 0.75, t + tileHeight * 0.5,
      ];
      graphics.poly(highlightPoints).fill({ color: waterLight, alpha: 0.6 });
      
      // Darker diagonal for depth
      const darkPoints = [
        l + tileWidth / 2, t + tileHeight / 2,
        l, t + tileHeight,
        l - tileWidth / 4, t + tileHeight * 0.75,
        l + tileWidth / 4, t + tileHeight * 0.5,
      ];
      graphics.poly(darkPoints).fill({ color: waterDark, alpha: 0.4 });
      
      // Subtle border for water tiles
      graphics.poly(points).setStrokeStyle({ width: 1, color: 0x1a4a7a, alpha: 0.5 }).stroke();
    } else {
      // Land - green grass
      graphics.poly(points).fill({ color: 0x4fb848, alpha: 1 });
      // Grass texture (zigzag lines)
      for (let i = 0; i < 3; i++) {
        const grassY = t + (tileHeight / 4) * (i + 1);
        graphics.moveTo(l - tileWidth / 2, grassY);
        for (let j = 0; j < 4; j++) {
          const grassX = l - tileWidth / 2 + (tileWidth / 3) * j;
          const grassOffset = (j % 2 === 0 ? 1 : -1) * gameScale;
          graphics.lineTo(grassX, grassY + grassOffset);
        }
        graphics.lineTo(l + tileWidth / 2, grassY);
        graphics.setStrokeStyle({ width: 0.5, color: 0x78c36a, alpha: 0.6 });
        graphics.stroke();
      }
    }
    
    // Border
    graphics.poly(points).setStrokeStyle({ width: 0.5, color: 0x999999, alpha: 0.5 }).stroke();
  };

  // Draw isometric tree (noodle quest pixel art style)
  const drawIsometricTree = (graphics: Graphics, x: number, y: number, gameScale: number = 1) => {
    const l = calcXPos(x, y, gameScale);
    const t = calcYPos(x, y, gameScale);
    const tileWidth = ISO_TILE_WIDTH * gameScale;
    const tileHeight = ISO_TILE_HEIGHT * gameScale;
    
    const centerX = l;
    const centerY = t + tileHeight / 2;
    
    graphics.clear();
    
    // Tree trunk (noodle quest style - more defined, pixelated)
    const trunkHeight = 10 * gameScale;
    const trunkWidth = 4 * gameScale;
    const trunkIsoX = trunkWidth * 0.5;
    const trunkIsoY = trunkWidth * 0.25;
    
    // Trunk colors (darker, more defined)
    const trunkDark = 0x4a2a1a; // Dark brown
    const trunkMid = 0x6a4a2a; // Medium brown
    const trunkLight = 0x7a5a3a; // Light brown highlight
    
    // Trunk front face
    const trunkFront = [
      centerX - trunkIsoX, centerY - trunkHeight,
      centerX + trunkIsoX, centerY - trunkHeight,
      centerX + trunkIsoX, centerY,
      centerX - trunkIsoX, centerY,
    ];
    
    // Trunk side face
    const trunkSide = [
      centerX + trunkIsoX, centerY - trunkHeight,
      centerX, centerY - trunkHeight + trunkIsoY,
      centerX, centerY + trunkIsoY,
      centerX + trunkIsoX, centerY,
    ];
    
    graphics.poly(trunkSide).fill({ color: trunkDark, alpha: 1 }); // Dark side
    graphics.poly(trunkFront).fill({ color: trunkMid, alpha: 1 }); // Main trunk
    
    // Trunk highlight (left edge)
    const trunkHighlight = [
      centerX - trunkIsoX, centerY - trunkHeight,
      centerX - trunkIsoX * 0.5, centerY - trunkHeight + trunkIsoY * 0.5,
      centerX - trunkIsoX * 0.5, centerY - trunkHeight * 0.3,
      centerX - trunkIsoX, centerY - trunkHeight * 0.5,
    ];
    graphics.poly(trunkHighlight).fill({ color: trunkLight, alpha: 0.7 });
    
    // Tree foliage (noodle quest style - layered, more detailed)
    const foliageSize = 14 * gameScale;
    const foliageHeight = trunkHeight + 2 * gameScale;
    const foliageIsoX = foliageSize * 0.5;
    const foliageIsoY = foliageSize * 0.25;
    
    // Foliage colors (more vibrant, layered)
    const foliageDark = 0x1a5a1a; // Dark green (shadow)
    const foliageMid = 0x2a7a2a; // Medium green
    const foliageLight = 0x3a9a3a; // Light green
    const foliageBright = 0x4aba4a; // Bright green highlight
    
    // Foliage top (diamond shape - noodle quest style)
    const foliageTop = [
      centerX, centerY - foliageHeight - foliageIsoY,
      centerX + foliageIsoX, centerY - foliageHeight,
      centerX, centerY - foliageHeight + foliageIsoY,
      centerX - foliageIsoX, centerY - foliageHeight,
    ];
    
    // Foliage front (trapezoid)
    const foliageFront = [
      centerX - foliageIsoX, centerY - foliageHeight,
      centerX + foliageIsoX, centerY - foliageHeight,
      centerX + foliageIsoX * 0.8, centerY - trunkHeight,
      centerX - foliageIsoX * 0.8, centerY - trunkHeight,
    ];
    
    // Foliage side
    const foliageSide = [
      centerX + foliageIsoX, centerY - foliageHeight,
      centerX, centerY - foliageHeight + foliageIsoY,
      centerX, centerY - trunkHeight + trunkIsoY,
      centerX + foliageIsoX * 0.8, centerY - trunkHeight,
    ];
    
    // Draw foliage layers (back to front)
    graphics.poly(foliageSide).fill({ color: foliageDark, alpha: 1 }); // Dark side
    graphics.poly(foliageFront).fill({ color: foliageMid, alpha: 1 }); // Main foliage
    graphics.poly(foliageTop).fill({ color: foliageLight, alpha: 1 }); // Top layer
    
    // Foliage highlight (top-left edge - noodle quest style)
    const foliageHighlight = [
      centerX - foliageIsoX * 0.6, centerY - foliageHeight,
      centerX, centerY - foliageHeight - foliageIsoY * 0.5,
      centerX - foliageIsoX * 0.3, centerY - foliageHeight - foliageIsoY * 0.3,
      centerX - foliageIsoX * 0.8, centerY - foliageHeight + foliageIsoY * 0.2,
    ];
    graphics.poly(foliageHighlight).fill({ color: foliageBright, alpha: 0.6 });
    
    // Outlines (noodle quest pixel art style - defined edges)
    graphics.poly(foliageTop).setStrokeStyle({ width: 1.5, color: 0x1a4a1a, alpha: 0.9 }).stroke();
    graphics.poly(foliageFront).setStrokeStyle({ width: 1, color: 0x2a5a2a, alpha: 0.8 }).stroke();
    graphics.poly(trunkFront).setStrokeStyle({ width: 1, color: 0x3a2a1a, alpha: 0.9 }).stroke();
  };

  // Draw isometric 3D building for background city
  const drawIsometricBuilding = (graphics: Graphics, x: number, y: number, height: number, gameScale: number = 1) => {
    const l = calcXPos(x, y, gameScale);
    const t = calcYPos(x, y, gameScale);
    const tileWidth = ISO_TILE_WIDTH * gameScale;
    const tileHeight = ISO_TILE_HEIGHT * gameScale;
    const buildingHeight = height * 8 * gameScale;
    
    const centerX = l;
    const centerY = t + tileHeight / 2;
    const baseSize = tileWidth * 0.6;
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
    
    // Outlines
    graphics.poly(sidePoints).setStrokeStyle({ width: 1, color: 0x3a3a3a, alpha: 0.7 }).stroke();
    graphics.poly(frontPoints).setStrokeStyle({ width: 1, color: 0x5a5a5a, alpha: 0.7 }).stroke();
    graphics.poly(topPoints).setStrokeStyle({ width: 1, color: 0x4a4a4a, alpha: 0.7 }).stroke();
  };

  // Draw isometric 3D property building based on type - improved realistic design
  const drawPropertyBuilding = (graphics: Graphics, x: number, y: number, type: string, color: number, isOwned: boolean = true, gameScale: number = 1) => {
    const l = calcXPos(x, y, gameScale);
    const t = calcYPos(x, y, gameScale);
    const tileWidth = ISO_TILE_WIDTH * gameScale;
    const tileHeight = ISO_TILE_HEIGHT * gameScale;
    
    const centerX = l;
    const centerY = t + tileHeight / 2;
    const baseSize = tileWidth * 0.75; // Larger base for better visibility
    const isoX = baseSize * 0.5;
    const isoY = baseSize * 0.25;
    
    graphics.clear();
    
    // Building height and design varies by type
    // Use the property color (from PROPERTY_ICON_COLORS) as the primary building color
    if (type === 'Residential') {
      // Residential: Cozy house with pitched roof - use property blue color
      const buildingHeight = 16 * gameScale;
      const wallColor = color; // Use property color (light blue)
      const roofColor = 0x4a6a8a; // Darker blue roof
      const windowColor = 0x87ceeb; // Sky blue windows
      const doorColor = 0x2a4a6a; // Dark blue door
      
      // Main building body (front face)
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
      
      // Draw walls - use property color with slight variations for depth
      graphics.poly(sidePoints).fill({ color: Math.floor(wallColor * 0.8), alpha: 1 });
      graphics.poly(frontPoints).fill({ color: wallColor, alpha: 1 });
      
      // Pitched roof (triangular front)
      const roofPeak = centerY - buildingHeight - isoY - 6 * gameScale;
      const roofFront = [
        centerX - isoX, centerY - buildingHeight,
        centerX, roofPeak,
        centerX + isoX, centerY - buildingHeight,
      ];
      graphics.poly(roofFront).fill({ color: roofColor, alpha: 1 });
      
      // Roof side (isometric)
      const roofSide = [
        centerX + isoX, centerY - buildingHeight,
        centerX, roofPeak,
        centerX, centerY - buildingHeight + isoY,
      ];
      graphics.poly(roofSide).fill({ color: roofColor * 0.7, alpha: 1 });
      
      // Door (centered)
      const doorW = baseSize * 0.25;
      const doorH = baseSize * 0.4;
      graphics.rect(centerX - doorW/2, centerY - doorH, doorW, doorH)
        .fill({ color: doorColor, alpha: 1 });
      // Door frame
      graphics.rect(centerX - doorW/2, centerY - doorH, doorW, doorH)
        .setStrokeStyle({ width: 1, color: 0x2a2a2a, alpha: 1 }).stroke();
      
      // Windows (2 on front, 1 on side)
      const windowSize = baseSize * 0.18;
      // Front windows
      graphics.rect(centerX - baseSize * 0.35, centerY - buildingHeight * 0.65, windowSize, windowSize)
        .fill({ color: windowColor, alpha: 0.8 });
      graphics.rect(centerX + baseSize * 0.1, centerY - buildingHeight * 0.65, windowSize, windowSize)
        .fill({ color: windowColor, alpha: 0.8 });
      // Window frames
      graphics.rect(centerX - baseSize * 0.35, centerY - buildingHeight * 0.65, windowSize, windowSize)
        .setStrokeStyle({ width: 1, color: 0x2a2a2a, alpha: 1 }).stroke();
      graphics.rect(centerX + baseSize * 0.1, centerY - buildingHeight * 0.65, windowSize, windowSize)
        .setStrokeStyle({ width: 1, color: 0x2a2a2a, alpha: 1 }).stroke();
      
      // Outlines
      graphics.poly(sidePoints).setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 0.9 }).stroke();
      graphics.poly(frontPoints).setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 0.9 }).stroke();
      graphics.poly(roofFront).setStrokeStyle({ width: 1.5, color: 0x1a1a1a, alpha: 0.9 }).stroke();
      
    } else if (type === 'Commercial') {
      // Commercial: Modern store with flat roof and large windows - use property green color
      const buildingHeight = 22 * gameScale;
      const wallColor = color; // Use property color (light green)
      const roofColor = 0x4a8a5a; // Darker green roof
      const windowColor = 0xffffaa; // Light yellow store windows
      const signColor = color; // Use property color for sign
      
      // Main building body
      const frontPoints = [
        centerX - isoX, centerY - buildingHeight,
        centerX + isoX, centerY - buildingHeight,
        centerX + isoX, centerY,
        centerX - isoX, centerY,
      ];
      
      const sidePoints = [
        centerX + isoX, centerY - buildingHeight,
        centerX, centerY - buildingHeight + isoY,
        centerX, centerY + isoY,
        centerX + isoX, centerY,
      ];
      
      // Draw walls - use property color with slight variations for depth
      graphics.poly(sidePoints).fill({ color: Math.floor(wallColor * 0.8), alpha: 1 });
      graphics.poly(frontPoints).fill({ color: wallColor, alpha: 1 });
      
      // Flat roof
      const topPoints = [
        centerX, centerY - buildingHeight - isoY,
        centerX + isoX, centerY - buildingHeight,
        centerX, centerY - buildingHeight + isoY,
        centerX - isoX, centerY - buildingHeight,
      ];
      graphics.poly(topPoints).fill({ color: roofColor, alpha: 1 });
      
      // Large storefront windows (2 large panes)
      const windowW = baseSize * 0.35;
      const windowH = baseSize * 0.4;
      graphics.rect(centerX - baseSize * 0.4, centerY - buildingHeight * 0.5, windowW, windowH)
        .fill({ color: windowColor, alpha: 0.85 });
      graphics.rect(centerX + baseSize * 0.05, centerY - buildingHeight * 0.5, windowW, windowH)
        .fill({ color: windowColor, alpha: 0.85 });
      // Window frames
      graphics.rect(centerX - baseSize * 0.4, centerY - buildingHeight * 0.5, windowW, windowH)
        .setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 1 }).stroke();
      graphics.rect(centerX + baseSize * 0.05, centerY - buildingHeight * 0.5, windowW, windowH)
        .setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 1 }).stroke();
      
      // Store sign on roof
      const signW = baseSize * 0.9;
      const signH = 4 * gameScale;
      graphics.rect(centerX - signW/2, centerY - buildingHeight - isoY - signH, signW, signH)
        .fill({ color: signColor, alpha: 1 });
      graphics.rect(centerX - signW/2, centerY - buildingHeight - isoY - signH, signW, signH)
        .setStrokeStyle({ width: 1, color: 0x1a1a1a, alpha: 1 }).stroke();
      
      // Door
      const doorW = baseSize * 0.2;
      const doorH = baseSize * 0.3;
      graphics.rect(centerX - doorW/2, centerY - doorH, doorW, doorH)
        .fill({ color: 0x2a2a2a, alpha: 1 });
      
      // Outlines
      graphics.poly(sidePoints).setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 0.9 }).stroke();
      graphics.poly(frontPoints).setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 0.9 }).stroke();
      graphics.poly(topPoints).setStrokeStyle({ width: 1.5, color: 0x1a1a1a, alpha: 0.9 }).stroke();
      
    } else if (type === 'Industrial') {
      // Industrial: Factory with smokestack and many small windows - use property orange color
      const buildingHeight = 24 * gameScale;
      const wallColor = color; // Use property color (light orange)
      const roofColor = 0x8a6a2a; // Darker orange/brown roof
      const windowColor = 0xffddaa; // Light orange windows
      
      // Main building body
      const frontPoints = [
        centerX - isoX, centerY - buildingHeight,
        centerX + isoX, centerY - buildingHeight,
        centerX + isoX, centerY,
        centerX - isoX, centerY,
      ];
      
      const sidePoints = [
        centerX + isoX, centerY - buildingHeight,
        centerX, centerY - buildingHeight + isoY,
        centerX, centerY + isoY,
        centerX + isoX, centerY,
      ];
      
      // Draw walls - use property color with slight variations for depth
      graphics.poly(sidePoints).fill({ color: Math.floor(wallColor * 0.75), alpha: 1 });
      graphics.poly(frontPoints).fill({ color: wallColor, alpha: 1 });
      
      // Flat roof
      const topPoints = [
        centerX, centerY - buildingHeight - isoY,
        centerX + isoX, centerY - buildingHeight,
        centerX, centerY - buildingHeight + isoY,
        centerX - isoX, centerY - buildingHeight,
      ];
      graphics.poly(topPoints).fill({ color: roofColor, alpha: 1 });
      
      // Smokestack on side
      const stackW = baseSize * 0.2;
      const stackH = buildingHeight * 0.4;
      const stackX = centerX + isoX * 0.6;
      const stackY = centerY - buildingHeight - stackH;
      graphics.rect(stackX - stackW/2, stackY, stackW, stackH)
        .fill({ color: 0x1a1a1a, alpha: 1 });
      // Stack top
      graphics.rect(stackX - stackW/2 - 1 * gameScale, stackY, stackW + 2 * gameScale, 2 * gameScale)
        .fill({ color: 0x000000, alpha: 1 });
      
      // Factory windows (grid pattern - 3x3)
      const windowSize = baseSize * 0.12;
      const windowSpacing = baseSize * 0.2;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const windowX = centerX - baseSize * 0.35 + i * windowSpacing;
          const windowY = centerY - buildingHeight * 0.6 + j * windowSpacing * 0.8;
          graphics.rect(windowX, windowY, windowSize, windowSize)
            .fill({ color: windowColor, alpha: 0.9 });
          graphics.rect(windowX, windowY, windowSize, windowSize)
            .setStrokeStyle({ width: 0.5, color: 0x2a2a2a, alpha: 1 }).stroke();
        }
      }
      
      // Large industrial door
      const doorW = baseSize * 0.3;
      const doorH = baseSize * 0.35;
      graphics.rect(centerX - doorW/2, centerY - doorH, doorW, doorH)
        .fill({ color: 0x1a1a1a, alpha: 1 });
      graphics.rect(centerX - doorW/2, centerY - doorH, doorW, doorH)
        .setStrokeStyle({ width: 1, color: 0x000000, alpha: 1 }).stroke();
      
      // Outlines
      graphics.poly(sidePoints).setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 0.9 }).stroke();
      graphics.poly(frontPoints).setStrokeStyle({ width: 1.5, color: 0x2a2a2a, alpha: 0.9 }).stroke();
      graphics.poly(topPoints).setStrokeStyle({ width: 1.5, color: 0x1a1a1a, alpha: 0.9 }).stroke();
      
    } else if (type === 'Luxury') {
      // Luxury: Modern glass skyscraper - use property pink color
      const buildingHeight = 45 * gameScale;
      const baseColor = color; // Use property color (light pink) for glass tint
      const glassColor = 0xffaacc; // Lighter pink glass
      const frameColor = 0x8a4a6a; // Dark pink window frames
      
      // Main building body (taller and narrower)
      const narrowIsoX = baseSize * 0.4;
      const narrowIsoY = baseSize * 0.2;
      
      const frontPoints = [
        centerX - narrowIsoX, centerY - buildingHeight,
        centerX + narrowIsoX, centerY - buildingHeight,
        centerX + narrowIsoX, centerY,
        centerX - narrowIsoX, centerY,
      ];
      
      const sidePoints = [
        centerX + narrowIsoX, centerY - buildingHeight,
        centerX, centerY - buildingHeight + narrowIsoY,
        centerX, centerY + narrowIsoY,
        centerX + narrowIsoX, centerY,
      ];
      
      // Draw walls with glass effect - use property color
      graphics.poly(sidePoints).fill({ color: Math.floor(baseColor * 0.7), alpha: 0.9 });
      graphics.poly(frontPoints).fill({ color: baseColor, alpha: 0.95 });
      
      // Flat roof
      const topPoints = [
        centerX, centerY - buildingHeight - narrowIsoY,
        centerX + narrowIsoX, centerY - buildingHeight,
        centerX, centerY - buildingHeight + narrowIsoY,
        centerX - narrowIsoX, centerY - buildingHeight,
      ];
      graphics.poly(topPoints).fill({ color: 0x1a1a1a, alpha: 1 });
      
      // Glass windows grid (many floors)
      const windowW = baseSize * 0.15;
      const windowH = buildingHeight * 0.08;
      const windowSpacingX = baseSize * 0.25;
      const windowSpacingY = buildingHeight * 0.12;
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 8; j++) {
          const windowX = centerX - baseSize * 0.3 + i * windowSpacingX;
          const windowY = centerY - buildingHeight * 0.85 + j * windowSpacingY;
          // Alternating lit/dark windows for depth
          const isLit = (i + j) % 2 === 0;
          graphics.rect(windowX, windowY, windowW, windowH)
            .fill({ color: isLit ? glassColor : 0x2a4a6a, alpha: 0.9 });
          graphics.rect(windowX, windowY, windowW, windowH)
            .setStrokeStyle({ width: 0.5, color: frameColor, alpha: 1 }).stroke();
        }
      }
      
      // Spire/antenna on top
      const spireH = buildingHeight * 0.15;
      graphics.rect(centerX - 1.5 * gameScale, centerY - buildingHeight - narrowIsoY - spireH, 3 * gameScale, spireH)
        .fill({ color: 0xcccccc, alpha: 1 });
      // Spire tip
      graphics.poly([
        centerX, centerY - buildingHeight - narrowIsoY - spireH - 2 * gameScale,
        centerX - 2 * gameScale, centerY - buildingHeight - narrowIsoY - spireH,
        centerX + 2 * gameScale, centerY - buildingHeight - narrowIsoY - spireH,
      ]).fill({ color: 0xffffff, alpha: 1 });
      
      // Outlines
      graphics.poly(sidePoints).setStrokeStyle({ width: 1.5, color: frameColor, alpha: 0.9 }).stroke();
      graphics.poly(frontPoints).setStrokeStyle({ width: 1.5, color: frameColor, alpha: 0.9 }).stroke();
      graphics.poly(topPoints).setStrokeStyle({ width: 1.5, color: 0x1a1a1a, alpha: 0.9 }).stroke();
    }
    
    // Add ownership marker for owned properties - flag on top
    if (isOwned) {
      // Determine building top position based on type
      let buildingTopY = centerY;
      if (type === 'Residential') {
        buildingTopY = centerY - 16 * gameScale - baseSize * 0.25 - 6 * gameScale; // Above roof peak
      } else if (type === 'Commercial') {
        buildingTopY = centerY - 22 * gameScale - baseSize * 0.25; // Above flat roof
      } else if (type === 'Industrial') {
        buildingTopY = centerY - 24 * gameScale - baseSize * 0.25; // Above flat roof
      } else if (type === 'Luxury') {
        buildingTopY = centerY - 45 * gameScale - baseSize * 0.2 - 8 * gameScale; // Above spire
      }
      
      // Flag pole (vertical line)
      const poleHeight = 12 * gameScale;
      const poleWidth = 1.5 * gameScale;
      graphics.rect(centerX - poleWidth / 2, buildingTopY - poleHeight, poleWidth, poleHeight)
        .fill({ color: 0x8a6a4a, alpha: 1 }); // Brown pole
      
      // Flag (triangle using property color)
      const flagSize = 8 * gameScale;
      const flagPoints = [
        centerX, buildingTopY - poleHeight, // Top of pole
        centerX + flagSize, buildingTopY - poleHeight + flagSize * 0.5, // Right point
        centerX, buildingTopY - poleHeight + flagSize, // Bottom point
      ];
      graphics.poly(flagPoints).fill({ color: color, alpha: 1 }); // Property color flag
      graphics.poly(flagPoints).setStrokeStyle({ width: 1, color: 0x2a2a2a, alpha: 0.8 }).stroke();
      
      // Small star/checkmark on flag (white)
      const starSize = 3 * gameScale;
      graphics.circle(centerX + flagSize * 0.3, buildingTopY - poleHeight + flagSize * 0.4, starSize)
        .fill({ color: 0xffffff, alpha: 1 });
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

      // Determine terrain type for a tile - only water and land
      const getTerrainType = (x: number, y: number): 'water' | 'land' => {
        const seed = BUILDING_SEED + x * 1000 + y;
        
        // Create water bodies (rivers, lakes) - ~15% of map
        // Water tends to form in clusters
        const waterNoise = seededRandom(seed * 7) + seededRandom(seed * 11) * 0.5;
        if (waterNoise < 0.15) {
          return 'water';
        }
        
        // Rest is land (grassland, fields)
        return 'land';
      };

      // Function to render visible tiles (for fixed map) - isometric
      const renderVisibleTiles = () => {
        if (!stageRef.current || !canvasRef.current) return;
        
        try {
          const stage = stageRef.current;
          // Get current zoom from stage scale (most accurate)
          const currentZoom = Math.max(0.1, stage.scale.x); // Ensure zoom is never 0 or negative
        
        // Calculate visible tile range based on viewport
        const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
        const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
        
        // Calculate viewport bounds in world coordinates (accounting for pan and zoom)
        // Screen to world: world = (screen - pan) / zoom
        const viewportLeft = -stage.x / currentZoom;
        const viewportTop = -stage.y / currentZoom;
        const viewportRight = (containerWidth - stage.x) / currentZoom;
        const viewportBottom = (containerHeight - stage.y) / currentZoom;
        
        // Estimate visible tile range using reverse isometric projection
        // For isometric: x = (screenX - offset) / scale, but we need to account for the projection
        // Approximate: use a larger bounding box that covers the viewport
        const buffer = 15; // Reduced buffer to prevent crashes - only render what's needed
        
        // Calculate approximate grid bounds from viewport bounds
        // Reverse isometric: gridX ≈ (worldX + worldY) / tileWidth, gridY ≈ (worldY - worldX) / tileHeight
        // But this is approximate - we'll use a safe range
        const centerWorldX = (viewportLeft + viewportRight) / 2;
        const centerWorldY = (viewportTop + viewportBottom) / 2;
        
        // Find center tile by checking nearby tiles
        let centerTileX = Math.floor(GRID_WIDTH / 2);
        let centerTileY = Math.floor(GRID_HEIGHT / 2);
        let minDist = Infinity;
        
        // Quick search for center tile (only check every 5th tile for speed)
        // Use world coordinates (zoom=1) for consistency
        const worldZoom = 1;
        for (let x = 0; x < GRID_WIDTH; x += 5) {
          for (let y = 0; y < GRID_HEIGHT; y += 5) {
            const tileX = calcXPos(x, y, worldZoom);
            const tileY = calcYPos(x, y, worldZoom);
            const dist = Math.sqrt((centerWorldX - tileX) ** 2 + (centerWorldY - tileY) ** 2);
            if (dist < minDist) {
              minDist = dist;
              centerTileX = x;
              centerTileY = y;
            }
          }
        }
        
        // Estimate visible range around center (accounting for isometric projection)
        // Isometric tiles are roughly 2x wider than tall, so we need more horizontal range
        // Use world coordinates for tile size
        const tileWidth = ISO_TILE_WIDTH * worldZoom;
        const tileHeight = ISO_TILE_HEIGHT * worldZoom;
        const viewportWidth = viewportRight - viewportLeft;
        const viewportHeight = viewportBottom - viewportTop;
        
        // Approximate tiles visible (accounting for isometric angle)
        const tilesX = Math.ceil(viewportWidth / tileWidth) + buffer;
        const tilesY = Math.ceil(viewportHeight / tileHeight) + buffer;
        
        // Clamp to grid boundaries
        const startX = Math.max(0, centerTileX - tilesX);
        const endX = Math.min(GRID_WIDTH - 1, centerTileX + tilesX);
        const startY = Math.max(0, centerTileY - tilesY);
        const endY = Math.min(GRID_HEIGHT - 1, centerTileY + tilesY);
        
        // Clear layers (but keep properties layer - it's managed separately)
        groundLayer.removeChildren();
        buildingsLayer.removeChildren();
        gridLayer.removeChildren();
        
        const occupiedTiles = new Set<string>();
        properties.forEach(p => occupiedTiles.add(`${p.x},${p.y}`));
        otherPlayersProperties.forEach(p => occupiedTiles.add(`${p.x},${p.y}`));
        
        // Sort tiles by z-order (isometric depth) - render back to front
        const tiles: Array<{x: number, y: number, z: number}> = [];
        for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
            tiles.push({ x, y, z: calcZPos(x, y) });
          }
        }
        tiles.sort((a, b) => a.z - b.z);
        
        for (const tile of tiles) {
          const { x, y } = tile;
          const tileKey = `${x},${y}`;
          const terrainType = getTerrainType(x, y);
          
          // Draw isometric tile - use world coordinates (zoom=1) so tiles align with properties
          const groundGraphics = new Graphics();
          drawIsometricTile(groundGraphics, x, y, terrainType, worldZoom);
          groundLayer.addChild(groundGraphics);
          
          // Background buildings removed - only player properties are shown
          
          // Add trees on land tiles (sparse - only 2% of land tiles)
          if (terrainType === 'land' && !occupiedTiles.has(tileKey)) {
            const treeSeed = BUILDING_SEED + x * 2000 + y * 3000;
            if (seededRandom(treeSeed) < 0.02) { // Only 2% of land tiles get trees
              const treeGraphics = new Graphics();
              drawIsometricTree(treeGraphics, x, y, worldZoom);
              groundLayer.addChild(treeGraphics);
            }
          }
        }
        } catch (error) {
          console.error('Error in renderVisibleTiles:', error);
        }
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
      let renderTimeout: number | null = null; // For debouncing renders
      let isRendering = false; // Prevent multiple simultaneous renders
      
      app.stage.on('pointerdown', (e) => {
        if (e.button === 0) {
          isPanning = true;
          hasMoved = false;
          // Cancel any pending renders
          if (renderTimeout) {
            cancelAnimationFrame(renderTimeout);
            renderTimeout = null;
          }
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
          
          // Calculate isometric map bounds
          // Find the actual bounds of the isometric map in world coordinates (zoom=1)
          // Then scale by currentZoom for screen-space calculations
          const worldZoom = 1;
          const topLeftX = calcXPos(0, 0, worldZoom) * currentZoom;
          const topLeftY = calcYPos(0, 0, worldZoom) * currentZoom;
          const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
          const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
          const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
          const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
          const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
          const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
          
          // Find the bounding box of the isometric map
          const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
          const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
          const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
          const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
          
          const mapWidth = mapMaxX - mapMinX;
          const mapHeight = mapMaxY - mapMinY;
          
          // Constrain panning to map boundaries (with some padding for smooth scrolling)
          const padding = 50; // Padding in pixels
          if (mapWidth > containerWidth) {
            const maxX = mapMinX + padding; // Can't pan right past left edge
            const minX = -(mapWidth - containerWidth) + mapMinX - padding; // Can't pan left past right edge
            newX = Math.max(minX, Math.min(maxX, newX));
          } else {
            // Center the map if it's smaller than viewport
            newX = (containerWidth - mapWidth) / 2 + mapMinX;
          }
          
          if (mapHeight > containerHeight) {
            const maxY = mapMinY + padding; // Can't pan down past top edge
            const minY = -(mapHeight - containerHeight) + mapMinY - padding; // Can't pan up past bottom edge
            newY = Math.max(minY, Math.min(maxY, newY));
          } else {
            // Center the map if it's smaller than viewport
            newY = (containerHeight - mapHeight) / 2 + mapMinY;
          }
          
          // Update stage position immediately for smooth panning
          // DO NOT render during active panning - this causes crashes
          // Just move the stage, existing graphics will move smoothly
          stage.x = newX;
          stage.y = newY;
          setPanX(stage.x);
          setPanY(stage.y);
        }
      });
      
      // Debounced render function - only render when panning stops
      const scheduleRender = () => {
        if (renderTimeout) {
          cancelAnimationFrame(renderTimeout);
        }
        renderTimeout = requestAnimationFrame(() => {
          if (!isRendering && !isPanning) {
            isRendering = true;
            try {
              renderVisibleTiles();
            } catch (error) {
              console.error('Error rendering tiles:', error);
            } finally {
              isRendering = false;
              renderTimeout = null;
            }
          }
        });
      };
      
      app.stage.on('pointerup', () => {
        isPanning = false;
        hasMoved = false;
        // Render tiles when panning stops
        scheduleRender();
      });
      
      app.stage.on('pointerupoutside', () => {
        isPanning = false;
        hasMoved = false;
        // Render tiles when panning stops
        scheduleRender();
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
      if (stageRef.current && canvasRef.current) {
        const stage = stageRef.current;
        const currentZoom = stage.scale.x;
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));
        
        // Get mouse position relative to canvas
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate the world position under the mouse before zoom
        const worldX = (mouseX - stage.x) / currentZoom;
        const worldY = (mouseY - stage.y) / currentZoom;
        
        // Update zoom
        stage.scale.set(newZoom);
        
        // Adjust pan to keep the same world point under the mouse
        const newPanX = mouseX - worldX * newZoom;
        const newPanY = mouseY - worldY * newZoom;
        
        // Apply constraints - use world coordinates then scale for screen space
        const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
        const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
        const worldZoom = 1;
        const topLeftX = calcXPos(0, 0, worldZoom) * newZoom;
        const topLeftY = calcYPos(0, 0, worldZoom) * newZoom;
        const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * newZoom;
        const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * newZoom;
        const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * newZoom;
        const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * newZoom;
        const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * newZoom;
        const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * newZoom;
        
        const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
        const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
        const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
        const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
        
        const mapWidth = mapMaxX - mapMinX;
        const mapHeight = mapMaxY - mapMinY;
        const padding = 50;
        
        let constrainedX = newPanX;
        let constrainedY = newPanY;
        
        if (mapWidth > containerWidth) {
          const maxX = mapMinX + padding;
          const minX = -(mapWidth - containerWidth) + mapMinX - padding;
          constrainedX = Math.max(minX, Math.min(maxX, newPanX));
        } else {
          constrainedX = (containerWidth - mapWidth) / 2 + mapMinX;
        }
        
        if (mapHeight > containerHeight) {
          const maxY = mapMinY + padding;
          const minY = -(mapHeight - containerHeight) + mapMinY - padding;
          constrainedY = Math.max(minY, Math.min(maxY, newPanY));
        } else {
          constrainedY = (containerHeight - mapHeight) / 2 + mapMinY;
        }
        
        stage.x = constrainedX;
        stage.y = constrainedY;
        setPanX(constrainedX);
        setPanY(constrainedY);
        
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
      
      // Convert screen coordinates to isometric grid coordinates
      // Reverse isometric projection - use world coordinates (zoom=1)
      const worldZoom = 1;
      let closestTile = { x: 0, y: 0, dist: Infinity };
      
      // Check all tiles to find the closest one (brute force but works)
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const tileX = calcXPos(x, y, worldZoom);
          const tileY = calcYPos(x, y, worldZoom);
          const dist = Math.sqrt((worldX - tileX) ** 2 + (worldY - tileY) ** 2);
          if (dist < closestTile.dist) {
            closestTile = { x, y, dist };
          }
        }
      }
      
      // If click is within tile bounds, use it
      const { x, y } = closestTile;
      const tileX = calcXPos(x, y, worldZoom);
      const tileY = calcYPos(x, y, worldZoom);
      const tileWidth = ISO_TILE_WIDTH * worldZoom;
      const tileHeight = ISO_TILE_HEIGHT * worldZoom;
      
      // Check if click is within diamond bounds (simplified check)
      const dx = Math.abs(worldX - tileX);
      const dy = Math.abs(worldY - tileY);
      const inDiamond = (dx / (tileWidth / 2) + dy / (tileHeight / 2)) <= 1;
      
      if (inDiamond) {
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
      }
    });
  }, [properties, otherPlayersProperties, spritesLoaded, onPropertyClick, onEmptyTileClick, zoom, panX, panY]);

  // Render properties with isometric 3D buildings
  useEffect(() => {
    if (!propertiesLayerRef.current || !spritesLoaded || !stageRef.current) {
      return;
    }

    const propertiesLayer = propertiesLayerRef.current;
    propertiesLayer.removeChildren();
    
    // IMPORTANT: Use zoom=1 for world coordinates - stage scale will handle visual zoom
    // This ensures properties stay at fixed grid positions regardless of zoom level
    const worldZoom = 1;
    
    // Sort properties by z-order (isometric depth) - render back to front
    const allProperties = [
      ...otherPlayersProperties.map(p => ({ ...p, isOwned: false })),
      ...properties.map(p => ({ ...p, isOwned: true }))
    ];
    allProperties.sort((a, b) => calcZPos(a.x, a.y) - calcZPos(b.x, b.y));
    
    // Render all properties
    allProperties.forEach((property) => {
      // Skip if coordinates are invalid or outside grid
      if (property.x < 0 || property.x >= GRID_WIDTH || property.y < 0 || property.y >= GRID_HEIGHT) {
        return;
      }
      
      const propertyGraphics = new Graphics();
      const color = PROPERTY_ICON_COLORS[property.propertyType];
      // Draw at world coordinates (zoom=1) - stage scale will handle visual zoom
      drawPropertyBuilding(propertyGraphics, property.x, property.y, property.propertyType, color, property.isOwned, worldZoom);

      const propertyContainer = new Container();
      propertyContainer.addChild(propertyGraphics);
      propertyContainer.visible = true;
      propertyContainer.alpha = 1;
      propertyContainer.eventMode = 'static';
      propertyContainer.cursor = 'pointer';
      
      // Make properties clickable (isometric hit area) - use world coordinates
      const l = calcXPos(property.x, property.y, worldZoom);
      const t = calcYPos(property.x, property.y, worldZoom);
      const tileWidth = ISO_TILE_WIDTH * worldZoom;
      const tileHeight = ISO_TILE_HEIGHT * worldZoom;
      
      propertyContainer.hitArea = {
        contains: (x: number, y: number) => {
          const dx = Math.abs(x - l);
          const dy = Math.abs(y - (t + tileHeight / 2));
          return (dx / (tileWidth / 2) + dy / (tileHeight / 2)) <= 1;
        }
      };
      
      propertyContainer.on('pointerdown', (e) => {
        e.stopPropagation();
        if (property.isOwned) {
          onPropertyClick?.(property as Property);
        } else {
          if (onOtherPropertyClick) {
            onOtherPropertyClick(property as OtherPlayerProperty);
          }
        }
      });

      propertiesLayer.addChild(propertyContainer);
    });

      if (appRef.current) {
        appRef.current.renderer.render(appRef.current.stage);
      }
      
    console.log(`✅ CityView: Rendered ${properties.length} own properties and ${otherPlayersProperties.length} other players' properties`);
      }, [properties, otherPlayersProperties, spritesLoaded, onPropertyClick, onOtherPropertyClick]);

  // Zoom functions - use external handlers if provided
  const handleZoomIn = () => {
    if (onZoomIn) {
      onZoomIn();
    } else if (appRef.current && stageRef.current && canvasRef.current) {
      const stage = stageRef.current;
      const currentZoom = stage.scale.x;
      const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
      
      // Get viewport center
      const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
      const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      // Calculate the world position at viewport center before zoom
      const worldX = (centerX - stage.x) / currentZoom;
      const worldY = (centerY - stage.y) / currentZoom;
      
      // Update zoom
      stage.scale.set(newZoom);
      
      // Adjust pan to keep the same world point at viewport center
      const newPanX = centerX - worldX * newZoom;
      const newPanY = centerY - worldY * newZoom;
      
      // Apply constraints - use world coordinates then scale for screen space
      const worldZoom = 1;
      const topLeftX = calcXPos(0, 0, worldZoom) * newZoom;
      const topLeftY = calcYPos(0, 0, worldZoom) * newZoom;
      const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * newZoom;
      const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * newZoom;
      const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * newZoom;
      const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * newZoom;
      const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * newZoom;
      const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * newZoom;
      
      const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
      const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
      
      const mapWidth = mapMaxX - mapMinX;
      const mapHeight = mapMaxY - mapMinY;
      const padding = 50;
      
      let constrainedX = newPanX;
      let constrainedY = newPanY;
      
      if (mapWidth > containerWidth) {
        const maxX = mapMinX + padding;
        const minX = -(mapWidth - containerWidth) + mapMinX - padding;
        constrainedX = Math.max(minX, Math.min(maxX, newPanX));
      } else {
        constrainedX = (containerWidth - mapWidth) / 2 + mapMinX;
      }
      
      if (mapHeight > containerHeight) {
        const maxY = mapMinY + padding;
        const minY = -(mapHeight - containerHeight) + mapMinY - padding;
        constrainedY = Math.max(minY, Math.min(maxY, newPanY));
      } else {
        constrainedY = (containerHeight - mapHeight) / 2 + mapMinY;
      }
      
      stage.x = constrainedX;
      stage.y = constrainedY;
      setPanX(constrainedX);
      setPanY(constrainedY);
      setInternalZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (onZoomOut) {
      onZoomOut();
    } else if (appRef.current && stageRef.current && canvasRef.current) {
      const stage = stageRef.current;
      const currentZoom = stage.scale.x;
      const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
      
      // Get viewport center
      const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
      const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      // Calculate the world position at viewport center before zoom
      const worldX = (centerX - stage.x) / currentZoom;
      const worldY = (centerY - stage.y) / currentZoom;
      
      // Update zoom
      stage.scale.set(newZoom);
      
      // Adjust pan to keep the same world point at viewport center
      const newPanX = centerX - worldX * newZoom;
      const newPanY = centerY - worldY * newZoom;
      
      // Apply constraints - use world coordinates then scale for screen space
      const worldZoom = 1;
      const topLeftX = calcXPos(0, 0, worldZoom) * newZoom;
      const topLeftY = calcYPos(0, 0, worldZoom) * newZoom;
      const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * newZoom;
      const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * newZoom;
      const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * newZoom;
      const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * newZoom;
      const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * newZoom;
      const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * newZoom;
      
      const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
      const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
      
      const mapWidth = mapMaxX - mapMinX;
      const mapHeight = mapMaxY - mapMinY;
      const padding = 50;
      
      let constrainedX = newPanX;
      let constrainedY = newPanY;
      
      if (mapWidth > containerWidth) {
        const maxX = mapMinX + padding;
        const minX = -(mapWidth - containerWidth) + mapMinX - padding;
        constrainedX = Math.max(minX, Math.min(maxX, newPanX));
      } else {
        constrainedX = (containerWidth - mapWidth) / 2 + mapMinX;
      }
      
      if (mapHeight > containerHeight) {
        const maxY = mapMinY + padding;
        const minY = -(mapHeight - containerHeight) + mapMinY - padding;
        constrainedY = Math.max(minY, Math.min(maxY, newPanY));
      } else {
        constrainedY = (containerHeight - mapHeight) / 2 + mapMinY;
      }
      
      stage.x = constrainedX;
      stage.y = constrainedY;
      setPanX(constrainedX);
      setPanY(constrainedY);
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
      
      // Center the view on the average property position (isometric)
      // Use world coordinates then scale for screen space
      const worldZoom = 1;
      const targetX = calcXPos(avgX, avgY, worldZoom) * currentZoom;
      const targetY = calcYPos(avgX, avgY, worldZoom) * currentZoom;
      
      let newX = containerWidth / 2 - targetX;
      let newY = containerHeight / 2 - targetY;
      
      // Calculate isometric map bounds for proper constraints
      const topLeftX = calcXPos(0, 0, worldZoom) * currentZoom;
      const topLeftY = calcYPos(0, 0, worldZoom) * currentZoom;
      const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
      const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
      const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      
      const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
      const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
      
      const mapWidth = mapMaxX - mapMinX;
      const mapHeight = mapMaxY - mapMinY;
      const padding = 50;
      
      // Constrain to map boundaries
      if (mapWidth > containerWidth) {
        const maxX = mapMinX + padding;
        const minX = -(mapWidth - containerWidth) + mapMinX - padding;
        newX = Math.max(minX, Math.min(maxX, newX));
      } else {
        newX = (containerWidth - mapWidth) / 2 + mapMinX;
      }
      
      if (mapHeight > containerHeight) {
        const maxY = mapMinY + padding;
        const minY = -(mapHeight - containerHeight) + mapMinY - padding;
        newY = Math.max(minY, Math.min(maxY, newY));
      } else {
        newY = (containerHeight - mapHeight) / 2 + mapMinY;
      }
      
      stageRef.current.x = newX;
      stageRef.current.y = newY;
      setPanX(stageRef.current.x);
      setPanY(stageRef.current.y);
    }
  };

  useEffect(() => {
    if (stageRef.current && canvasRef.current) {
      const stage = stageRef.current;
      const currentZoom = stage.scale.x;
      
      // Only adjust if zoom actually changed
      if (Math.abs(currentZoom - zoom) > 0.001) {
        // Get viewport center
        const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
        const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        
        // Calculate the world position at viewport center before zoom
        const worldX = (centerX - stage.x) / currentZoom;
        const worldY = (centerY - stage.y) / currentZoom;
        
        // Update zoom
        stage.scale.set(zoom);
        
        // Adjust pan to keep the same world point at viewport center
        const newPanX = centerX - worldX * zoom;
        const newPanY = centerY - worldY * zoom;
        
        // Apply constraints - use world coordinates then scale for screen space
        const worldZoom = 1;
        const topLeftX = calcXPos(0, 0, worldZoom) * zoom;
        const topLeftY = calcYPos(0, 0, worldZoom) * zoom;
        const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * zoom;
        const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * zoom;
        const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * zoom;
        const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * zoom;
        const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * zoom;
        const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * zoom;
        
        const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
        const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
        const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
        const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
        
        const mapWidth = mapMaxX - mapMinX;
        const mapHeight = mapMaxY - mapMinY;
        const padding = 50;
        
        let constrainedX = newPanX;
        let constrainedY = newPanY;
        
        if (mapWidth > containerWidth) {
          const maxX = mapMinX + padding;
          const minX = -(mapWidth - containerWidth) + mapMinX - padding;
          constrainedX = Math.max(minX, Math.min(maxX, newPanX));
        } else {
          constrainedX = (containerWidth - mapWidth) / 2 + mapMinX;
        }
        
        if (mapHeight > containerHeight) {
          const maxY = mapMinY + padding;
          const minY = -(mapHeight - containerHeight) + mapMinY - padding;
          constrainedY = Math.max(minY, Math.min(maxY, newPanY));
        } else {
          constrainedY = (containerHeight - mapHeight) / 2 + mapMinY;
        }
        
        stage.x = constrainedX;
        stage.y = constrainedY;
        setPanX(constrainedX);
        setPanY(constrainedY);
      }
    }
  }, [zoom]);
  
  // Sync internal zoom with external zoom if provided
  useEffect(() => {
    if (externalZoom !== undefined && externalZoom !== internalZoom) {
      setInternalZoom(externalZoom);
      if (stageRef.current && canvasRef.current) {
        const stage = stageRef.current;
        const currentZoom = stage.scale.x;
        
        // Only adjust if zoom actually changed
        if (Math.abs(currentZoom - externalZoom) > 0.001) {
          // Get viewport center
          const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
          const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
          const centerX = containerWidth / 2;
          const centerY = containerHeight / 2;
          
          // Calculate the world position at viewport center before zoom
          const worldX = (centerX - stage.x) / currentZoom;
          const worldY = (centerY - stage.y) / currentZoom;
          
          // Update zoom
          stage.scale.set(externalZoom);
          
          // Adjust pan to keep the same world point at viewport center
          const newPanX = centerX - worldX * externalZoom;
          const newPanY = centerY - worldY * externalZoom;
          
          // Apply constraints - use world coordinates then scale for screen space
          const worldZoom = 1;
          const topLeftX = calcXPos(0, 0, worldZoom) * externalZoom;
          const topLeftY = calcYPos(0, 0, worldZoom) * externalZoom;
          const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * externalZoom;
          const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * externalZoom;
          const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * externalZoom;
          const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * externalZoom;
          const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * externalZoom;
          const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * externalZoom;
          
          const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
          const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
          const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
          const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
          
          const mapWidth = mapMaxX - mapMinX;
          const mapHeight = mapMaxY - mapMinY;
          const padding = 50;
          
          let constrainedX = newPanX;
          let constrainedY = newPanY;
          
          if (mapWidth > containerWidth) {
            const maxX = mapMinX + padding;
            const minX = -(mapWidth - containerWidth) + mapMinX - padding;
            constrainedX = Math.max(minX, Math.min(maxX, newPanX));
          } else {
            constrainedX = (containerWidth - mapWidth) / 2 + mapMinX;
          }
          
          if (mapHeight > containerHeight) {
            const maxY = mapMinY + padding;
            const minY = -(mapHeight - containerHeight) + mapMinY - padding;
            constrainedY = Math.max(minY, Math.min(maxY, newPanY));
          } else {
            constrainedY = (containerHeight - mapHeight) / 2 + mapMinY;
          }
          
          stage.x = constrainedX;
          stage.y = constrainedY;
          setPanX(constrainedX);
          setPanY(constrainedY);
        }
      }
    }
  }, [externalZoom, internalZoom]);

  useEffect(() => {
    if (stageRef.current && canvasRef.current) {
      const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
      const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
      
      // Get current zoom from stage scale
      const currentZoom = stageRef.current.scale.x;
      
      // Calculate isometric map bounds - use world coordinates then scale for screen space
      const worldZoom = 1;
      const topLeftX = calcXPos(0, 0, worldZoom) * currentZoom;
      const topLeftY = calcYPos(0, 0, worldZoom) * currentZoom;
      const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
      const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
      const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
      
      // Find the bounding box of the isometric map
      const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
      const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
      const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
      
      const mapWidth = mapMaxX - mapMinX;
      const mapHeight = mapMaxY - mapMinY;
      
      // Constrain panning to map boundaries (with padding for smooth scrolling)
      const padding = 50;
      let constrainedX = panX;
      let constrainedY = panY;
      
      if (mapWidth > containerWidth) {
        const maxX = mapMinX + padding;
        const minX = -(mapWidth - containerWidth) + mapMinX - padding;
        constrainedX = Math.max(minX, Math.min(maxX, panX));
      } else {
        // Center the map if it's smaller than viewport
        constrainedX = (containerWidth - mapWidth) / 2 + mapMinX;
      }
      
      if (mapHeight > containerHeight) {
        const maxY = mapMinY + padding;
        const minY = -(mapHeight - containerHeight) + mapMinY - padding;
        constrainedY = Math.max(minY, Math.min(maxY, panY));
      } else {
        // Center the map if it's smaller than viewport
        constrainedY = (containerHeight - mapHeight) / 2 + mapMinY;
      }
      
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
      // Use a small delay to ensure zoom has been updated if it was changed
      const timeoutId = setTimeout(() => {
        if (!stageRef.current || !canvasRef.current) return;
        
        const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
        const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
        
        // Get current zoom from stage scale (use the zoom prop/state, not just stage scale)
        const currentZoom = Math.max(0.1, stageRef.current.scale.x);
        
        // Calculate target position (isometric) - use world coordinates then scale for screen space
        const worldZoom = 1;
        const targetX = calcXPos(centerOnCoordinate.x, centerOnCoordinate.y, worldZoom) * currentZoom;
        const targetY = calcYPos(centerOnCoordinate.x, centerOnCoordinate.y, worldZoom) * currentZoom;
        
        let newX = containerWidth / 2 - targetX;
        let newY = containerHeight / 2 - targetY;
        
        // Calculate isometric map bounds for proper constraints
        const topLeftX = calcXPos(0, 0, worldZoom) * currentZoom;
        const topLeftY = calcYPos(0, 0, worldZoom) * currentZoom;
        const topRightX = calcXPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
        const topRightY = calcYPos(GRID_WIDTH - 1, 0, worldZoom) * currentZoom;
        const bottomLeftX = calcXPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
        const bottomLeftY = calcYPos(0, GRID_HEIGHT - 1, worldZoom) * currentZoom;
        const bottomRightX = calcXPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
        const bottomRightY = calcYPos(GRID_WIDTH - 1, GRID_HEIGHT - 1, worldZoom) * currentZoom;
        
        const mapMinX = Math.min(topLeftX, topRightX, bottomLeftX, bottomRightX);
        const mapMaxX = Math.max(topLeftX, topRightX, bottomLeftX, bottomRightX);
        const mapMinY = Math.min(topLeftY, topRightY, bottomLeftY, bottomRightY);
        const mapMaxY = Math.max(topLeftY, topRightY, bottomLeftY, bottomRightY);
        
        const mapWidth = mapMaxX - mapMinX;
        const mapHeight = mapMaxY - mapMinY;
        const padding = 50;
        
        // Constrain to map boundaries
        if (mapWidth > containerWidth) {
          const maxX = mapMinX + padding;
          const minX = -(mapWidth - containerWidth) + mapMinX - padding;
          newX = Math.max(minX, Math.min(maxX, newX));
        } else {
          newX = (containerWidth - mapWidth) / 2 + mapMinX;
        }
        
        if (mapHeight > containerHeight) {
          const maxY = mapMinY + padding;
          const minY = -(mapHeight - containerHeight) + mapMinY - padding;
          newY = Math.max(minY, Math.min(maxY, newY));
        } else {
          newY = (containerHeight - mapHeight) / 2 + mapMinY;
        }
        
        stageRef.current.x = newX;
        stageRef.current.y = newY;
        setPanX(stageRef.current.x);
        setPanY(stageRef.current.y);
      }, 50); // Small delay to ensure zoom is updated
      
      return () => clearTimeout(timeoutId);
    }
  }, [centerOnCoordinate, zoom, externalZoom, internalZoom]);

  // Update current location display based on viewport center
  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    
    const containerWidth = canvasRef.current.clientWidth || CANVAS_WIDTH;
    const containerHeight = canvasRef.current.clientHeight || CANVAS_HEIGHT;
    
    // Calculate the center of the viewport in world coordinates (isometric)
    const screenCenterX = containerWidth / 2;
    const screenCenterY = containerHeight / 2;
    
    // World coordinates = (screen - pan) / zoom
    const worldX = (screenCenterX - panX) / zoom;
    const worldY = (screenCenterY - panY) / zoom;
    
    // Find closest tile (reverse isometric projection) - use world coordinates (zoom=1)
    const worldZoom = 1;
    let closestTile = { x: 0, y: 0, dist: Infinity };
    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        const tileX = calcXPos(x, y, worldZoom);
        const tileY = calcYPos(x, y, worldZoom);
        const dist = Math.sqrt((worldX - tileX) ** 2 + (worldY - tileY) ** 2);
        if (dist < closestTile.dist) {
          closestTile = { x, y, dist };
        }
      }
    }
    
    setCurrentLocation({ x: closestTile.x, y: closestTile.y });
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
