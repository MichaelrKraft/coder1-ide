'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Megaphone, Zap, Video, FileText, Gift, MessageSquare, Newspaper, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailSequence } from '@/components/templates/EmailSequence';
import { AdGenerator } from '@/components/templates/AdGenerator';
import { VSLGenerator } from '@/components/templates/VSLGenerator';
import { HooksGenerator } from '@/components/templates/HooksGenerator';
import { LandingPageGenerator } from '@/components/templates/LandingPageGenerator';
import { BonusGenerator } from '@/components/templates/BonusGenerator';
import { RedditGenerator } from '@/components/templates/RedditGenerator';
import { AdvertorialGenerator } from '@/components/templates/AdvertorialGenerator';
import { ArticleGenerator } from '@/components/templates/ArticleGenerator';
import { Project, TemplateType } from '@/types';
import { getProject, createProjectItem } from '@/lib/api/projects';
import { toast } from 'sonner';

const templateIcons: Record<TemplateType, typeof Mail> = {
  emails: Mail,
  ads: Megaphone,
  hooks: Zap,
  vsl: Video,
  'landing-page': FileText,
  bonuses: Gift,
  reddit: MessageSquare,
  advertorials: Newspaper,
  articles: ScrollText,
};

const templateNames: Record<TemplateType, string> = {
  emails: 'Email Sequence',
  ads: 'Ad Campaigns',
  hooks: 'Hooks & Headlines',
  vsl: 'Video Sales Letter',
  'landing-page': 'Landing Pages',
  bonuses: 'Bonus Creator',
  reddit: 'Reddit Posts',
  advertorials: 'Advertorials',
  articles: 'Articles',
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTemplate = (searchParams.get('template') as TemplateType) || 'emails';

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TemplateType>(defaultTemplate);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const data = await getProject(params.id as string);
        if (!data) {
          router.push('/dashboard/projects');
          return;
        }
        setProject(data);
      } catch (error) {
        toast.error('Failed to load project');
        router.push('/dashboard/projects');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [params.id, router]);

  const handleSaveEmail = async (emailIndex: number, content: string, wordsUsed: number) => {
    if (!project) return;

    try {
      await createProjectItem({
        project_id: project.id,
        template_type: 'emails',
        template_name: `email_${emailIndex + 1}`,
        content,
        words_used: wordsUsed,
        order_index: emailIndex,
      });
      toast.success('Email saved to project');
    } catch (error) {
      toast.error('Failed to save email');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            Generate copy using your blueprint
          </p>
        </div>
      </div>

      {/* Template Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
        <TabsList className="glass-card w-full justify-start overflow-x-auto">
          {(Object.keys(templateNames) as TemplateType[]).map((template) => {
            const Icon = templateIcons[template];
            return (
              <TabsTrigger
                key={template}
                value={template}
                className="flex items-center gap-2 data-[state=active]:bg-purple-500/20"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{templateNames[template]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="emails" className="mt-6">
          <EmailSequence
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveEmail={handleSaveEmail}
          />
        </TabsContent>

        <TabsContent value="ads" className="mt-6">
          <AdGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveAd={async (platform, format, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'ads',
                  template_name: `${platform}_${format}`,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Ad saved to project');
              } catch {
                toast.error('Failed to save ad');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="hooks" className="mt-6">
          <HooksGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveHook={async (hookType, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'hooks',
                  template_name: hookType,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Hooks saved to project');
              } catch {
                toast.error('Failed to save hooks');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="vsl" className="mt-6">
          <VSLGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveSection={async (sectionIndex, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'vsl',
                  template_name: `section_${sectionIndex + 1}`,
                  content,
                  words_used: wordsUsed,
                  order_index: sectionIndex,
                });
                toast.success('VSL section saved to project');
              } catch {
                toast.error('Failed to save VSL section');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="landing-page" className="mt-6">
          <LandingPageGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSavePage={async (templateId, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'landing-page',
                  template_name: templateId,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Landing page saved to project');
              } catch {
                toast.error('Failed to save landing page');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="bonuses" className="mt-6">
          <BonusGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveBonus={async (bonusType, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'bonuses',
                  template_name: bonusType,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Bonus saved to project');
              } catch {
                toast.error('Failed to save bonus');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="reddit" className="mt-6">
          <RedditGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSavePost={async (postType, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'reddit',
                  template_name: postType,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Reddit post saved to project');
              } catch {
                toast.error('Failed to save Reddit post');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="advertorials" className="mt-6">
          <AdvertorialGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveAdvertorial={async (advertorialType, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'advertorials',
                  template_name: advertorialType,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Advertorial saved to project');
              } catch {
                toast.error('Failed to save advertorial');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="articles" className="mt-6">
          <ArticleGenerator
            blueprintId={project.blueprint_id}
            projectId={project.id}
            onSaveArticle={async (articleType, content, wordsUsed) => {
              try {
                await createProjectItem({
                  project_id: project.id,
                  template_type: 'articles',
                  template_name: articleType,
                  content,
                  words_used: wordsUsed,
                  order_index: 0,
                });
                toast.success('Article saved to project');
              } catch {
                toast.error('Failed to save article');
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
