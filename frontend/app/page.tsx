'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Building2, TrendingUp, DollarSign, Trophy, Zap, Target, Sparkles, Users, Landmark, Coins } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  const parallaxY = scrollY * 0.5;
  const cursorX = typeof window !== 'undefined' ? (mousePosition.x - window.innerWidth / 2) * 0.02 : 0;
  const cursorY = typeof window !== 'undefined' ? (mousePosition.y - window.innerHeight / 2) * 0.02 : 0;

  const features = [
    {
      icon: Building2,
      title: 'Build Your Empire',
      description: 'Purchase residential, commercial, and luxury properties to expand your portfolio',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'Earn Real Yield',
      description: 'Claim daily yield from your properties backed by real-world assets',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Coins,
      title: 'Trade Properties',
      description: 'Buy and sell properties on the marketplace to maximize your returns',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: Trophy,
      title: 'Compete & Win',
      description: 'Climb the leaderboards and prove your real estate investment skills',
      color: 'from-yellow-500 to-amber-500',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Powered by Mantle blockchain for instant, low-cost transactions',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Target,
      title: 'Strategic Investment',
      description: 'Master property valuation and timing to build the ultimate portfolio',
      color: 'from-indigo-500 to-violet-500',
    },
  ];

  const stats = [
    { label: 'Active Players', value: '5K+', icon: Users },
    { label: 'Properties Owned', value: '15K+', icon: Building2 },
    { label: 'Yield Earned', value: '$500K+', icon: DollarSign },
    { label: 'Trades Today', value: '1K+', icon: TrendingUp },
  ];

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"
        style={{
          transform: `translateY(${parallaxY}px)`,
        }}
      />

      {/* Gradient Overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
      <div className="fixed inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-blue-900/20" />

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
              className="text-emerald-500/20"
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
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h1
                  className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.15em' }}
                >
                  PROPERTY TYCOON
          </h1>
              </div>

              <div className="flex gap-3">
                {isConnected ? (
                  <>
                    <Link
                      href="/game"
                      className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 font-medium transition-all duration-300 hover:scale-105"
                      style={{ letterSpacing: '0.05em' }}
                    >
                      My Portfolio
                    </Link>
                    <Link
                      href="/game"
                      className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/50"
                      style={{ letterSpacing: '0.05em' }}
                    >
                      Play Now
                    </Link>
                  </>
                ) : (
                  <WalletConnect />
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm mb-8 animate-pulse-glow">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  Powered by Mantle Blockchain
                </span>
              </div>

              {/* Main Title */}
              <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
                <span
                  className="block bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent animate-gradient"
                  style={{ letterSpacing: '0.05em' }}
                >
                  INVEST. BUILD.
                </span>
                <span
                  className="block bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent animate-gradient"
                  style={{ letterSpacing: '0.05em', animationDelay: '1s' }}
                >
                  DOMINATE.
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
                Enter the ultimate blockchain-powered real estate investment game. Build your
                property empire, earn real yield, and dominate the leaderboard in this
                revolutionary GameFi experience.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                {isConnected ? (
                  <Link
                    href="/game"
                    className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold text-lg transition-all duration-300 hover:scale-105 shadow-2xl shadow-emerald-500/50 overflow-hidden"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    <span className="relative flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      START BUILDING
                    </span>
                  </Link>
                ) : (
                  <div className="flex justify-center">
                    <WalletConnect />
                  </div>
                )}

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
                    className="group p-6 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <stat.icon className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
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

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="container mx-auto px-6">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2
                className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent"
                style={{ letterSpacing: '0.1em' }}
              >
                GAME FEATURES
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Experience the next generation of real estate investment gaming
          </p>
        </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20 overflow-hidden animate-fade-in-up"
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

        {/* RWA Integration Section */}
        <section className="py-24 relative bg-gradient-to-b from-black/0 via-emerald-900/5 to-black/0">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600"></span>
                </span>
                <h2
                  className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  REAL-WORLD ASSETS
                </h2>
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600"></span>
                </span>
              </div>
              <p className="text-xl text-gray-400">
                Properties backed by real-world assets • Real yield from actual investments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white font-numbers">100%</div>
                    <div className="text-sm text-gray-400">RWA Backed</div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 backdrop-blur-sm border border-teal-500/20 hover:border-teal-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-400 font-numbers">5-15%</div>
                    <div className="text-sm text-gray-400">Annual Yield</div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-teal-400 font-numbers flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      LIVE
                    </div>
                    <div className="text-sm text-gray-400">Real-time Updates</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/40 via-teal-900/40 to-cyan-900/40 backdrop-blur-sm border border-white/20 p-12 md:p-16 text-center shadow-2xl">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
              </div>

              <div className="relative z-10">
                <h2
                  className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  READY TO BUILD YOUR EMPIRE?
                </h2>
                <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
                  Join thousands of players worldwide in the most exciting
                  blockchain real estate investment game
                </p>

                {isConnected ? (
                  <Link
                    href="/game"
                    className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold text-xl transition-all duration-300 hover:scale-110 shadow-2xl shadow-emerald-500/50 overflow-hidden"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    <span className="relative flex items-center gap-3">
                      <Trophy className="w-6 h-6" />
                      PLAY NOW - IT'S FREE
                      <Trophy className="w-6 h-6" />
                    </span>
                  </Link>
                ) : (
                  <div className="flex justify-center">
                    <WalletConnect />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span
                  className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent"
                  style={{ letterSpacing: '0.1em' }}
                >
                  PROPERTY TYCOON
                </span>
              </div>

              <div className="text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Powered by Mantle Blockchain
                </span>
              </div>

              <div className="text-sm text-gray-500">
                © 2024 Property Tycoon. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
        </div>
    </div>
  );
}