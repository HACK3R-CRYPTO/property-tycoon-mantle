'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Coins,
  Droplet,
  Target,
  Star,
  CheckCircle,
  XCircle,
  Home
} from 'lucide-react';

interface BattleResultProps {
  result: {
    id: string;
    destructionPercentage: number;
    stars: number;
    lootGold: number;
    lootElixir: number;
    createdAt: string;
  };
  onClose: () => void;
}

export function BattleResult({ result, onClose }: BattleResultProps) {
  const isVictory = result.stars > 0;

  return (
    <div className="space-y-6">
      {/* Victory/Defeat Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="text-center space-y-4"
      >
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
          isVictory ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {isVictory ? (
            <CheckCircle className="h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
        </div>
        <div>
          <h1 className={`text-4xl font-bold ${
            isVictory ? 'text-green-500' : 'text-red-500'
          }`}>
            {isVictory ? 'Victory!' : 'Defeat'}
          </h1>
          <p className="text-muted-foreground">
            {isVictory
              ? 'You successfully raided the enemy village!'
              : 'Better luck next time!'}
          </p>
        </div>
      </motion.div>

      {/* Stars Display */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Battle Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stars */}
            <div className="flex items-center justify-center gap-4 py-4">
              {[1, 2, 3].map((starNum) => (
                <motion.div
                  key={starNum}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.3 + (starNum * 0.15),
                    duration: 0.5,
                    type: 'spring',
                    stiffness: 200
                  }}
                >
                  <Star
                    className={`h-16 w-16 ${
                      starNum <= result.stars
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'fill-muted text-muted'
                    }`}
                  />
                </motion.div>
              ))}
            </div>

            {/* Destruction Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Destruction
                </span>
                <span className="font-bold text-lg">{result.destructionPercentage}%</span>
              </div>
              <Progress value={result.destructionPercentage} className="h-3" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loot Display */}
      {(result.lootGold > 0 || result.lootElixir > 0) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resources Looted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Gold */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex items-center gap-3 p-4 bg-muted rounded-lg"
                >
                  <Coins className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Gold</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      +{result.lootGold.toLocaleString()}
                    </p>
                  </div>
                </motion.div>

                {/* Elixir */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="flex items-center gap-3 p-4 bg-muted rounded-lg"
                >
                  <Droplet className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Elixir</p>
                    <p className="text-2xl font-bold text-purple-500">
                      +{result.lootElixir.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Battle Stats */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Battle Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Battle ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {result.id.slice(0, 8)}...
              </code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stars Earned</span>
              <Badge variant={result.stars > 0 ? 'default' : 'secondary'}>
                {result.stars} / 3
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Destruction</span>
              <Badge variant={result.destructionPercentage >= 50 ? 'default' : 'secondary'}>
                {result.destructionPercentage}%
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Loot</span>
              <span className="font-semibold">
                {(result.lootGold + result.lootElixir).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="flex gap-3"
      >
        <Button onClick={onClose} className="flex-1" size="lg">
          <Home className="mr-2 h-4 w-4" />
          Return to Village
        </Button>
      </motion.div>
    </div>
  );
}
