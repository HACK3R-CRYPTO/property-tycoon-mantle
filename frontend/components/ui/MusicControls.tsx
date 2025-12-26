'use client';

import { useEffect, useState } from 'react';
import { AudioManager, AUDIO_PATHS } from '@/lib/game/AudioManager';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function MusicControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(50);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Initialize audio manager and load background music
    const initializeAudio = async () => {
      try {
        await AudioManager.initialize();
        const settings = AudioManager.getSettings();
        setIsMusicEnabled(settings.musicEnabled);
        setMusicVolume(Math.round(settings.musicVolume * 100));

        // Load background music (don't autoplay to comply with browser policies)
        await AudioManager.loadBackgroundMusic(AUDIO_PATHS.BACKGROUND_MUSIC, false);

        console.log('🎵 Background music loaded and ready');
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initializeAudio();

    // Cleanup on unmount
    return () => {
      AudioManager.pauseBackgroundMusic();
    };
  }, []);

  // Update playing state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(AudioManager.isMusicPlaying());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying) {
      AudioManager.pauseBackgroundMusic();
      setIsPlaying(false);
    } else {
      await AudioManager.playBackgroundMusic();
      setIsPlaying(true);
    }
  };

  const handleToggleMusic = () => {
    const enabled = AudioManager.toggleMusic();
    setIsMusicEnabled(enabled);
    setIsPlaying(enabled && AudioManager.isMusicPlaying());
  };

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0] / 100;
    AudioManager.setMusicVolume(volume);
    setMusicVolume(value[0]);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-gray-900/90 p-2 shadow-lg backdrop-blur-sm">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          className="h-8 w-8 text-white hover:bg-white/20"
          title={isPlaying ? 'Pause music' : 'Play music'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Volume Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleMusic}
          className="h-8 w-8 text-white hover:bg-white/20"
          title={isMusicEnabled ? 'Mute music' : 'Unmute music'}
        >
          {isMusicEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>

        {/* Volume Slider (expandable) */}
        {showControls && (
          <div className="flex items-center gap-2">
            <Slider
              value={[musicVolume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-24"
              disabled={!isMusicEnabled}
            />
            <span className="min-w-[3ch] text-xs text-white">{musicVolume}%</span>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowControls(!showControls)}
          className="h-8 w-8 text-white hover:bg-white/20"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showControls ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
      </div>

      {/* Music title */}
      {showControls && (
        <div className="mt-2 rounded-lg bg-gray-900/90 p-2 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs text-gray-300">Land of Fearless</p>
        </div>
      )}
    </div>
  );
}
