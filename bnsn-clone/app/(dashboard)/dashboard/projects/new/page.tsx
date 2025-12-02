'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Megaphone, Zap, Video, FileText, Loader2, Gift, MessageSquare, Newspaper, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Blueprint, TemplateType } from '@/types';
import { getBlueprints } from '@/lib/api/blueprints';
import { createProject } from '@/lib/api/projects';
import { toast } from 'sonner';

const templates: { id: TemplateType; name: string; description: string; icon: typeof Mail }[] = [
  {
    id: 'emails',
    name: 'Email Sequence',
    description: '10-email nurture sequence',
    icon: Mail,
  },
  {
    id: 'ads',
    name: 'Ad Campaigns',
    description: 'Facebook, YouTube, TikTok ads',
    icon: Megaphone,
  },
  {
    id: 'hooks',
    name: 'Hooks & Headlines',
    description: 'Attention-grabbing copy',
    icon: Zap,
  },
  {
    id: 'vsl',
    name: 'Video Sales Letter',
    description: 'Short-form VSL scripts',
    icon: Video,
  },
  {
    id: 'landing-page',
    name: 'Landing Pages',
    description: 'Sales & opt-in pages',
    icon: FileText,
  },
  {
    id: 'bonuses',
    name: 'Bonus Creator',
    description: 'Irresistible offer bonuses',
    icon: Gift,
  },
  {
    id: 'reddit',
    name: 'Reddit Posts',
    description: 'Authentic community content',
    icon: MessageSquare,
  },
  {
    id: 'advertorials',
    name: 'Advertorials',
    description: 'Native ad & blog content',
    icon: Newspaper,
  },
  {
    id: 'articles',
    name: 'Articles',
    description: 'SEO-optimized blog posts',
    icon: ScrollText,
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBlueprintId = searchParams.get('blueprint');

  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [isLoadingBlueprints, setIsLoadingBlueprints] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState('');
  const [blueprintId, setBlueprintId] = useState(preselectedBlueprintId || '');
  const [templateType, setTemplateType] = useState<TemplateType | ''>('');

  useEffect(() => {
    const loadBlueprints = async () => {
      try {
        const data = await getBlueprints();
        setBlueprints(data);
        if (preselectedBlueprintId) {
          const selectedBlueprint = data.find((b) => b.id === preselectedBlueprintId);
          if (selectedBlueprint) {
            setName(`${selectedBlueprint.product_name} - New Project`);
          }
        }
      } catch (error) {
        toast.error('Failed to load blueprints');
      } finally {
        setIsLoadingBlueprints(false);
      }
    };

    loadBlueprints();
  }, [preselectedBlueprintId]);

  const handleCreate = async () => {
    if (!name.trim() || !blueprintId || !templateType) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);

    try {
      const project = await createProject({
        name,
        blueprint_id: blueprintId,
      });
      toast.success('Project created!');
      router.push(`/dashboard/projects/${project.id}?template=${templateType}`);
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoadingBlueprints) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">Generate copy using a blueprint</p>
        </div>
      </div>

      {/* No Blueprints Warning */}
      {blueprints.length === 0 && (
        <Card className="glass-card border-yellow-500/30">
          <CardContent className="p-6">
            <p className="text-yellow-500 mb-4">
              You need to create a blueprint first before you can start a project.
            </p>
            <Link href="/dashboard/blueprints/new">
              <Button className="btn-gradient text-white">Create Your First Blueprint</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {blueprints.length > 0 && (
        <>
          {/* Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Name your project and select a blueprint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Product Launch Campaign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blueprint">Blueprint</Label>
                <Select value={blueprintId} onValueChange={setBlueprintId}>
                  <SelectTrigger>
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
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Choose Template Type</CardTitle>
              <CardDescription>What type of copy do you want to generate?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <motion.button
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTemplateType(template.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      templateType === template.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <template.icon className={`h-8 w-8 mb-3 ${
                      templateType === template.id ? 'text-purple-500' : 'text-muted-foreground'
                    }`} />
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !blueprintId || !templateType || isCreating}
              className="btn-gradient text-white"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
