/**
 * AudioManager - Centralized audio management system
 *
 * Responsibilities:
 * - Play and manage background music
 * - Play sound effects
 * - Control volume (music and SFX separately)
 * - Persist audio settings to localStorage
 * - Handle audio initialization and browser autoplay policies
 */

export type AudioType = 'music' | 'sfx';

export interface AudioConfig {
  path: string;
  type: AudioType;
  loop?: boolean;
  volume?: number;
}

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  musicEnabled: true,
  sfxEnabled: true,
};

const STORAGE_KEY = 'clash-on-somnia-audio-settings';

class AudioManagerClass {
  private backgroundMusic: HTMLAudioElement | null = null;
  private sfxPool: Map<string, HTMLAudioElement> = new Map();
  private settings: AudioSettings;
  private initialized: boolean = false;

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Initialize the audio system
   * Should be called after user interaction to comply with browser autoplay policies
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🎵 AudioManager already initialized');
      return;
    }

    try {
      console.log('🎵 Initializing AudioManager...');
      this.initialized = true;
      console.log('✅ AudioManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
      throw error;
    }
  }

  /**
   * Load background music
   * @param path Path to the audio file
   * @param autoplay Whether to start playing immediately
   */
  async loadBackgroundMusic(path: string, autoplay: boolean = false): Promise<void> {
    try {
      // Stop and cleanup existing background music
      if (this.backgroundMusic) {
        this.backgroundMusic.pause();
        this.backgroundMusic.src = '';
        this.backgroundMusic = null;
      }

      // Create new audio element
      const audio = new Audio(path);
      audio.loop = true;
      audio.volume = this.settings.musicEnabled
        ? this.settings.musicVolume
        : 0;

      this.backgroundMusic = audio;

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', (e) => reject(e), { once: true });
        audio.load();
      });

      console.log(`🎵 Background music loaded: ${path}`);

      if (autoplay && this.settings.musicEnabled) {
        await this.playBackgroundMusic();
      }
    } catch (error) {
      console.error('❌ Failed to load background music:', error);
      throw error;
    }
  }

  /**
   * Play background music
   */
  async playBackgroundMusic(): Promise<void> {
    if (!this.backgroundMusic) {
      console.warn('⚠️ No background music loaded');
      return;
    }

    if (!this.settings.musicEnabled) {
      console.log('🔇 Music is disabled');
      return;
    }

    try {
      await this.backgroundMusic.play();
      console.log('▶️ Background music playing');
    } catch (error) {
      console.error('❌ Failed to play background music:', error);
      // Likely autoplay policy violation - user needs to interact first
    }
  }

  /**
   * Pause background music
   */
  pauseBackgroundMusic(): void {
    if (this.backgroundMusic && !this.backgroundMusic.paused) {
      this.backgroundMusic.pause();
      console.log('⏸️ Background music paused');
    }
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      console.log('⏹️ Background music stopped');
    }
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.settings.musicVolume = clampedVolume;

    if (this.backgroundMusic && this.settings.musicEnabled) {
      this.backgroundMusic.volume = clampedVolume;
    }

    this.saveSettings();
    console.log(`🔊 Music volume set to: ${(clampedVolume * 100).toFixed(0)}%`);
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.settings.sfxVolume = clampedVolume;

    // Update all SFX in pool
    this.sfxPool.forEach(audio => {
      if (this.settings.sfxEnabled) {
        audio.volume = clampedVolume;
      }
    });

    this.saveSettings();
    console.log(`🔊 SFX volume set to: ${(clampedVolume * 100).toFixed(0)}%`);
  }

  /**
   * Toggle music on/off
   */
  toggleMusic(): boolean {
    this.settings.musicEnabled = !this.settings.musicEnabled;

    if (this.backgroundMusic) {
      if (this.settings.musicEnabled) {
        this.backgroundMusic.volume = this.settings.musicVolume;
        this.playBackgroundMusic();
      } else {
        this.backgroundMusic.volume = 0;
        this.pauseBackgroundMusic();
      }
    }

    this.saveSettings();
    console.log(`🎵 Music ${this.settings.musicEnabled ? 'enabled' : 'disabled'}`);
    return this.settings.musicEnabled;
  }

  /**
   * Toggle SFX on/off
   */
  toggleSfx(): boolean {
    this.settings.sfxEnabled = !this.settings.sfxEnabled;

    // Update all SFX in pool
    this.sfxPool.forEach(audio => {
      audio.volume = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
    });

    this.saveSettings();
    console.log(`🔊 SFX ${this.settings.sfxEnabled ? 'enabled' : 'disabled'}`);
    return this.settings.sfxEnabled;
  }

  /**
   * Play a sound effect
   * @param path Path to the sound effect file
   * @param volume Optional volume override (0-1)
   */
  async playSfx(path: string, volume?: number): Promise<void> {
    if (!this.settings.sfxEnabled) {
      return;
    }

    try {
      // Get or create audio element for this SFX
      let audio = this.sfxPool.get(path);

      if (!audio) {
        audio = new Audio(path);
        audio.volume = volume ?? this.settings.sfxVolume;
        this.sfxPool.set(path, audio);
      } else {
        // Reset audio to beginning if already playing
        audio.currentTime = 0;
        audio.volume = volume ?? this.settings.sfxVolume;
      }

      await audio.play();
    } catch (error) {
      console.error(`❌ Failed to play SFX: ${path}`, error);
    }
  }

  /**
   * Get current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Check if music is currently playing
   */
  isMusicPlaying(): boolean {
    return this.backgroundMusic !== null &&
           !this.backgroundMusic.paused &&
           this.settings.musicEnabled;
  }

  /**
   * Get current music playback time in seconds
   */
  getMusicCurrentTime(): number {
    return this.backgroundMusic?.currentTime ?? 0;
  }

  /**
   * Get music duration in seconds
   */
  getMusicDuration(): number {
    return this.backgroundMusic?.duration ?? 0;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): AudioSettings {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  /**
   * Cleanup all audio resources
   */
  cleanup(): void {
    this.stopBackgroundMusic();
    this.backgroundMusic = null;

    this.sfxPool.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.sfxPool.clear();

    this.initialized = false;
    console.log('🗑️ AudioManager cleaned up');
  }
}

// Export singleton instance
export const AudioManager = new AudioManagerClass();

// Export class for testing
export { AudioManagerClass };

// Predefined audio paths
export const AUDIO_PATHS = {
  BACKGROUND_MUSIC: '/assets/Land%20of%20fearless.mp3', // URL-encoded space
  // Add more audio paths as needed
  // CLICK: '/assets/sfx/click.mp3',
  // BUILD: '/assets/sfx/build.mp3',
  // ATTACK: '/assets/sfx/attack.mp3',
} as const;
