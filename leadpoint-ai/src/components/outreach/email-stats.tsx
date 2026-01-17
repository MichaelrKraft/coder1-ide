"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Send,
  CheckCircle,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Clock,
} from "lucide-react";

// Extended outreach message type with email-specific tracking
export interface EmailTrackingData {
  id: string;
  status: EmailStatus;
  channel: "email" | "dm";
  subject?: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  opened_count?: number;
  clicked_at?: string | null;
  clicked_count?: number;
  bounced_at?: string | null;
  bounce_reason?: string | null;
}

export type EmailStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "replied"
  | "bounced";

interface EmailStatusConfig {
  label: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  textColor: string;
  description: string;
}

const EMAIL_STATUS_CONFIG: Record<EmailStatus, EmailStatusConfig> = {
  draft: {
    label: "Draft",
    icon: <Mail className="h-3 w-3" />,
    borderColor: "border-zinc-500/30",
    bgColor: "bg-zinc-500/10",
    textColor: "text-zinc-400",
    description: "Message saved as draft",
  },
  scheduled: {
    label: "Scheduled",
    icon: <Clock className="h-3 w-3" />,
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
    description: "Email scheduled to send",
  },
  sent: {
    label: "Sent",
    icon: <Send className="h-3 w-3" />,
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    description: "Email sent successfully",
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle className="h-3 w-3" />,
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
    textColor: "text-green-400",
    description: "Email delivered to inbox",
  },
  opened: {
    label: "Opened",
    icon: <Eye className="h-3 w-3" />,
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    description: "Recipient opened the email",
  },
  clicked: {
    label: "Clicked",
    icon: <MousePointerClick className="h-3 w-3" />,
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
    description: "Recipient clicked a link",
  },
  replied: {
    label: "Replied",
    icon: <Mail className="h-3 w-3" />,
    borderColor: "border-violet-500/30",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-400",
    description: "Recipient replied to email",
  },
  bounced: {
    label: "Bounced",
    icon: <AlertTriangle className="h-3 w-3" />,
    borderColor: "border-red-500/30",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
    description: "Email could not be delivered",
  },
};

interface EmailStatsProps {
  message: EmailTrackingData;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmailStats({
  message,
  showDetails = false,
  size = "md",
  className,
}: EmailStatsProps) {
  const config = EMAIL_STATUS_CONFIG[message.status];

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  // Compact badge view
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                sizeClasses[size],
                config.borderColor,
                config.bgColor,
                config.textColor,
                "gap-1",
                className
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
            {message.bounce_reason && (
              <p className="text-red-400 mt-1">Reason: {message.bounce_reason}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed stats view
  return (
    <div className={cn("space-y-3", className)}>
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            sizeClasses[size],
            config.borderColor,
            config.bgColor,
            config.textColor,
            "gap-1"
          )}
        >
          {config.icon}
          <span>{config.label}</span>
        </Badge>
        <span className="text-xs text-zinc-500">{config.description}</span>
      </div>

      {/* Tracking metrics */}
      {message.channel === "email" && (
        <div className="flex flex-wrap gap-4">
          {/* Opened count */}
          {message.opened_count !== undefined && message.opened_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Eye className={iconSizes[size]} />
                    <span className="text-xs font-medium">
                      {message.opened_count}x opened
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Email opened {message.opened_count} time(s)</p>
                  {message.opened_at && (
                    <p className="text-zinc-400">
                      First opened: {new Date(message.opened_at).toLocaleString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Clicked count */}
          {message.clicked_count !== undefined && message.clicked_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <MousePointerClick className={iconSizes[size]} />
                    <span className="text-xs font-medium">
                      {message.clicked_count}x clicked
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Links clicked {message.clicked_count} time(s)</p>
                  {message.clicked_at && (
                    <p className="text-zinc-400">
                      First click: {new Date(message.clicked_at).toLocaleString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Bounce reason */}
          {message.status === "bounced" && message.bounce_reason && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <AlertTriangle className={iconSizes[size]} />
                    <span className="text-xs font-medium truncate max-w-[200px]">
                      {message.bounce_reason}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-red-400">Bounce reason:</p>
                  <p>{message.bounce_reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* DM indicator (manual tracking) */}
      {message.channel === "dm" && (
        <div className="text-xs text-zinc-500 italic">
          DM tracking is manual - mark as sent when completed
        </div>
      )}
    </div>
  );
}

// Compact inline stats for pipeline cards
export function EmailStatsInline({
  message,
  className,
}: {
  message: EmailTrackingData;
  className?: string;
}) {
  const config = EMAIL_STATUS_CONFIG[message.status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-1.5 py-0 gap-1",
          config.borderColor,
          config.bgColor,
          config.textColor
        )}
      >
        {config.icon}
      </Badge>

      {/* Show opened/clicked indicators */}
      {message.channel === "email" && (
        <>
          {message.opened_count !== undefined && message.opened_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-emerald-400">
                    <Eye className="h-3 w-3" />
                    <span className="text-[10px]">{message.opened_count}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Opened {message.opened_count}x</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {message.clicked_count !== undefined && message.clicked_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-purple-400">
                    <MousePointerClick className="h-3 w-3" />
                    <span className="text-[10px]">{message.clicked_count}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Clicked {message.clicked_count}x</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>
      )}
    </div>
  );
}

// Export status config for reuse
export { EMAIL_STATUS_CONFIG };
export type { EmailStatusConfig };
