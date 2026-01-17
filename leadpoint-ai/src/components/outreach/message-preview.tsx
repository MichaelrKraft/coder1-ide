"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Monitor, FileText } from "lucide-react";
import type { Influencer } from "@/types";

interface VariableValues {
  first_name?: string;
  last_name?: string;
  username?: string;
  follower_count?: string;
  product_name?: string;
  product_link?: string;
  offer_details?: string;
  company_name?: string;
  your_name?: string;
  your_title?: string;
  campaign_name?: string;
  deadline?: string;
}

interface MessagePreviewProps {
  subject: string;
  body: string;
  influencer?: Influencer | null;
  variableValues?: VariableValues;
  className?: string;
}

// Utility to substitute variables in text
function substituteVariables(text: string, values: VariableValues): string {
  let result = text;
  
  const substitutions: Record<string, string | undefined> = {
    "{first_name}": values.first_name,
    "{last_name}": values.last_name,
    "{username}": values.username,
    "{follower_count}": values.follower_count,
    "{product_name}": values.product_name,
    "{product_link}": values.product_link,
    "{offer_details}": values.offer_details,
    "{company_name}": values.company_name,
    "{your_name}": values.your_name,
    "{your_title}": values.your_title,
    "{campaign_name}": values.campaign_name,
    "{deadline}": values.deadline,
  };

  Object.entries(substitutions).forEach(([variable, value]) => {
    if (value) {
      result = result.replaceAll(variable, value);
    }
  });

  return result;
}

// Format follower count
function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Highlight remaining variables in text
function highlightVariables(text: string): React.ReactNode[] {
  const variableRegex = /\{[a-z_]+\}/g;
  const parts = text.split(variableRegex);
  const matches = text.match(variableRegex) || [];
  
  const result: React.ReactNode[] = [];
  parts.forEach((part, index) => {
    result.push(<span key={`text-${index}`}>{part}</span>);
    if (matches[index]) {
      result.push(
        <Badge 
          key={`var-${index}`} 
          variant="outline" 
          className="mx-0.5 text-xs bg-amber-500/10 text-amber-500 border-amber-500"
        >
          {matches[index]}
        </Badge>
      );
    }
  });
  
  return result;
}

export function MessagePreview({
  subject,
  body,
  influencer,
  variableValues = {},
  className,
}: MessagePreviewProps) {
  // Merge influencer data with provided variable values
  const mergedValues: VariableValues = {
    ...variableValues,
    first_name: variableValues.first_name || influencer?.username?.split(/[_.]/).at(0) || "there",
    username: variableValues.username || influencer?.username,
    follower_count: variableValues.follower_count || 
      (influencer?.follower_count ? formatFollowerCount(influencer.follower_count) : undefined),
  };

  const previewSubject = substituteVariables(subject, mergedValues);
  const previewBody = substituteVariables(body, mergedValues);

  // Count characters and words
  const charCount = previewBody.length;
  const wordCount = previewBody.trim() ? previewBody.trim().split(/\s+/).length : 0;

  // Check for remaining variables
  const remainingVarsInSubject = (subject.match(/\{[a-z_]+\}/g) || []).filter(
    (v) => !mergedValues[v.slice(1, -1) as keyof VariableValues]
  );
  const remainingVarsInBody = (body.match(/\{[a-z_]+\}/g) || []).filter(
    (v) => !mergedValues[v.slice(1, -1) as keyof VariableValues]
  );
  const hasUnfilledVars = remainingVarsInSubject.length > 0 || remainingVarsInBody.length > 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Message Preview</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{charCount} chars</span>
            <span className="text-border">|</span>
            <span>{wordCount} words</span>
          </div>
        </div>
        {hasUnfilledVars && (
          <p className="text-xs text-amber-500 mt-1">
            Some variables are not filled in and will show as placeholders
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="desktop" className="text-xs">
              <Monitor className="h-3 w-3 mr-1" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Raw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="desktop" className="mt-0">
            <div className="rounded-lg border bg-background p-4 space-y-3">
              {/* Email header */}
              <div className="border-b pb-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16">To:</span>
                  <span className="font-medium">
                    {influencer?.email || influencer?.username || "recipient@example.com"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16">Subject:</span>
                  <span className="font-medium">{highlightVariables(previewSubject)}</span>
                </div>
              </div>
              {/* Email body */}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {highlightVariables(previewBody)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mobile" className="mt-0">
            {/* Mobile device mockup */}
            <div className="mx-auto w-[280px]">
              <div className="rounded-[2rem] border-4 border-zinc-700 bg-zinc-900 p-2">
                {/* Notch */}
                <div className="mx-auto w-20 h-5 bg-zinc-700 rounded-full mb-2" />
                {/* Screen */}
                <div className="rounded-2xl bg-background overflow-hidden">
                  {/* Status bar */}
                  <div className="h-6 bg-muted/50 px-4 flex items-center justify-between text-[10px]">
                    <span>9:41</span>
                    <span>100%</span>
                  </div>
                  {/* Message app header */}
                  <div className="px-3 py-2 border-b bg-muted/30">
                    <div className="text-xs font-semibold truncate">
                      {highlightVariables(previewSubject)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      To: {influencer?.username || "recipient"}
                    </div>
                  </div>
                  {/* Message body */}
                  <div className="p-3 text-xs leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                    {highlightVariables(previewBody)}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-0">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Subject:</div>
                <code className="block text-sm bg-background p-2 rounded border">
                  {subject || "(empty)"}
                </code>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Body:</div>
                <code className="block text-sm bg-background p-2 rounded border whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {body || "(empty)"}
                </code>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export { substituteVariables, formatFollowerCount };
