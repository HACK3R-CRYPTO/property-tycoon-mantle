/**
 * DecorationManager - Manages decorative environmental elements
 *
 * Responsibilities:
 * - Generate random decorations (trees, plants, rocks)
 * - Place decorations on empty tiles
 * - Ensure decorations don't overlap with buildings
 * - Provide consistent decoration patterns using seed-based generation
 */

import { DECORATIONS, DecorationConfig } from '../config/spriteAssets';
import type { Building } from '@/lib/api/villages';
import { getBuildingConfig, BuildingType } from '@/lib/config/buildingsData';

export interface Decoration {
  id: string;
  type: keyof typeof DECORATIONS;
  positionX: number;
  positionY: number;
  config: DecorationConfig;
}

export interface DecorationGenerationOptions {
  /** Grid width in tiles */
  gridWidth: number;
  /** Grid height in tiles */
  gridHeight: number;
  /** Density of decorations (0-1, where 0 = none, 1 = very dense) */
  density?: number;
  /** Random seed for consistent generation */
  seed?: number;
  /** Existing buildings to avoid */
  buildings?: Building[];
  /** Categories to include (default: all) */
  categories?: Array<'tree' | 'plant' | 'rock'>;
}

class DecorationManagerClass {
  private decorationTypes: Array<keyof typeof DECORATIONS>;

  constructor() {
    this.decorationTypes = Object.keys(DECORATIONS) as Array<keyof typeof DECORATIONS>;
  }

  /**
   * Generate decorations for a village map
   * @param options Generation options
   * @returns Array of decoration objects
   */
  generateDecorations(options: DecorationGenerationOptions): Decoration[] {
    const {
      gridWidth,
      gridHeight,
      density = 0.15, // Default: 15% of tiles have decorations
      seed = 12345,
      buildings = [],
      categories,
    } = options;

    const decorations: Decoration[] = [];
    const rng = this.createSeededRandom(seed);

    // Filter decoration types by category if specified
    const availableTypes = categories
      ? this.decorationTypes.filter(type =>
          categories.includes(DECORATIONS[type].category)
        )
      : this.decorationTypes;

    if (availableTypes.length === 0) {
      return decorations;
    }

    // Create a grid to track occupied tiles
    const occupiedTiles = new Set<string>();

    // Mark tiles occupied by buildings
    buildings.forEach(building => {
      // Get building size from config
      const config = getBuildingConfig(building.type as BuildingType);
      const buildingWidth = config?.size?.width || 1;
      const buildingHeight = config?.size?.height || 1;

      for (let y = 0; y < buildingHeight; y++) {
        for (let x = 0; x < buildingWidth; x++) {
          const tileX = building.positionX + x;
          const tileY = building.positionY + y;
          occupiedTiles.add(`${tileX},${tileY}`);
        }
      }
    });

    // Generate decorations
    const totalTiles = gridWidth * gridHeight;
    const targetDecorationCount = Math.floor(totalTiles * density);
    let attempts = 0;
    const maxAttempts = targetDecorationCount * 10; // Prevent infinite loops

    while (decorations.length < targetDecorationCount && attempts < maxAttempts) {
      attempts++;

      // Random position
      const x = Math.floor(rng() * gridWidth);
      const y = Math.floor(rng() * gridHeight);

      // Random decoration type
      const typeIndex = Math.floor(rng() * availableTypes.length);
      const decorationType = availableTypes[typeIndex];
      const config = DECORATIONS[decorationType];

      // Check if position is available for this decoration size
      let canPlace = true;
      for (let dy = 0; dy < config.gridSize; dy++) {
        for (let dx = 0; dx < config.gridSize; dx++) {
          const checkX = x + dx;
          const checkY = y + dy;

          // Out of bounds check
          if (checkX >= gridWidth || checkY >= gridHeight) {
            canPlace = false;
            break;
          }

          // Occupied check
          if (occupiedTiles.has(`${checkX},${checkY}`)) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }

      if (canPlace) {
        // Mark tiles as occupied
        for (let dy = 0; dy < config.gridSize; dy++) {
          for (let dx = 0; dx < config.gridSize; dx++) {
            occupiedTiles.add(`${x + dx},${y + dy}`);
          }
        }

        // Create decoration
        decorations.push({
          id: `decoration-${decorations.length}`,
          type: decorationType,
          positionX: x,
          positionY: y,
          config,
        });
      }
    }

    console.log(`🌳 Generated ${decorations.length} decorations (target: ${targetDecorationCount})`);
    return decorations;
  }

  /**
   * Create a seeded random number generator
   * Returns values between 0 and 1
   */
  private createSeededRandom(seed: number): () => number {
    let value = seed;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }

  /**
   * Get all available decoration types
   */
  getAvailableTypes(): Array<keyof typeof DECORATIONS> {
    return this.decorationTypes;
  }

  /**
   * Get decoration config by type
   */
  getDecorationConfig(type: keyof typeof DECORATIONS): DecorationConfig {
    return DECORATIONS[type];
  }

  /**
   * Filter decorations by category
   */
  getDecorationsByCategory(category: 'tree' | 'plant' | 'rock'): Array<keyof typeof DECORATIONS> {
    return this.decorationTypes.filter(type =>
      DECORATIONS[type].category === category
    );
  }
}

// Export singleton instance
export const DecorationManager = new DecorationManagerClass();

// Export class for testing
export { DecorationManagerClass };
