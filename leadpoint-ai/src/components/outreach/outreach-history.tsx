"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  Send,
  CheckCircle,
  Eye,
  MessageSquare,
  AlertCircle,
  Download,
  ChevronRight,
  Mail,
  MailOpen,
  Reply,
  XCircle,
  Filter,
} from "lucide-react";
import type { OutreachMessage, OutreachStatus, Influencer } from "@/types";

// Status configuration
interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const STATUS_CONFIG: Record<OutreachStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    icon: <Clock className="h-3 w-3" />,
    color: "text-zinc-500",
    bgColor: "bg-zinc-500/10",
  },
  scheduled: {
    label: "Scheduled",
    icon: <Clock className="h-3 w-3" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  sent: {
    label: "Sent",
    icon: <Send className="h-3 w-3" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle className="h-3 w-3" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
  },
  opened: {
    label: "Opened",
    icon: <MailOpen className="h-3 w-3" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  replied: {
    label: "Replied",
    icon: <Reply className="h-3 w-3" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  bounced: {
    label: "Bounced",
    icon: <XCircle className="h-3 w-3" />,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

interface MessageTimelineItem {
  status: OutreachStatus;
  timestamp: string;
  description: string;
}

function buildTimeline(message: OutreachMessage): MessageTimelineItem[] {
  const timeline: MessageTimelineItem[] = [];

  timeline.push({
    status: "draft",
    timestamp: message.created_at,
    description: "Message created",
  });

  if (message.scheduled_at) {
    timeline.push({
      status: "scheduled",
      timestamp: message.scheduled_at,
      description: "Scheduled for delivery",
    });
  }

  if (message.sent_at) {
    timeline.push({
      status: "sent",
      timestamp: message.sent_at,
      description: "Message sent",
    });
    timeline.push({
      status: "delivered",
      timestamp: message.sent_at,
      description: "Message delivered",
    });
  }

  if (message.opened_at) {
    timeline.push({
      status: "opened",
      timestamp: message.opened_at,
      description: "Recipient opened message",
    });
  }

  if (message.replied_at) {
    timeline.push({
      status: "replied",
      timestamp: message.replied_at,
      description: "Received a reply",
    });
  }

  if (message.status === "bounced") {
    timeline.push({
      status: "bounced",
      timestamp: message.updated_at,
      description: "Message bounced",
    });
  }

  return timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

interface OutreachHistoryProps {
  messages: OutreachMessage[];
  onExport?: (messages: OutreachMessage[]) => void;
  onViewMessage?: (message: OutreachMessage) => void;
  className?: string;
}

export function OutreachHistory({
  messages,
  onExport,
  onViewMessage,
  className,
}: OutreachHistoryProps) {
  const [statusFilter, setStatusFilter] = React.useState<OutreachStatus | "all">("all");
  const [selectedMessage, setSelectedMessage] = React.useState<OutreachMessage | null>(null);

  // Filter messages
  const filteredMessages =
    statusFilter === "all"
      ? messages
      : messages.filter((m) => m.status === statusFilter);

  // Sort by most recent activity
  const sortedMessages = [...filteredMessages].sort((a, b) => {
    const dateA = new Date(a.replied_at || a.opened_at || a.sent_at || a.created_at);
    const dateB = new Date(b.replied_at || b.opened_at || b.sent_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  // Stats
  const stats = {
    total: messages.length,
    sent: messages.filter((m) => ["sent", "delivered", "opened", "replied"].includes(m.status)).length,
    opened: messages.filter((m) => ["opened", "replied"].includes(m.status)).length,
    replied: messages.filter((m) => m.status === "replied").length,
  };

  const openRate = stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : "0";
  const replyRate = stats.sent > 0 ? ((stats.replied / stats.sent) * 100).toFixed(1) : "0";

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Message History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as OutreachStatus | "all")}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>

            {onExport && messages.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExport(filteredMessages)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export conversation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 pt-3">
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold">{stats.sent}</div>
            <div className="text-[10px] text-muted-foreground">Sent</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold">{openRate}%</div>
            <div className="text-[10px] text-muted-foreground">Open Rate</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold">{replyRate}%</div>
            <div className="text-[10px] text-muted-foreground">Reply Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {sortedMessages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No messages found</p>
            {statusFilter !== "all" && (
              <p className="text-xs mt-1">
                Try changing the filter to see more results
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-3">
              {sortedMessages.map((message) => {
                const statusConfig = STATUS_CONFIG[message.status];
                const timeline = buildTimeline(message);
                const lastActivity = timeline[timeline.length - 1];

                return (
                  <Dialog key={message.id}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5",
                                  statusConfig.color,
                                  statusConfig.bgColor
                                )}
                              >
                                {statusConfig.icon}
                                <span className="ml-1">{statusConfig.label}</span>
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {formatRelativeTime(lastActivity.timestamp)}
                              </span>
                            </div>
                            <h4 className="font-medium text-sm mt-1.5 truncate">
                              {message.subject}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {message.body}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </button>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Message Details</DialogTitle>
                        <DialogDescription>
                          View full message and activity timeline
                        </DialogDescription>
                      </DialogHeader>

                      {selectedMessage && (
                        <div className="space-y-6 pt-4">
                          {/* Message Content */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  STATUS_CONFIG[selectedMessage.status].color,
                                  STATUS_CONFIG[selectedMessage.status].bgColor
                                )}
                              >
                                {STATUS_CONFIG[selectedMessage.status].icon}
                                <span className="ml-1">
                                  {STATUS_CONFIG[selectedMessage.status].label}
                                </span>
                              </Badge>
                            </div>
                            <div className="rounded-lg border p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground w-16">
                                  Subject:
                                </span>
                                <span className="font-medium">
                                  {selectedMessage.subject}
                                </span>
                              </div>
                              <div className="border-t pt-3">
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                  {selectedMessage.body}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">Activity Timeline</h4>
                            <div className="relative pl-6 space-y-4">
                              {buildTimeline(selectedMessage).map((item, index) => {
                                const config = STATUS_CONFIG[item.status];
                                return (
                                  <div key={index} className="relative">
                                    {/* Line */}
                                    {index < timeline.length - 1 && (
                                      <div className="absolute left-[-18px] top-5 bottom-[-12px] w-0.5 bg-border" />
                                    )}
                                    {/* Dot */}
                                    <div
                                      className={cn(
                                        "absolute left-[-22px] top-1 w-3 h-3 rounded-full border-2 bg-background",
                                        config.color.replace("text-", "border-")
                                      )}
                                    />
                                    {/* Content */}
                                    <div className="flex items-center justify-between gap-4">
                                      <div>
                                        <p className="text-sm font-medium">
                                          {item.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(item.timestamp).toLocaleString()}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px]",
                                          config.color,
                                          config.bgColor
                                        )}
                                      >
                                        {config.icon}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export { STATUS_CONFIG, formatRelativeTime };
