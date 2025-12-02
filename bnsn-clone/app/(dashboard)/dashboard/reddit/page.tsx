'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RedditGenerator } from '@/components/templates/RedditGenerator';
import { Blueprint } from '@/types';
import { getBlueprints } from '@/lib/api/blueprints';
import { toast } from 'sonner';

export default function RedditPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBlueprints = async () => {
      try {
        const data = await getBlueprints();
        setBlueprints(data);
        if (data.length > 0) {
          setSelectedBlueprint(data[0].id);
        }
      } catch (error) {
        toast.error('Failed to load blueprints');
      } finally {
        setIsLoading(false);
      }
    };

    loadBlueprints();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (blueprints.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Reddit Post Generator</h1>
          <p className="text-muted-foreground">Create authentic Reddit posts for organic marketing</p>
        </div>

        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create a Blueprint First</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              You need to create a blueprint before generating Reddit posts. The blueprint provides the
              context about your product and audience.
            </p>
            <Link href="/dashboard/blueprints/new">
              <Button className="btn-gradient text-white">
                Create Blueprint
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reddit Post Generator</h1>
          <p className="text-muted-foreground">Create authentic posts that drive organic engagement</p>
        </div>
      </div>

      {/* Blueprint Selector */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Blueprint</CardTitle>
          <CardDescription>Choose which product/service to create Reddit posts for</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedBlueprint} onValueChange={setSelectedBlueprint}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Select a blueprint" />
            </SelectTrigger>
            <SelectContent>
              {blueprints.map((blueprint) => (
                <SelectItem key={blueprint.id} value={blueprint.id}>
                  {blueprint.name} - {blueprint.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reddit Generator */}
      {selectedBlueprint && (
        <RedditGenerator
          blueprintId={selectedBlueprint}
          onSavePost={(postType, content, wordsUsed) => {
            toast.success(`${postType.replace('reddit_', '').replace('_', ' ')} post generated!`);
          }}
        />
      )}
    </motion.div>
  );
}
