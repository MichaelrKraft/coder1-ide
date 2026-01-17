"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Smartphone, Monitor, User } from "lucide-react";
import type { Influencer } from "@/types/database";

interface EmailPreviewProps {
  subject: string;
  body: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  senderEmail?: string;
  influencer?: Pick<Influencer, "display_name" | "username" | "avatar_url"> | null;
  variableValues?: Record<string, string>;
  view?: "desktop" | "mobile";
  className?: string;
}

// Replace template variables in text
function replaceVariables(
  text: string,
  influencer?: Pick<Influencer, "display_name" | "username"> | null,
  variableValues?: Record<string, string>
): string {
  let result = text;

  // Standard influencer variables
  if (influencer) {
    const firstName =
      influencer.display_name?.split(" ")[0] ||
      influencer.username?.split(/[_.]/).at(0) ||
      "there";
    result = result.replace(/\{first_name\}/g, firstName);
    result = result.replace(/\{username\}/g, influencer.username || "");
    result = result.replace(/\{display_name\}/g, influencer.display_name || influencer.username || "");
  }

  // Custom variable values
  if (variableValues) {
    for (const [key, value] of Object.entries(variableValues)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, value);
    }
  }

  return result;
}

export function EmailPreview({
  subject,
  body,
  recipientName,
  recipientEmail,
  senderName = "You",
  senderEmail = "you@company.com",
  influencer,
  variableValues,
  view = "desktop",
  className,
}: EmailPreviewProps) {
  const processedSubject = replaceVariables(subject, influencer, variableValues);
  const processedBody = replaceVariables(body, influencer, variableValues);

  const displayName =
    recipientName ||
    influencer?.display_name ||
    influencer?.username ||
    "Recipient";
  const displayEmail =
    recipientEmail || `${influencer?.username || "contact"}@email.com`;

  // Desktop email client view
  if (view === "desktop") {
    return (
      <div
        className={cn(
          "rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden",
          className
        )}
      >
        {/* Email header */}
        <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Monitor className="h-4 w-4 text-zinc-500" />
            <span className="text-xs text-zinc-500">Desktop Preview</span>
          </div>

          {/* From */}
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-zinc-500 w-16">From:</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs">
                  {senderName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white">{senderName}</span>
              <span className="text-zinc-500">&lt;{senderEmail}&gt;</span>
            </div>
          </div>

          {/* To */}
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-zinc-500 w-16">To:</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={influencer?.avatar_url || undefined} />
                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white">{displayName}</span>
              <span className="text-zinc-500">&lt;{displayEmail}&gt;</span>
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-start gap-2 text-sm">
            <span className="text-zinc-500 w-16">Subject:</span>
            <span className="text-white font-medium flex-1">
              {processedSubject || (
                <span className="text-zinc-500 italic">No subject</span>
              )}
            </span>
          </div>
        </div>

        {/* Email body */}
        <ScrollArea className="h-[300px]">
          <div className="p-4">
            <div className="prose prose-sm prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed">
                {processedBody || (
                  <span className="text-zinc-500 italic">No message content</span>
                )}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Mobile device mockup view
  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative w-[280px]">
        {/* Phone frame */}
        <div className="rounded-[2.5rem] border-4 border-zinc-700 bg-zinc-900 p-2 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-zinc-800 rounded-full" />

          {/* Screen */}
          <div className="rounded-[2rem] bg-zinc-950 overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 py-2 bg-zinc-900">
              <span className="text-[10px] text-zinc-400">9:41</span>
              <div className="flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-zinc-500" />
              </div>
            </div>

            {/* Email app header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-zinc-400">New Message</span>
              </div>
            </div>

            {/* Email content */}
            <div className="bg-zinc-950">
              {/* From/To */}
              <div className="px-4 py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs">
                      {senderName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {senderName}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      To: {displayName}
                    </p>
                  </div>
                </div>

                {/* Subject */}
                <p className="text-sm font-semibold text-white line-clamp-2">
                  {processedSubject || (
                    <span className="text-zinc-500 italic">No subject</span>
                  )}
                </p>
              </div>

              {/* Body */}
              <ScrollArea className="h-[280px]">
                <div className="px-4 py-3">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-300 leading-relaxed">
                    {processedBody || (
                      <span className="text-zinc-500 italic">
                        No message content
                      </span>
                    )}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle for switching between views
export function EmailPreviewToggle({
  view,
  onChange,
  className,
}: {
  view: "desktop" | "mobile";
  onChange: (view: "desktop" | "mobile") => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("desktop")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          view === "desktop"
            ? "bg-zinc-700 text-white shadow-sm"
            : "text-zinc-400 hover:text-zinc-200"
        )}
      >
        <Monitor className="h-3.5 w-3.5" />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
          view === "mobile"
            ? "bg-zinc-700 text-white shadow-sm"
            : "text-zinc-400 hover:text-zinc-200"
        )}
      >
        <Smartphone className="h-3.5 w-3.5" />
        Mobile
      </button>
    </div>
  );
}

// Quick preview card for email list
export function EmailPreviewCard({
  subject,
  body,
  status,
  sentAt,
  influencer,
  variableValues,
  className,
}: {
  subject: string;
  body: string;
  status?: string;
  sentAt?: string;
  influencer?: Pick<Influencer, "display_name" | "username" | "avatar_url"> | null;
  variableValues?: Record<string, string>;
  className?: string;
}) {
  const processedSubject = replaceVariables(subject, influencer, variableValues);
  const processedBody = replaceVariables(body, influencer, variableValues);

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={influencer?.avatar_url || undefined} />
          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
            {(influencer?.display_name || influencer?.username || "?").charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">
            {influencer?.display_name || influencer?.username || "Unknown"}
          </p>
        </div>
        {status && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-zinc-700 text-zinc-400"
          >
            {status}
          </Badge>
        )}
      </div>

      {/* Subject */}
      <p className="text-sm font-medium text-zinc-200 truncate mb-1">
        {processedSubject || "No subject"}
      </p>

      {/* Body preview */}
      <p className="text-xs text-zinc-500 line-clamp-2">{processedBody}</p>

      {/* Footer */}
      {sentAt && (
        <p className="text-[10px] text-zinc-600 mt-2">
          {new Date(sentAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
