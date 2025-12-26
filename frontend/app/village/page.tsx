'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useVillageStore, useBattleStore } from '@/lib/stores';
import { useFloatingNumberStore } from '@/lib/stores/useFloatingNumberStore';
import { VillageCanvasPlacement } from '@/components/game/VillageCanvasPlacement';
import { BuildingShop } from '@/components/game/BuildingShop';
import { ArmyTraining } from '@/components/game/ArmyTraining';
import { BattlePreparation } from '@/components/game/BattlePreparation';
import { BattleResult } from '@/components/game/BattleResult';
import { WarRoomModal } from '@/components/WarRoomModal';
import { MusicControls } from '@/components/ui/MusicControls';
import { FloatingResourceBar } from '@/components/game/FloatingResourceBar';
import { FloatingActionButtons } from '@/components/game/FloatingActionButtons';
import { FloatingBuildingInfo } from '@/components/game/FloatingBuildingInfo';
import { UserProfile } from '@/components/game/UserProfile';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { FloatingNumbersContainer } from '@/components/ui/FloatingNumber';
import { GameAtmosphere } from '@/components/game/GameAtmosphere';
import { GlobalChat } from '@/components/game/GlobalChat';
import { VillageLoadingScreen } from '@/components/game/VillageLoadingScreen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Building2, Users, Swords, Info, Plus, Trash2, History } from 'lucide-react';
import { resourcesApi, buildingsApi, Building, ResourcesWithPending } from '@/lib/api';
import { BattleSession } from '@/lib/api/battles';
import { getBuildingVisual } from '@/lib/config/buildings';
import { BuildingType } from '@/lib/config/buildingsData';

export default function VillagePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { village, isLoading: villageLoading, fetchVillage, silentRefresh, updateResources, addBuilding } = useVillageStore();
  const { numbers, removeNumber } = useFloatingNumberStore();
  const [resources, setResources] = useState<ResourcesWithPending | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [showBuildingShop, setShowBuildingShop] = useState(false);
  const [showArmyTraining, setShowArmyTraining] = useState(false);
  const [showBattlePrep, setShowBattlePrep] = useState(false);
  const [showWarRoom, setShowWarRoom] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [placementMode, setPlacementMode] = useState<{
    active: boolean;
    buildingType: BuildingType;
  } | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  // Helper function to check if building is under construction
  const isBuildingUnderConstruction = (building: Building): boolean => {
    const now = new Date();
    const completedAt = new Date(building.constructionCompletedAt);
    return now < completedAt;
  };

  // Helper function to get remaining construction time in seconds
  const getRemainingConstructionTime = (building: Building): number => {
    const now = new Date();
    const completedAt = new Date(building.constructionCompletedAt);
    return Math.max(0, Math.floor((completedAt.getTime() - now.getTime()) / 1000));
  };

  // Helper function to format time (seconds to human readable)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !village && !villageLoading) {
      fetchVillage();
    }
  }, [isAuthenticated, village, villageLoading, fetchVillage]);

  // Poll village data every 30 seconds to update collector internal storage
  useEffect(() => {
    if (isAuthenticated && village) {
      const interval = setInterval(() => {
        silentRefresh(); // Silent refresh to avoid full page re-render
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, village, silentRefresh]);

  // Fetch resources with pending amounts
  useEffect(() => {
    if (isAuthenticated && village) {
      loadResources();
      // Refresh resources every 30 seconds
      const interval = setInterval(loadResources, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, village]);

  const loadResources = async () => {
    try {
      setIsLoadingResources(true);
      const data = await resourcesApi.getMyResources();
      setResources(data);
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handlePlaceBuilding = async (x: number, y: number) => {
    if (!placementMode) return;

    setIsPlacing(true);
    try {
      const result = await buildingsApi.placeBuilding({
        type: placementMode.buildingType,
        positionX: x,
        positionY: y,
      });
      await fetchVillage();
      await loadResources();
      setPlacementMode(null);
    } catch (error: any) {
      console.error('Failed to place building:', error);
      alert(error.message || 'Failed to place building');
    } finally {
      setIsPlacing(false);
    }
  };

  const handleCancelPlacement = () => {
    setPlacementMode(null);
  };

  const handleSelectBuildingToBuild = (buildingType: BuildingType) => {
    setShowBuildingShop(false);
    setPlacementMode({
      active: true,
      buildingType,
    });
  };

  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(building);
  };

  const handleMoveBuilding = async (buildingId: string, x: number, y: number) => {
    try {
      const updated = await buildingsApi.moveBuilding(buildingId, {
        positionX: x,
        positionY: y,
      });
      await fetchVillage();
    } catch (error: any) {
      console.error('Failed to move building:', error);
      alert(error.message || 'Failed to move building');
    }
  };

  const handleBattleComplete = async (result: any) => {
    setBattleResult(result);
    setShowBattlePrep(false);
    await loadResources();
  };

  const handleCloseBattleResult = async () => {
    setBattleResult(null);
    await fetchVillage();
  };

  const handleStartRealtimeBattle = async (
    session: BattleSession,
    troops: { type: string; count: number }[],
  ) => {
    // Store battle session data in Zustand for clean URL routing
    const { setBattleSession, setSelectedTroops } = useBattleStore.getState();
    setBattleSession(session);
    setSelectedTroops(troops);

    setShowBattlePrep(false);
    // Navigate with clean URL using battle session ID
    router.push(`/battle/${session.session.id}`);
  };

  // Show loading screen if auth is loading, village is loading, or village data not available
  const isLoading = authLoading || villageLoading || !village;

  if (isLoading || showLoadingScreen) {
    return <VillageLoadingScreen onComplete={() => setShowLoadingScreen(false)} />;
  }

  // Count buildings
  const goldMines = village.buildings.filter((b) => b.type === 'gold_mine').length;
  const elixirCollectors = village.buildings.filter((b) => b.type === 'elixir_collector').length;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Game Atmosphere Effects */}
      <GameAtmosphere />

      {/* Full-screen Canvas */}
      <div className="absolute inset-0">
        <VillageCanvasPlacement
          buildings={village.buildings}
          onBuildingClick={handleBuildingClick}
          onBuildingMove={handleMoveBuilding}
          placementMode={
            placementMode
              ? {
                  active: true,
                  buildingType: placementMode.buildingType,
                  onPlace: handlePlaceBuilding,
                  onCancel: handleCancelPlacement,
                }
              : undefined
          }
        />
      </div>

      {/* Floating UI */}
      {!showArmyTraining && !battleResult && (
        <>
          {/* Top Resource Bar */}
          <FloatingResourceBar
            villageName={village.name}
            resources={resources}
            isLoading={isLoadingResources}
            onProfileClick={() => setShowProfile(true)}
          />

          {/* Action Buttons */}
          <FloatingActionButtons
            onBuild={() => setShowBuildingShop(true)}
            onTrainArmy={() => setShowArmyTraining(true)}
            onAttack={() => setShowBattlePrep(true)}
            onWarRoom={() => setShowWarRoom(true)}
            onChat={() => setShowChat(true)}
            disabled={placementMode?.active}
          />

          {/* Building Info Panel */}
          {selectedBuilding && !placementMode?.active && (
            <FloatingBuildingInfo
              building={selectedBuilding}
              onClose={() => setSelectedBuilding(null)}
              isBuildingUnderConstruction={isBuildingUnderConstruction}
              getRemainingConstructionTime={getRemainingConstructionTime}
              formatTime={formatTime}
              onCollect={async () => {
                await loadResources();
                await fetchVillage();
                // Update selectedBuilding with fresh data after collection
                const updatedVillage = useVillageStore.getState().village;
                if (updatedVillage && selectedBuilding) {
                  const updatedBuilding = updatedVillage.buildings.find(b => b.id === selectedBuilding.id);
                  if (updatedBuilding) {
                    setSelectedBuilding(updatedBuilding);
                  }
                }
              }}
              currentGold={resources?.gold || 0}
              maxGold={resources?.capacity.gold || 10000}
              currentElixir={resources?.elixir || 0}
              maxElixir={resources?.capacity.elixir || 10000}
            />
          )}
        </>
      )}

      {/* Army Training Slide Panel */}
      {showArmyTraining && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl ml-auto animate-slide-in-right bg-gray-900 shadow-2xl overflow-auto p-6">
            <ArmyTraining onClose={() => setShowArmyTraining(false)} />
          </div>
        </div>
      )}

      {/* Battle Result Full Screen Overlay */}
      {battleResult && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="flex h-full items-center justify-center p-4">
            <BattleResult result={battleResult} onClose={handleCloseBattleResult} />
          </div>
        </div>
      )}

      {/* Building Shop Modal */}
      {showBuildingShop && resources && (
        <BuildingShop
          gold={resources.gold}
          elixir={resources.elixir}
          onSelectBuilding={(type) => handleSelectBuildingToBuild(type as BuildingType)}
          onClose={() => setShowBuildingShop(false)}
        />
      )}

      {/* War Room Modal */}
      <WarRoomModal
        isOpen={showWarRoom}
        onClose={() => setShowWarRoom(false)}
      />

      {/* Global Chat */}
      <GlobalChat
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />

      {/* Battle Preparation Slide Panel */}
      <SlidePanel
        isOpen={showBattlePrep}
        onClose={() => setShowBattlePrep(false)}
        width="500px"
      >
        <BattlePreparation
          onBattleComplete={handleBattleComplete}
          onStartRealtimeBattle={handleStartRealtimeBattle}
          onCancel={() => setShowBattlePrep(false)}
        />
      </SlidePanel>

      {/* Music Controls */}
      <MusicControls />

      {/* User Profile */}
      <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Floating Numbers */}
      <FloatingNumbersContainer numbers={numbers} onRemove={removeNumber} />
    </div>
  );
}
