"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_CONFIG, formatRelativeTime } from "./outreach-history";
import { formatFollowerCount } from "./message-preview";
import {
  MoreHorizontal,
  Send,
  Clock,
  MessageSquare,
  CheckCircle,
  Instagram,
  Youtube,
  ExternalLink,
  Calendar,
  RefreshCw,
} from "lucide-react";
import type { Influencer, OutreachStatus, Platform } from "@/types";

// Platform icons
const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  tiktok: <MessageSquare className="h-4 w-4" />,
  twitter: <MessageSquare className="h-4 w-4" />,
};

// Platform colors
const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "text-pink-500",
  youtube: "text-red-500",
  tiktok: "text-zinc-500",
  twitter: "text-blue-400",
};

interface OutreachCardProps {
  influencer: Influencer;
  lastMessageStatus?: OutreachStatus | null;
  lastContactDate?: string | null;
  messageCount?: number;
  hasReplied?: boolean;
  onCompose: (influencer: Influencer) => void;
  onViewProfile?: (influencer: Influencer) => void;
  onScheduleFollowUp?: (influencer: Influencer) => void;
  className?: string;
}

export function OutreachCard({
  influencer,
  lastMessageStatus,
  lastContactDate,
  messageCount = 0,
  hasReplied = false,
  onCompose,
  onViewProfile,
  onScheduleFollowUp,
  className,
}: OutreachCardProps) {
  // Determine status badge content
  const getStatusBadge = () => {
    if (hasReplied) {
      return (
        <Badge
          variant="outline"
          className="text-purple-500 bg-purple-500/10 border-purple-500/20"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Replied
        </Badge>
      );
    }

    if (lastMessageStatus) {
      const config = STATUS_CONFIG[lastMessageStatus];
      return (
        <Badge
          variant="outline"
          className={cn("text-[10px]", config.color, config.bgColor)}
        >
          {config.icon}
          <span className="ml-1">{config.label}</span>
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-zinc-500 bg-zinc-500/10 border-zinc-500/20"
      >
        <Clock className="h-3 w-3 mr-1" />
        Not Contacted
      </Badge>
    );
  };

  // Determine CTA button
  const getCtaButton = () => {
    if (!lastMessageStatus) {
      return (
        <Button size="sm" onClick={() => onCompose(influencer)}>
          <Send className="h-3 w-3 mr-1" />
          Compose
        </Button>
      );
    }

    if (hasReplied) {
      return (
        <Button size="sm" variant="outline" onClick={() => onCompose(influencer)}>
          <MessageSquare className="h-3 w-3 mr-1" />
          Reply
        </Button>
      );
    }

    if (["sent", "delivered", "opened"].includes(lastMessageStatus)) {
      return (
        <Button size="sm" variant="secondary" onClick={() => onCompose(influencer)}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Follow Up
        </Button>
      );
    }

    return (
      <Button size="sm" onClick={() => onCompose(influencer)}>
        <Send className="h-3 w-3 mr-1" />
        Compose
      </Button>
    );
  };

  return (
    <Card className={cn("group hover:border-primary/30 transition-colors", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 border-2 border-muted">
            <AvatarImage src={influencer.profile_image_url || undefined} />
            <AvatarFallback className="text-sm font-semibold">
              {influencer.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{influencer.username}</span>
              {influencer.verified && (
                <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "flex-shrink-0",
                  PLATFORM_COLORS[influencer.platform]
                )}
              >
                {PLATFORM_ICONS[influencer.platform]}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{formatFollowerCount(influencer.follower_count)} followers</span>
              <span className="text-border">|</span>
              <span>{(influencer.engagement_rate * 100).toFixed(1)}% ER</span>
            </div>

            {/* Niches */}
            {influencer.niche && influencer.niche.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {influencer.niche.slice(0, 3).map((n) => (
                  <Badge key={n} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {n}
                  </Badge>
                ))}
                {influencer.niche.length > 3 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{influencer.niche.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCompose(influencer)}>
                  <Send className="h-4 w-4 mr-2" />
                  Compose Message
                </DropdownMenuItem>
                {onScheduleFollowUp && (
                  <DropdownMenuItem onClick={() => onScheduleFollowUp(influencer)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Follow-up
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onViewProfile && (
                  <DropdownMenuItem onClick={() => onViewProfile(influencer)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {getCtaButton()}
          </div>
        </div>

        {/* Footer - Status and Last Contact */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {messageCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px]">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {messageCount}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {messageCount} message{messageCount !== 1 ? "s" : ""} sent
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {lastContactDate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(lastContactDate)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Last contact: {new Date(lastContactDate).toLocaleDateString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for lists
interface OutreachCardCompactProps extends OutreachCardProps {
  selected?: boolean;
  onSelect?: (influencer: Influencer) => void;
}

export function OutreachCardCompact({
  influencer,
  lastMessageStatus,
  lastContactDate,
  hasReplied,
  onCompose,
  selected,
  onSelect,
  className,
}: OutreachCardCompactProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(influencer)}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={influencer.profile_image_url || undefined} />
          <AvatarFallback className="text-xs">
            {influencer.username?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {influencer.username}
            </span>
            <span className={cn("flex-shrink-0", PLATFORM_COLORS[influencer.platform])}>
              {PLATFORM_ICONS[influencer.platform]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFollowerCount(influencer.follower_count)}</span>
            <span className="text-border">|</span>
            <span>{(influencer.engagement_rate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {hasReplied ? (
            <Badge
              variant="outline"
              className="text-[10px] text-purple-500 bg-purple-500/10"
            >
              Replied
            </Badge>
          ) : lastMessageStatus ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                STATUS_CONFIG[lastMessageStatus].color,
                STATUS_CONFIG[lastMessageStatus].bgColor
              )}
            >
              {STATUS_CONFIG[lastMessageStatus].label}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] text-zinc-500 bg-zinc-500/10"
            >
              New
            </Badge>
          )}
          {lastContactDate && (
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(lastContactDate)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
