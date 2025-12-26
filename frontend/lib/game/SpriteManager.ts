/**
 * SpriteManager - Central asset loading and texture caching system
 *
 * Responsibilities:
 * - Load textures from asset paths
 * - Cache loaded textures for reuse
 * - Handle loading states and errors
 * - Preload critical game assets
 */

import * as PIXI from 'pixi.js';

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface SpriteLoadResult {
  texture: PIXI.Texture | null;
  state: LoadingState;
  error?: string;
}

class SpriteManagerClass {
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private loadingPromises: Map<string, Promise<PIXI.Texture>> = new Map();
  private loadingState: LoadingState = 'idle';
  private assetsLoaded: Set<string> = new Set();
  private failedAssets: Map<string, string> = new Map();

  /**
   * Get a texture by asset path. If not loaded, loads it on demand.
   * @param assetPath - Path to the asset (e.g., '/assets/buildings/town_hall.png')
   * @returns Promise resolving to PIXI.Texture
   */
  async getTexture(assetPath: string): Promise<PIXI.Texture> {
    // Return cached texture if available
    if (this.textureCache.has(assetPath)) {
      return this.textureCache.get(assetPath)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(assetPath)) {
      return this.loadingPromises.get(assetPath)!;
    }

    // Check if this asset previously failed to load
    if (this.failedAssets.has(assetPath)) {
      throw new Error(`Asset previously failed to load: ${assetPath} - ${this.failedAssets.get(assetPath)}`);
    }

    // Start loading the texture
    const loadPromise = this.loadTexture(assetPath);
    this.loadingPromises.set(assetPath, loadPromise);

    try {
      const texture = await loadPromise;
      this.textureCache.set(assetPath, texture);
      this.assetsLoaded.add(assetPath);
      this.loadingPromises.delete(assetPath);
      return texture;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.failedAssets.set(assetPath, errorMsg);
      this.loadingPromises.delete(assetPath);
      throw error;
    }
  }

  /**
   * Get a texture synchronously. Returns null if not loaded.
   * Use this only when you're sure the texture is preloaded.
   * @param assetPath - Path to the asset
   * @returns PIXI.Texture or null if not loaded
   */
  getTextureSync(assetPath: string): PIXI.Texture | null {
    return this.textureCache.get(assetPath) || null;
  }

  /**
   * Check if a texture is loaded and cached
   * @param assetPath - Path to the asset
   * @returns true if texture is loaded and ready
   */
  isLoaded(assetPath: string): boolean {
    return this.textureCache.has(assetPath);
  }

  /**
   * Preload multiple assets in parallel
   * @param assetPaths - Array of asset paths to preload
   * @returns Promise resolving when all assets are loaded
   */
  async preloadAssets(assetPaths: string[]): Promise<void> {
    this.loadingState = 'loading';
    console.log(`📦 Starting to preload ${assetPaths.length} assets...`);

    try {
      const loadPromises = assetPaths.map(path =>
        this.getTexture(path)
          .then(texture => {
            console.log(`✓ Loaded: ${path.split('/').pop()}`);
            return texture;
          })
          .catch(error => {
            console.error(`✗ Failed to preload asset: ${path}`, error);
            return null; // Continue loading other assets even if one fails
          })
      );

      await Promise.all(loadPromises);
      this.loadingState = 'loaded';
      console.log(`✅ Preloaded ${this.assetsLoaded.size} assets successfully`);
      console.log('Cached textures:', Array.from(this.textureCache.keys()).map(k => k.split('/').pop()));
    } catch (error) {
      this.loadingState = 'error';
      console.error('Error preloading assets:', error);
      throw error;
    }
  }

  /**
   * Load a single texture from a path
   * @param assetPath - Path to the asset
   * @returns Promise resolving to PIXI.Texture
   */
  private async loadTexture(assetPath: string): Promise<PIXI.Texture> {
    return new Promise((resolve, reject) => {
      // Use PIXI's Assets loader (PIXI v7+)
      PIXI.Assets.load(assetPath)
        .then((texture) => {
          if (!texture) {
            reject(new Error(`Failed to load texture: ${assetPath}`));
            return;
          }
          resolve(texture);
        })
        .catch((error) => {
          console.error(`Error loading texture ${assetPath}:`, error);
          reject(error);
        });
    });
  }

  /**
   * Clear all cached textures and reset state
   * Use this when you need to free up memory or reload assets
   */
  clearCache(): void {
    // Destroy textures to free GPU memory
    this.textureCache.forEach((texture, path) => {
      // Don't destroy base textures from PIXI's cache
      // Just clear our references
    });

    this.textureCache.clear();
    this.loadingPromises.clear();
    this.assetsLoaded.clear();
    this.failedAssets.clear();
    this.loadingState = 'idle';
    console.log('🗑️ SpriteManager cache cleared');
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return this.loadingState;
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      loaded: this.assetsLoaded.size,
      cached: this.textureCache.size,
      loading: this.loadingPromises.size,
      failed: this.failedAssets.size,
      state: this.loadingState,
    };
  }

  /**
   * Create a PIXI.Sprite from an asset path
   * Convenience method that loads texture and creates sprite
   * @param assetPath - Path to the asset
   * @returns Promise resolving to PIXI.Sprite
   */
  async createSprite(assetPath: string): Promise<PIXI.Sprite> {
    const texture = await this.getTexture(assetPath);
    return new PIXI.Sprite(texture);
  }

  /**
   * Create a sprite synchronously from preloaded texture
   * @param assetPath - Path to the preloaded asset
   * @returns PIXI.Sprite or null if texture not loaded
   */
  createSpriteSync(assetPath: string): PIXI.Sprite | null {
    const texture = this.getTextureSync(assetPath);
    if (!texture) {
      console.warn(`Texture not preloaded: ${assetPath}`);
      return null;
    }
    return new PIXI.Sprite(texture);
  }
}

// Export singleton instance
export const SpriteManager = new SpriteManagerClass();

// Export class for testing
export { SpriteManagerClass };
