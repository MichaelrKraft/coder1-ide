"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Check,
  Trash2,
  Star,
  MessageSquare,
  RefreshCw,
  Handshake,
} from "lucide-react";
import type { OutreachTemplate } from "@/types";

export type TemplateCategory = "initial" | "follow_up" | "negotiation";

interface MessageTemplatesProps {
  templates: OutreachTemplate[];
  selectedTemplateId?: string | null;
  onSelect: (template: OutreachTemplate) => void;
  onCreate?: (template: Omit<OutreachTemplate, "id" | "user_id" | "created_at" | "updated_at">) => void;
  onDelete?: (templateId: string) => void;
  disabled?: boolean;
  className?: string;
}

// Default templates for when none exist
const DEFAULT_TEMPLATES: Omit<OutreachTemplate, "id" | "user_id" | "created_at" | "updated_at">[] = [
  {
    name: "Friendly Introduction",
    subject: "Loved your recent content, {first_name}!",
    body: `Hey {first_name}!

I've been following your content for a while now and absolutely love what you're doing. Your authenticity really stands out!

I'm {your_name} from {company_name}, and I think there could be a really exciting collaboration opportunity between us with {product_name}.

Would you be open to a quick chat to explore this? No pressure at all - just thought it might be worth exploring!

Best,
{your_name}`,
    variables: ["first_name", "your_name", "company_name", "product_name"],
    category: "initial",
    is_default: true,
  },
  {
    name: "Professional Pitch",
    subject: "Partnership Opportunity with {company_name}",
    body: `Dear {first_name},

I hope this message finds you well. My name is {your_name}, and I'm the {your_title} at {company_name}.

We've been impressed by your engagement rates and the authentic connection you have with your {follower_count} followers. We believe there's a strong alignment between your audience and {product_name}.

We'd love to discuss a potential partnership that could be mutually beneficial. Our typical collaborations include:
- Sponsored content creation
- Product seeding and reviews
- Long-term brand ambassadorship

Would you be available for a brief call this week to explore this opportunity?

Best regards,
{your_name}
{your_title}, {company_name}`,
    variables: ["first_name", "your_name", "your_title", "company_name", "follower_count", "product_name"],
    category: "initial",
    is_default: true,
  },
  {
    name: "Gentle Follow-up",
    subject: "Quick follow-up - {company_name} x {username}",
    body: `Hey {first_name}!

Hope you're doing great! I reached out last week about a potential collaboration with {company_name} - just wanted to bump this to the top of your inbox in case it got buried.

I totally understand how busy you must be! If this isn't the right time, no worries at all. But if you're interested in chatting about {product_name}, I'd love to hear from you.

Take care!
{your_name}`,
    variables: ["first_name", "company_name", "username", "product_name", "your_name"],
    category: "follow_up",
    is_default: true,
  },
  {
    name: "Final Follow-up",
    subject: "Last check-in - {product_name} collab",
    body: `Hi {first_name},

I wanted to send one final message about the collaboration opportunity with {company_name}. I don't want to clog up your inbox, so this will be my last follow-up.

If timing is ever right in the future, my door is always open! You can reach me at this email anytime.

Wishing you continued success!

Cheers,
{your_name}`,
    variables: ["first_name", "product_name", "company_name", "your_name"],
    category: "follow_up",
    is_default: true,
  },
  {
    name: "Rate Discussion",
    subject: "Re: Collaboration details - {campaign_name}",
    body: `Hi {first_name},

Thanks so much for your interest in working together! I'm excited about the possibility.

Based on our campaign goals for {campaign_name} and your incredible engagement with your audience, here's what we had in mind:

{offer_details}

This would include:
- [Deliverable 1]
- [Deliverable 2]  
- Usage rights for [timeframe]

Let me know your thoughts - I'm definitely open to discussion to make sure this works well for both of us!

Looking forward to hearing from you.

Best,
{your_name}`,
    variables: ["first_name", "campaign_name", "offer_details", "your_name"],
    category: "negotiation",
    is_default: true,
  },
];

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  initial: <MessageSquare className="h-4 w-4" />,
  follow_up: <RefreshCw className="h-4 w-4" />,
  negotiation: <Handshake className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  initial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  follow_up: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  negotiation: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function MessageTemplates({
  templates,
  selectedTemplateId,
  onSelect,
  onCreate,
  onDelete,
  disabled,
  className,
}: MessageTemplatesProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newTemplate, setNewTemplate] = React.useState({
    name: "",
    subject: "",
    body: "",
    category: "initial" as TemplateCategory,
  });

  // Use default templates if none provided
  const displayTemplates = templates.length > 0 ? templates : DEFAULT_TEMPLATES.map((t, i) => ({
    ...t,
    id: `default-${i}`,
    user_id: "default",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Group templates by category
  const groupedTemplates = displayTemplates.reduce((acc, template) => {
    const category = (template.category || "initial") as TemplateCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<TemplateCategory, OutreachTemplate[]>);

  const handleCreate = () => {
    if (onCreate && newTemplate.name && newTemplate.subject && newTemplate.body) {
      // Extract variables from template
      const allText = `${newTemplate.subject} ${newTemplate.body}`;
      const variables = [...new Set(allText.match(/\{([a-z_]+)\}/g) || [])].map(
        (v) => v.slice(1, -1)
      );

      onCreate({
        name: newTemplate.name,
        subject: newTemplate.subject,
        body: newTemplate.body,
        variables,
        category: newTemplate.category,
        is_default: false,
      });

      setNewTemplate({ name: "", subject: "", body: "", category: "initial" });
      setCreateDialogOpen(false);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Message Templates
          </CardTitle>
          {onCreate && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={disabled}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable message template. Use {"{variable_name}"} syntax for dynamic content.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        placeholder="e.g., Friendly Introduction"
                        value={newTemplate.name}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-category">Category</Label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(v) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            category: v as TemplateCategory,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="initial">Initial Outreach</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-subject">Subject Line</Label>
                    <Input
                      id="template-subject"
                      placeholder="e.g., Hey {first_name}, let's collaborate!"
                      value={newTemplate.subject}
                      onChange={(e) =>
                        setNewTemplate((prev) => ({ ...prev, subject: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-body">Message Body</Label>
                    <Textarea
                      id="template-body"
                      placeholder="Write your template message here..."
                      className="min-h-[200px] font-mono text-sm"
                      value={newTemplate.body}
                      onChange={(e) =>
                        setNewTemplate((prev) => ({ ...prev, body: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newTemplate.name || !newTemplate.subject || !newTemplate.body}
                  >
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {(["initial", "follow_up", "negotiation"] as TemplateCategory[]).map((category) => {
              const categoryTemplates = groupedTemplates[category] || [];
              if (categoryTemplates.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_ICONS[category]}
                    {category.replace("_", " ")}
                  </div>
                  <div className="space-y-2">
                    {categoryTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => onSelect(template)}
                          disabled={disabled}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {template.name}
                                </span>
                                {template.is_default && (
                                  <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {template.subject}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                              {onDelete && !template.is_default && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(template.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", CATEGORY_COLORS[category])}
                            >
                              {category.replace("_", " ")}
                            </Badge>
                            {template.variables.length > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {template.variables.length} variables
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_TEMPLATES };
