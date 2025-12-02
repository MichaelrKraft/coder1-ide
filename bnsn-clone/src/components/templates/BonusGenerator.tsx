'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Layers, Zap, Crown, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyEditor } from '@/components/editor';
import { cn } from '@/lib/utils';

const bonusTypes = [
  {
    id: 'bonus_description',
    name: 'Single Bonus',
    description: 'One compelling bonus with name, value & description',
    icon: Gift,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'bonus_stack',
    name: 'Bonus Stack',
    description: 'Complete stack of 3-5 bonuses with total value',
    icon: Layers,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'bonus_fast_action',
    name: 'Fast-Action Bonus',
    description: 'Time-limited bonus to create urgency',
    icon: Zap,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'bonus_upgrade',
    name: 'Premium Upgrade',
    description: 'High-value upgrade bonus for serious buyers',
    icon: Crown,
    color: 'from-amber-500 to-yellow-600'
  },
];

interface BonusGeneratorProps {
  blueprintId: string;
  projectId?: string;
  onSaveBonus?: (bonusType: string, content: string, wordsUsed: number) => void;
}

export function BonusGenerator({ blueprintId, projectId, onSaveBonus }: BonusGeneratorProps) {
  const [selectedType, setSelectedType] = useState<string>('bonus_description');
  const [completedBonuses, setCompletedBonuses] = useState<Set<string>>(new Set());

  const handleSave = (content: string, wordsUsed: number) => {
    setCompletedBonuses((prev) => new Set([...prev, selectedType]));
    if (onSaveBonus) {
      onSaveBonus(selectedType, content, wordsUsed);
    }
  };

  const selectedBonus = bonusTypes.find(b => b.id === selectedType);
  const SelectedIcon = selectedBonus?.icon || Gift;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bonus Creator</h2>
          <p className="text-sm text-muted-foreground">
            Create irresistible bonuses that make your offer a no-brainer
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {completedBonuses.size} Bonuses Created
        </Badge>
      </div>

      {/* Bonus Type Selection */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center',
              selectedBonus?.color || 'from-emerald-500 to-teal-600'
            )}>
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Bonus Types</CardTitle>
              <CardDescription>Choose the type of bonus you want to create</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {bonusTypes.map((bonus) => {
              const isCompleted = completedBonuses.has(bonus.id);
              const Icon = bonus.icon;
              return (
                <button
                  key={bonus.id}
                  onClick={() => setSelectedType(bonus.id)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all relative',
                    selectedType === bonus.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border/50 hover:border-border'
                  )}
                >
                  {isCompleted && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{bonus.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{bonus.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <CopyEditor
            blueprintId={blueprintId}
            templateType="bonuses"
            templateName={selectedType}
            onSave={handleSave}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
