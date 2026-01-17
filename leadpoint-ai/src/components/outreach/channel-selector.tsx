"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, MessageCircle, Zap, Hand } from "lucide-react";

export type OutreachChannel = "email" | "dm";

interface ChannelSelectorProps {
  value: OutreachChannel;
  onChange: (channel: OutreachChannel) => void;
  hasEmail: boolean;
  emailAddress?: string | null;
  disabled?: boolean;
  className?: string;
}

export function ChannelSelector({
  value,
  onChange,
  hasEmail,
  emailAddress,
  disabled = false,
  className,
}: ChannelSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Email Channel Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={value === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => hasEmail && onChange("email")}
              disabled={disabled || !hasEmail}
              className={cn(
                "relative flex items-center gap-2 transition-all",
                value === "email"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800",
                !hasEmail && "opacity-50 cursor-not-allowed"
              )}
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
              {hasEmail && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1 py-0 ml-1",
                    value === "email"
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  )}
                >
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  Auto
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {hasEmail ? (
              <div className="space-y-1">
                <p className="font-medium">Email Outreach</p>
                <p className="text-zinc-400 text-xs">
                  Send directly via email with full tracking
                </p>
                {emailAddress && (
                  <p className="text-zinc-500 text-xs truncate">
                    To: {emailAddress}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-amber-400">No email available</p>
                <p className="text-zinc-400 text-xs">
                  This influencer doesn&apos;t have a contact email
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* DM Channel Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={value === "dm" ? "default" : "outline"}
              size="sm"
              onClick={() => onChange("dm")}
              disabled={disabled}
              className={cn(
                "relative flex items-center gap-2 transition-all",
                value === "dm"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 border-0"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              <span>DM</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1 py-0 ml-1",
                  value === "dm"
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                )}
              >
                <Hand className="h-2.5 w-2.5 mr-0.5" />
                Manual
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Direct Message</p>
              <p className="text-zinc-400 text-xs">
                Copy message and send manually via platform DM
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// Compact version for tight spaces
export function ChannelSelectorCompact({
  value,
  onChange,
  hasEmail,
  disabled = false,
  className,
}: Omit<ChannelSelectorProps, "emailAddress">) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5",
        className
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => hasEmail && onChange("email")}
              disabled={disabled || !hasEmail}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                value === "email"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
                (!hasEmail || disabled) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
          </TooltipTrigger>
          {!hasEmail && (
            <TooltipContent>No email address available</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <button
        type="button"
        onClick={() => onChange("dm")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          value === "dm"
            ? "bg-violet-600 text-white shadow-sm"
            : "text-zinc-400 hover:text-zinc-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        DM
      </button>
    </div>
  );
}

// Channel indicator badge for display purposes
export function ChannelBadge({
  channel,
  hasEmail,
  size = "sm",
  className,
}: {
  channel: OutreachChannel;
  hasEmail?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
  };

  if (channel === "email") {
    return (
      <Badge
        variant="outline"
        className={cn(
          sizeClasses[size],
          "border-blue-500/30 bg-blue-500/10 text-blue-400 gap-1",
          className
        )}
      >
        <Mail className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        Email
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        sizeClasses[size],
        "border-violet-500/30 bg-violet-500/10 text-violet-400 gap-1",
        className
      )}
    >
      <MessageCircle className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      DM
    </Badge>
  );
}
