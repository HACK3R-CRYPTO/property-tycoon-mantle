'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { formatDistanceToNow } from 'date-fns';
import { Swords, Shield, Users, Trophy, Zap, Target, Sparkles, Eye, Clock } from 'lucide-react';
import { useSomniaBattleHistory } from '@/hooks/useSomniaBattleHistory';
import type { BattleResult } from '@/lib/somnia/somniaBattleClient';
import { battlesApi, PublicBattle } from '@/lib/api/battles';
import { WalletConnectButton } from '@/components/WalletConnectButton';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Live battles from database API (active battles only)
  const [liveBattles, setLiveBattles] = useState<PublicBattle[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  // On-chain battle history from Somnia DataStreams
  const { battleResults, isLoading: loadingSomnia } = useSomniaBattleHistory({
    limit: 50,
    pollInterval: 2000,
    autoRefresh: true,
  });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Load live battles from database API (active battles only)
  useEffect(() => {
    const loadLiveBattles = async () => {
      try {
        const data = await battlesApi.getRecentBattles(50);
        // Filter for ACTIVE battles only
        const active = data.battles.filter((b) => b.status === 'active');
        setLiveBattles(active);
      } catch (error) {
        console.error('Failed to load live battles:', error);
      } finally {
        setLoadingLive(false);
      }
    };

    loadLiveBattles();
    const interval = setInterval(loadLiveBattles, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const parallaxY = scrollY * 0.5;
  const cursorX = typeof window !== 'undefined' ? (mousePosition.x - window.innerWidth / 2) * 0.02 : 0;
  const cursorY = typeof window !== 'undefined' ? (mousePosition.y - window.innerHeight / 2) * 0.02 : 0;

  const features = [
    {
      icon: Swords,
      title: 'Epic Battles',
      description: 'Engage in strategic real-time battles against players worldwide',
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: Shield,
      title: 'Build & Defend',
      description: 'Construct powerful defenses to protect your village from attacks',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Users,
      title: 'Train Armies',
      description: 'Recruit and train diverse troops to create unstoppable forces',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Trophy,
      title: 'Compete & Win',
      description: 'Climb the leaderboards and prove your strategic dominance',
      color: 'from-yellow-500 to-amber-500',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Powered by Somnia blockchain for instant, seamless gameplay',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Target,
      title: 'Strategic Depth',
      description: 'Master complex tactics and outsmart your opponents',
      color: 'from-indigo-500 to-violet-500',
    },
  ];

  const stats = [
    { label: 'Active Players', value: '10K+', icon: Users },
    { label: 'Battles Today', value: '50K+', icon: Swords },
    { label: 'Villages Built', value: '25K+', icon: Shield },
    { label: 'Trophies Earned', value: '100K+', icon: Trophy },
  ];

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/bg/map001.svg')",
          transform: `translateY(${parallaxY}px)`,
          filter: 'brightness(0.3)',
        }}
      />

      {/* Gradient Overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
      <div className="fixed inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-blue-900/20" />

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          >
            <Sparkles
              className="text-amber-500/20"
              size={Math.random() * 20 + 10}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Swords className="w-6 h-6 text-white" />
                </div>
                <h1
                  className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.15em' }}
                >
                  CLASH ON SOMNIA
                </h1>
              </div>

              <div className="flex gap-3">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => router.push('/village')}
                      className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 font-medium transition-all duration-300 hover:scale-105"
                      style={{ letterSpacing: '0.05em' }}
                    >
                      My Village
                    </button>
                    <button
                      onClick={() => router.push('/village')}
                      className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/50"
                      style={{ letterSpacing: '0.05em' }}
                    >
                      Play Now
                    </button>
                  </>
                ) : (
                  <WalletConnectButton />
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20">
          <div className="container mx-auto px-6 text-center">
            <div
              className="animate-fade-in-up"
              style={{ transform: `translate(${cursorX}px, ${cursorY}px)` }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm mb-8 animate-pulse-glow">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Powered by Somnia Blockchain
                </span>
              </div>

              {/* Main Title */}
              <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
                <span
                  className="block bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient"
                  style={{ letterSpacing: '0.05em' }}
                >
                  BUILD. BATTLE.
                </span>
                <span
                  className="block bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500 bg-clip-text text-transparent animate-gradient"
                  style={{ letterSpacing: '0.05em', animationDelay: '1s' }}
                >
                  CONQUER.
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
                Enter the ultimate blockchain-powered strategy game. Build your
                empire, train mighty armies, and dominate the battlefield in
                real-time multiplayer combat.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <button
                  onClick={() =>
                    router.push(isAuthenticated ? '/village' : '/register')
                  }
                  className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold text-lg transition-all duration-300 hover:scale-105 shadow-2xl shadow-orange-500/50 overflow-hidden"
                  style={{ letterSpacing: '0.08em' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <span className="relative flex items-center gap-2">
                    <Swords className="w-5 h-5" />
                    START YOUR JOURNEY
                  </span>
                </button>

                <button
                  onClick={() => {
                    document
                      .getElementById('features')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 font-bold text-lg transition-all duration-300 hover:scale-105"
                  style={{ letterSpacing: '0.08em' }}
                >
                  Learn More
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="group p-6 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <stat.icon className="w-8 h-8 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <div className="text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent font-numbers">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-scroll-down" />
            </div>
          </div>
        </section>

        {/* LIVE BATTLES Section */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            {/* Section Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                {liveBattles.length > 0 && (
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                  </span>
                )}
                <h2
                  className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  LIVE BATTLES NOW
                </h2>
                {liveBattles.length > 0 && (
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-400">
                {liveBattles.length > 0
                  ? `${liveBattles.length} epic ${liveBattles.length === 1 ? 'battle' : 'battles'} happening right now!`
                  : 'Waiting for epic confrontations...'}
              </p>
            </div>

            {/* Live Battle Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
              <div className="p-6 rounded-xl bg-gradient-to-br from-red-600/10 to-pink-600/10 backdrop-blur-sm border border-red-600/20 hover:border-red-600/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center animate-pulse">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-400 font-numbers flex items-center gap-2">
                      {liveBattles.length > 0 && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                      {liveBattles.length}
                    </div>
                    <div className="text-sm text-gray-400">Live Now</div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Swords className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-400 font-numbers">
                      LIVE
                    </div>
                    <div className="text-sm text-gray-400">Real-time Spectating</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Battle Table */}
            {loadingLive ? (
              <div className="text-center py-12">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-red-500 border-r-transparent"></div>
                <p className="mt-4 text-gray-400">Loading live battles...</p>
              </div>
            ) : liveBattles.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-400 mb-2">No live battles right now</h3>
                <p className="text-gray-500 mb-6">Check back soon for epic live confrontations!</p>
                {!isAuthenticated && (
                  <button
                    onClick={() => router.push('/register')}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-red-500/50"
                    style={{ letterSpacing: '0.05em' }}
                  >
                    Start Your Battle
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            Attacker
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            VS
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            Defender
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            Results
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            Time
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider"
                            style={{ letterSpacing: '0.1em' }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {liveBattles.map((battle, index) => {
                          const totalTroops = battle.attackerTroops.reduce((sum, t) => sum + t.count, 0);

                          return (
                            <tr
                              key={battle.id}
                              className="group transition-all duration-300 hover:bg-white/5 bg-red-500/5 animate-fade-in-up"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              {/* Status */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                                  </span>
                                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                                    LIVE
                                  </span>
                                </div>
                              </td>

                              {/* Attacker */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-bold text-white">
                                    {battle.attackerVillage.name}
                                  </div>
                                  <div className="text-xs text-amber-400 font-numbers">
                                    {totalTroops} troops
                                  </div>
                                </div>
                              </td>

                              {/* VS */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="inline-flex px-3 py-1 rounded-lg bg-gradient-to-r from-red-500/20 to-blue-500/20 border border-white/10">
                                  <span className="text-sm font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                                    VS
                                  </span>
                                </div>
                              </td>

                              {/* Defender */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-bold text-white">
                                    {battle.defenderVillage.name}
                                  </div>
                                  <div className="text-xs text-blue-400">Defender</div>
                                </div>
                              </td>

                              {/* Results */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-gray-500 text-sm">In Progress...</span>
                              </td>

                              {/* Time */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(battle.createdAt), {
                                    addSuffix: true,
                                  })}
                                </div>
                              </td>

                              {/* Action */}
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => router.push(`/battle/${battle.id}/spectate`)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 hover:scale-105 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/50"
                                  style={{ letterSpacing: '0.05em' }}
                                >
                                  <Eye className="w-4 h-4" />
                                  WATCH
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* On-Chain Battle History Section - Somnia DataStreams */}
        <section className="py-24 relative bg-gradient-to-b from-black/0 via-green-900/5 to-black/0">
          <div className="container mx-auto px-6">
            {/* Section Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-600"></span>
                </span>
                <h2
                  className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  ON-CHAIN BATTLE HISTORY
                </h2>
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-600"></span>
                </span>
              </div>
              <p className="text-xl text-gray-400">
                Permanent, verifiable battle results • Powered by Somnia DataStreams
              </p>
            </div>

            {/* Somnia Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white font-numbers">{battleResults.length}</div>
                    <div className="text-sm text-gray-400">On-Chain Battles</div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-400 font-numbers">
                      100%
                    </div>
                    <div className="text-sm text-gray-400">Decentralized</div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 backdrop-blur-sm border border-teal-500/20 hover:border-teal-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-teal-400 font-numbers flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      LIVE
                    </div>
                    <div className="text-sm text-gray-400">Real-time Updates</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Somnia Battle History Table */}
            {loadingSomnia ? (
              <div className="text-center py-12">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
                <p className="mt-4 text-gray-400">Loading on-chain history...</p>
              </div>
            ) : battleResults.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-400 mb-2">No battles recorded yet</h3>
                <p className="text-gray-500 mb-6">Battle results will be permanently stored on-chain</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/0 backdrop-blur-sm">
                    <table className="min-w-full divide-y divide-green-500/10">
                      <thead className="bg-green-500/5">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            Time
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            Attacker
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            VS
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            Defender
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            Result
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            Loot
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-500/5">
                        {battleResults.slice(0, 10).map((battle, index) => {
                          const getStarDisplay = (stars: number) => '⭐'.repeat(stars);

                          return (
                            <tr
                              key={`${battle.battleId}-${index}`}
                              className="group transition-all duration-300 hover:bg-green-500/5 animate-fade-in-up"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(battle.timestamp), { addSuffix: true })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-amber-400">{battle.attackerId}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="inline-flex px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-green-500/20">
                                  <span className="text-sm font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                                    VS
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-blue-400">{battle.defenderId}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-yellow-400">{getStarDisplay(battle.stars)}</span>
                                  <span className="text-gray-400">{battle.destructionPercentage}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1 text-xs font-numbers">
                                  <span className="text-yellow-500">🪙 {battle.lootGold.toLocaleString()}</span>
                                  <span className="text-purple-500">💜 {battle.lootElixir.toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50 uppercase tracking-wider">
                                  {battle.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="container mx-auto px-6">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2
                className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
                style={{ letterSpacing: '0.1em' }}
              >
                GAME FEATURES
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Experience the next generation of strategy gaming
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Gradient Glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                  />

                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3
                    className="text-2xl font-bold mb-3 text-white"
                    style={{ letterSpacing: '0.05em' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover Border Animation */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 backdrop-blur-sm border border-white/20 p-12 md:p-16 text-center shadow-2xl">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
              </div>

              <div className="relative z-10">
                <h2
                  className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  READY TO DOMINATE?
                </h2>
                <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
                  Join thousands of players worldwide in the most exciting
                  blockchain strategy game
                </p>

                <button
                  onClick={() =>
                    router.push(isAuthenticated ? '/village' : '/register')
                  }
                  className="group relative px-10 py-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold text-xl transition-all duration-300 hover:scale-110 shadow-2xl shadow-orange-500/50 overflow-hidden"
                  style={{ letterSpacing: '0.1em' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <span className="relative flex items-center gap-3">
                    <Trophy className="w-6 h-6" />
                    PLAY NOW - IT'S FREE
                    <Trophy className="w-6 h-6" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Swords className="w-6 h-6 text-white" />
                </div>
                <span
                  className="font-bold text-lg bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  CLASH ON SOMNIA
                </span>
              </div>

              <div className="text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Powered by Somnia Blockchain
                </span>
              </div>

              <div className="text-sm text-gray-500">
                © 2024 Clash on Somnia. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
