'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, User, Mic, List, Search, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyEditor } from '@/components/editor';
import { cn } from '@/lib/utils';

const advertorialTypes = [
  {
    id: 'advertorial_news',
    name: 'News Style',
    description: 'Journalistic format for Taboola/Outbrain native ads',
    icon: Newspaper,
    color: 'from-blue-600 to-blue-700'
  },
  {
    id: 'advertorial_discovery',
    name: 'Discovery Story',
    description: 'Personal breakthrough narrative that converts',
    icon: User,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'advertorial_interview',
    name: 'Expert Interview',
    description: 'Q&A format with authority positioning',
    icon: Mic,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'advertorial_listicle',
    name: 'Listicle Style',
    description: '"5 Secrets" format that educates while selling',
    icon: List,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'advertorial_expose',
    name: 'Industry Exposé',
    description: 'Controversial angle that captures attention',
    icon: Search,
    color: 'from-red-600 to-pink-600'
  },
];

interface AdvertorialGeneratorProps {
  blueprintId: string;
  projectId?: string;
  onSaveAdvertorial?: (advertorialType: string, content: string, wordsUsed: number) => void;
}

export function AdvertorialGenerator({ blueprintId, projectId, onSaveAdvertorial }: AdvertorialGeneratorProps) {
  const [selectedType, setSelectedType] = useState<string>('advertorial_news');
  const [completedAdvertorials, setCompletedAdvertorials] = useState<Set<string>>(new Set());

  const handleSave = (content: string, wordsUsed: number) => {
    setCompletedAdvertorials((prev) => new Set([...prev, selectedType]));
    if (onSaveAdvertorial) {
      onSaveAdvertorial(selectedType, content, wordsUsed);
    }
  };

  const selectedAdvertorial = advertorialTypes.find(a => a.id === selectedType);
  const SelectedIcon = selectedAdvertorial?.icon || Newspaper;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Advertorial Generator</h2>
          <p className="text-sm text-muted-foreground">
            Create native content that looks editorial but converts like ads
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {completedAdvertorials.size} Advertorials Created
        </Badge>
      </div>

      {/* Advertorial Type Selection */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center',
              selectedAdvertorial?.color || 'from-blue-600 to-blue-700'
            )}>
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Advertorial Styles</CardTitle>
              <CardDescription>Choose the format for your native advertising content</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {advertorialTypes.map((advertorial) => {
              const isCompleted = completedAdvertorials.has(advertorial.id);
              const Icon = advertorial.icon;
              return (
                <button
                  key={advertorial.id}
                  onClick={() => setSelectedType(advertorial.id)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all relative',
                    selectedType === advertorial.id
                      ? 'border-blue-500 bg-blue-500/10'
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
                    <h4 className="font-medium text-sm">{advertorial.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{advertorial.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Framework info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <strong>PAS Framework:</strong> All advertorials follow Jon Benson's Problem-Agitate-Solution structure.
          They look like editorial content but subtly guide readers toward your offer.
        </p>
      </div>

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
            templateType="advertorials"
            templateName={selectedType}
            onSave={handleSave}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
