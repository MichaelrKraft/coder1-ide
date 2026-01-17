"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { ToneSelector, type MessageTone } from "./tone-selector";
import { VariableInserter } from "./variable-inserter";
import { MessagePreview, formatFollowerCount } from "./message-preview";
import { MessageTemplates, DEFAULT_TEMPLATES, type TemplateCategory } from "./message-templates";
import { ChannelSelector, ChannelBadge, type OutreachChannel } from "./channel-selector";
import { EmailPreview, EmailPreviewToggle } from "./email-preview";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Send,
  Save,
  Copy,
  Loader2,
  RefreshCw,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  Instagram,
  Youtube,
  MessageCircle,
  Mail,
  AlertTriangle,
  Check,
} from "lucide-react";
import type { Influencer, OutreachTemplate, Platform } from "@/types";

// Types
export type MessageType = "initial" | "follow_up" | "negotiation";

interface AIGenerationOptions {
  tone: MessageTone;
  messageType: MessageType;
  additionalContext: string;
}

interface MessageVariation {
  id: string;
  subject: string;
  body: string;
  tone: MessageTone;
}

// Extended Influencer type with contact_email
interface InfluencerWithEmail extends Influencer {
  contact_email?: string | null;
}

interface OutreachComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencer: InfluencerWithEmail | null;
  campaignId?: string;
  onSendEmail?: (message: { subject: string; body: string; channel: "email" }) => Promise<void>;
  onSendDM?: (message: { subject: string; body: string; channel: "dm" }) => Promise<void>;
  onSend?: (message: { subject: string; body: string }) => Promise<void>;
  onSaveDraft?: (message: { subject: string; body: string }) => void;
  onMarkAsSent?: (message: { subject: string; body: string }) => void;
  initialSubject?: string;
  initialBody?: string;
  initialChannel?: OutreachChannel;
  templates?: OutreachTemplate[];
}

// Platform icons
const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  tiktok: <MessageCircle className="h-4 w-4" />,
  twitter: <MessageCircle className="h-4 w-4" />,
};

// Mock AI generation function (replace with actual API call)
async function generateAIMessage(
  influencer: Influencer,
  options: AIGenerationOptions
): Promise<MessageVariation[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const { tone, messageType, additionalContext } = options;
  const name = influencer.username?.split(/[_.]/).at(0) || "there";

  // Generate variations based on tone and type
  const variations: MessageVariation[] = [
    {
      id: "var-1",
      subject:
        tone === "professional"
          ? `Partnership Opportunity - ${influencer.username}`
          : tone === "enthusiastic"
          ? `Excited to connect, {first_name}!`
          : `Hey {first_name}, quick question!`,
      body: generateBody(influencer, { ...options, variation: 1 }),
      tone,
    },
    {
      id: "var-2",
      subject:
        tone === "professional"
          ? `Collaboration Proposal for {username}`
          : tone === "casual"
          ? `Saw your content and had to reach out`
          : `{first_name}, I have an idea for you`,
      body: generateBody(influencer, { ...options, variation: 2 }),
      tone,
    },
    {
      id: "var-3",
      subject:
        messageType === "follow_up"
          ? `Quick follow-up - {company_name}`
          : messageType === "negotiation"
          ? `Re: Partnership details`
          : `{product_name} x {username} collab?`,
      body: generateBody(influencer, { ...options, variation: 3 }),
      tone,
    },
  ];

  return variations;
}

function generateBody(
  influencer: Influencer,
  options: AIGenerationOptions & { variation: number }
): string {
  const { tone, messageType, variation, additionalContext } = options;

  if (messageType === "follow_up") {
    return `Hey {first_name}!

Hope you're doing well! I reached out last week about working together and wanted to follow up in case my message got lost in your inbox.

${additionalContext ? `A quick note: ${additionalContext}\n\n` : ""}I'd still love to chat about a potential collaboration with {company_name}. No pressure at all - just let me know if you're interested!

Best,
{your_name}`;
  }

  if (messageType === "negotiation") {
    return `Hi {first_name},

Thanks for your response! I'm excited about the possibility of working together.

${additionalContext ? `Regarding ${additionalContext}:\n\n` : ""}Here's what we're thinking for the collaboration:

{offer_details}

This is definitely open for discussion - we want to make sure this works well for both of us. Let me know your thoughts!

Looking forward to hearing from you,
{your_name}`;
  }

  // Initial outreach variations
  if (tone === "professional") {
    const bodies = [
      `Dear {first_name},

I hope this message finds you well. I'm {your_name} from {company_name}, and I've been following your content with great interest.

Your engagement rate of ${(influencer.engagement_rate * 100).toFixed(1)}% is impressive, and I believe your audience would genuinely benefit from {product_name}.

${additionalContext ? `We're particularly interested because: ${additionalContext}\n\n` : ""}Would you be open to discussing a potential partnership?

Best regards,
{your_name}
{your_title}`,
      `Hello {first_name},

My name is {your_name}, and I lead influencer partnerships at {company_name}. Your ${formatFollowerCount(influencer.follower_count)} followers and authentic content caught our attention.

${additionalContext ? `We think this could be a great fit because: ${additionalContext}\n\n` : ""}I'd love to schedule a brief call to discuss how we might work together on promoting {product_name}.

Looking forward to connecting,
{your_name}`,
      `{first_name},

I'll keep this brief - I'm {your_name} from {company_name}, and we're looking for creators like you to partner with.

${additionalContext ? `Specifically: ${additionalContext}\n\n` : ""}Would you have 15 minutes this week to chat about {product_name}?

Regards,
{your_name}`,
    ];
    return bodies[variation - 1] || bodies[0];
  }

  if (tone === "enthusiastic") {
    const bodies = [
      `Hey {first_name}!

I just HAD to reach out - your content is absolutely amazing! The way you connect with your {follower_count} followers is inspiring.

${additionalContext ? `${additionalContext}\n\n` : ""}I'm {your_name} from {company_name}, and I think you'd LOVE {product_name}. It's right up your alley!

Would you be interested in trying it out? I have some exciting ideas for a collaboration!

Can't wait to hear from you!
{your_name}`,
      `Okay {first_name}, I have to say it - you're killing it!

Seriously, your content has been on fire lately. I'm {your_name} from {company_name} and I've been showing your posts to our whole team!

${additionalContext ? `We especially loved: ${additionalContext}\n\n` : ""}We'd LOVE to work with you on {product_name}. What do you think?!

Let me know!
{your_name}`,
      `{first_name}!!

Your content = chef's kiss. I'm {your_name} from {company_name} and I think we could create something amazing together with {product_name}.

${additionalContext ? `Here's what I'm thinking: ${additionalContext}\n\n` : ""}Are you in?!

{your_name}`,
    ];
    return bodies[variation - 1] || bodies[0];
  }

  if (tone === "casual") {
    const bodies = [
      `Hey {first_name},

Came across your profile and had to say - your content is really cool. I'm {your_name} from {company_name}.

${additionalContext ? `${additionalContext}\n\n` : ""}We've got this thing called {product_name} that I think you might dig. Would love to chat about maybe working together if you're into it.

No pressure either way - just thought I'd reach out.

Later,
{your_name}`,
      `{first_name}!

Yo, love what you're doing. I'm {your_name}, work with {company_name}.

${additionalContext ? `${additionalContext}\n\n` : ""}We should talk about {product_name} - I think your audience would be into it. What do you say?

Catch you later,
{your_name}`,
      `Hey!

So I stumbled on your page and was like "yeah, they're cool." I'm {your_name} from {company_name}.

${additionalContext ? `${additionalContext}\n\n` : ""}If you're ever looking for brand collabs, {product_name} could be a good fit. Let me know if you want to chat!

{your_name}`,
    ];
    return bodies[variation - 1] || bodies[0];
  }

  // Default friendly tone
  const bodies = [
    `Hey {first_name}!

Hope you're having a great day! I'm {your_name} from {company_name}, and I've been a fan of your content for a while now.

${additionalContext ? `${additionalContext}\n\n` : ""}I think there could be a really cool opportunity for us to work together on {product_name}. Your style would be perfect for it!

Would you be open to chatting about it?

Best,
{your_name}`,
    `Hi {first_name}!

I'm {your_name} from {company_name} - just wanted to drop a quick note to say how much I enjoy your content!

${additionalContext ? `${additionalContext}\n\n` : ""}I'd love to explore a potential collaboration around {product_name}. I think it could be really fun!

Let me know if you're interested!

Cheers,
{your_name}`,
    `{first_name}, hi!

This is {your_name} from {company_name}. I've been following your journey and love what you're building with your {follower_count} followers!

${additionalContext ? `${additionalContext}\n\n` : ""}I have an idea involving {product_name} that I think you'll like. Mind if I share more?

Talk soon!
{your_name}`,
  ];
  return bodies[variation - 1] || bodies[0];
}

export function OutreachComposer({
  open,
  onOpenChange,
  influencer,
  campaignId,
  onSendEmail,
  onSendDM,
  onSend,
  onSaveDraft,
  onMarkAsSent,
  initialSubject = "",
  initialBody = "",
  initialChannel,
  templates = [],
}: OutreachComposerProps) {
  const { toast } = useToast();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Determine if influencer has email
  const hasEmail = Boolean(influencer?.contact_email || influencer?.email);
  const contactEmail = influencer?.contact_email || influencer?.email || null;

  // Form state
  const [subject, setSubject] = React.useState(initialSubject);
  const [body, setBody] = React.useState(initialBody);
  const [activeTab, setActiveTab] = React.useState<"compose" | "preview">("compose");
  const [previewView, setPreviewView] = React.useState<"desktop" | "mobile">("desktop");

  // Channel state - default to email if available, otherwise DM
  const [channel, setChannel] = React.useState<OutreachChannel>(
    initialChannel || (hasEmail ? "email" : "dm")
  );

  // AI generation state
  const [tone, setTone] = React.useState<MessageTone>("friendly");
  const [messageType, setMessageType] = React.useState<MessageType>("initial");
  const [additionalContext, setAdditionalContext] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [variations, setVariations] = React.useState<MessageVariation[]>([]);
  const [generationError, setGenerationError] = React.useState<string | null>(null);

  // Action state
  const [isSending, setIsSending] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);

  // Update channel when influencer changes
  React.useEffect(() => {
    if (influencer) {
      const newHasEmail = Boolean(influencer.contact_email || influencer.email);
      setChannel(initialChannel || (newHasEmail ? "email" : "dm"));
    }
  }, [influencer, initialChannel]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      // Cmd/Ctrl + Enter: Send
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }

      // Cmd/Ctrl + Shift + G: Generate
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "g") {
        e.preventDefault();
        handleGenerate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, subject, body]);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setBody(initialBody);
      setVariations([]);
      setGenerationError(null);
    }
  }, [open, initialSubject, initialBody]);

  // Handle variable insertion
  const handleInsertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + variable + body.slice(end);
    setBody(newBody);

    // Restore cursor position after variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  // Handle template selection
  const handleSelectTemplate = (template: OutreachTemplate) => {
    setSelectedTemplateId(template.id);
    setSubject(template.subject);
    setBody(template.body);
    setMessageType(template.category as MessageType);
  };

  // Generate AI message
  const handleGenerate = async () => {
    if (!influencer) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const newVariations = await generateAIMessage(influencer, {
        tone,
        messageType,
        additionalContext,
      });
      setVariations(newVariations);
    } catch (error) {
      console.error("Failed to generate message:", error);
      setGenerationError("Failed to generate message. Please try again.");
      toast({
        title: "Generation failed",
        description: "Unable to generate message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Select a variation
  const handleSelectVariation = (variation: MessageVariation) => {
    setSubject(variation.subject);
    setBody(variation.body);
    setActiveTab("compose");
  };

  // Send message
  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Missing content",
        description: "Please fill in both subject and message body.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      if (channel === "email" && onSendEmail) {
        await onSendEmail({ subject, body, channel: "email" });
        toast({
          title: "Email sent",
          description: `Email sent to ${contactEmail}`,
        });
      } else if (channel === "dm" && onSendDM) {
        await onSendDM({ subject, body, channel: "dm" });
      } else if (onSend) {
        await onSend({ subject, body });
        toast({
          title: "Message sent",
          description: "Your outreach message has been sent successfully.",
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Send failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Copy message to clipboard (for DM channel)
  const handleCopy = async () => {
    const fullMessage = channel === "email"
      ? `Subject: ${subject}\n\n${body}`
      : body; // DMs typically don't have subjects
    try {
      await navigator.clipboard.writeText(fullMessage);
      toast({
        title: "Copied to clipboard",
        description: "Message copied. Now paste it in the DM.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message.",
        variant: "destructive",
      });
    }
  };

  // Mark as sent (for DM channel)
  const handleMarkAsSent = () => {
    onMarkAsSent?.({ subject, body });
    toast({
      title: "Marked as sent",
      description: "Message marked as sent in your outreach history.",
    });
    onOpenChange(false);
  };

  // Save draft
  const handleSaveDraft = () => {
    onSaveDraft?.({ subject, body });
    toast({
      title: "Draft saved",
      description: "Your message has been saved as a draft.",
    });
  };

  // Character count
  const charCount = body.length;
  const MAX_CHARS = 2000;
  const isOverLimit = charCount > MAX_CHARS;

  if (!influencer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Compose Message</DialogTitle>
              <DialogDescription>
                Create and send a personalized outreach message
              </DialogDescription>
            </div>
            {/* Channel Selector */}
            <ChannelSelector
              value={channel}
              onChange={setChannel}
              hasEmail={hasEmail}
              emailAddress={contactEmail}
              disabled={isGenerating || isSending}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Influencer Info + Templates */}
            <div className="space-y-4 lg:col-span-1">
              {/* Influencer Preview */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={influencer.profile_image_url || undefined} />
                    <AvatarFallback>
                      {influencer.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {influencer.username}
                      </span>
                      {influencer.verified && (
                        <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {PLATFORM_ICONS[influencer.platform]}
                      <span>{formatFollowerCount(influencer.follower_count)} followers</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline">
                    {(influencer.engagement_rate * 100).toFixed(1)}% ER
                  </Badge>
                  {influencer.niche?.slice(0, 2).map((n) => (
                    <Badge key={n} variant="secondary" className="text-xs">
                      {n}
                    </Badge>
                  ))}
                </div>

                {/* Email indicator */}
                {hasEmail && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 text-sm text-emerald-400">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{contactEmail}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Contact email available - can send directly
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>

              {/* No email warning for email channel */}
              {channel === "email" && !hasEmail && (
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-400 text-sm">
                    No email address available for this influencer. Switch to DM to send manually.
                  </AlertDescription>
                </Alert>
              )}

              {/* Templates */}
              <MessageTemplates
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onSelect={handleSelectTemplate}
                disabled={isGenerating || isSending}
              />
            </div>

            {/* Right Column: Compose Area */}
            <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
              {/* AI Generation Controls */}
              <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Message Generator
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Tone</Label>
                    <ToneSelector
                      value={tone}
                      onChange={setTone}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Message Type</Label>
                    <Select
                      value={messageType}
                      onValueChange={(v) => setMessageType(v as MessageType)}
                      disabled={isGenerating}
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
                  <Label className="text-xs">Additional Context (optional)</Label>
                  <Textarea
                    placeholder="Add any specific details, offers, or context for the AI..."
                    className="h-16 text-sm"
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground">
                          Cmd/Ctrl + Shift + G
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Keyboard shortcut to generate
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Variations */}
                {variations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Generated Variations</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                    <ScrollArea className="h-32">
                      <div className="space-y-2 pr-4">
                        {variations.map((v, i) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVariation(v)}
                            className="w-full text-left p-2 rounded border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                Variation {i + 1}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {v.tone}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {v.subject}
                            </p>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {generationError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {generationError}
                  </div>
                )}
              </div>

              {/* Message Editor */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "compose" | "preview")}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <TabsList>
                    <TabsTrigger value="compose">
                      <Edit className="h-3 w-3 mr-1" />
                      Compose
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    {activeTab === "preview" && channel === "email" && (
                      <EmailPreviewToggle
                        view={previewView}
                        onChange={setPreviewView}
                      />
                    )}
                    <VariableInserter
                      onInsert={handleInsertVariable}
                      disabled={activeTab === "preview" || isGenerating || isSending}
                    />
                  </div>
                </div>

                <TabsContent
                  value="compose"
                  className="flex-1 flex flex-col space-y-3 mt-0 overflow-hidden"
                >
                  {/* Subject line - shown for both channels but more prominent for email */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subject">
                        {channel === "email" ? "Subject Line" : "Subject (optional for DM)"}
                      </Label>
                      {channel === "email" && (
                        <Badge variant="outline" className="text-[10px] border-blue-500/30 bg-blue-500/10 text-blue-400">
                          Required for email
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="subject"
                      placeholder={channel === "email" ? "Enter email subject line..." : "Optional subject for reference..."}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={isGenerating || isSending}
                      className={cn(
                        channel === "email" && !subject.trim() && "border-amber-500/50"
                      )}
                    />
                  </div>

                  <div className="flex-1 flex flex-col space-y-2 min-h-0">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="body">Message</Label>
                      <span
                        className={cn(
                          "text-xs",
                          isOverLimit ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {charCount}/{MAX_CHARS}
                      </span>
                    </div>
                    <Textarea
                      ref={textareaRef}
                      id="body"
                      placeholder="Write your message here..."
                      className={cn(
                        "flex-1 min-h-[200px] font-mono text-sm resize-none",
                        isOverLimit && "border-destructive focus-visible:ring-destructive"
                      )}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={isGenerating || isSending}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 mt-0 overflow-auto">
                  {channel === "email" ? (
                    <EmailPreview
                      subject={subject}
                      body={body}
                      influencer={influencer}
                      recipientEmail={contactEmail || undefined}
                      view={previewView}
                      variableValues={{
                        company_name: "Your Company",
                        product_name: "Your Product",
                        your_name: "Your Name",
                        your_title: "Your Title",
                        offer_details: "[Offer details will go here]",
                        campaign_name: campaignId ? "Current Campaign" : "New Campaign",
                        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                        follower_count: formatFollowerCount(influencer.follower_count),
                      }}
                    />
                  ) : (
                    <MessagePreview
                      subject={subject}
                      body={body}
                      influencer={influencer}
                      variableValues={{
                        company_name: "Your Company",
                        product_name: "Your Product",
                        your_name: "Your Name",
                        your_title: "Your Title",
                        offer_details: "[Offer details will go here]",
                        campaign_name: campaignId ? "Current Campaign" : "New Campaign",
                        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                      }}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Actions - Different based on channel */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Channel indicator */}
            <ChannelBadge channel={channel} hasEmail={hasEmail} />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!subject && !body}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy message to clipboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onSaveDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={!subject && !body}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            {/* Channel-specific actions */}
            {channel === "email" ? (
              // Email: Direct send button
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSend}
                      disabled={isSending || !subject.trim() || !body.trim() || isOverLimit || !hasEmail}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasEmail
                      ? `Send to ${contactEmail} (Cmd/Ctrl + Enter)`
                      : "No email address available"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              // DM: Copy + Mark as Sent buttons
              <>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!body.trim()}
                  className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Message
                </Button>
                {onMarkAsSent && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleMarkAsSent}
                          disabled={!body.trim()}
                          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark as Sent
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Mark this DM as sent in your outreach history
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
