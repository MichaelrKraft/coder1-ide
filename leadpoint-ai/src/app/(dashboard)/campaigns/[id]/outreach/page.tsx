"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OutreachComposer,
  type MessageType,
} from "@/components/outreach/outreach-composer";
import { OutreachCard, OutreachCardCompact } from "@/components/outreach/outreach-card";
import { OutreachHistory } from "@/components/outreach/outreach-history";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Send,
  Clock,
  CheckCircle,
  Mail,
  MailOpen,
  Reply,
  Users,
  Filter,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  Download,
  Inbox,
} from "lucide-react";
import type { Influencer, OutreachMessage, OutreachStatus, Platform } from "@/types";

// Mock data for demonstration
const MOCK_INFLUENCERS: Influencer[] = [
  {
    id: "1",
    user_id: "user-1",
    platform: "instagram" as Platform,
    username: "lifestyle_emma",
    profile_url: "https://instagram.com/lifestyle_emma",
    follower_count: 125000,
    engagement_rate: 0.045,
    avg_views: 45000,
    niche: ["lifestyle", "fashion", "travel"],
    location: "Los Angeles, CA",
    email: "emma@lifestyle.com",
    bio: "Lifestyle blogger sharing daily inspiration",
    profile_image_url: null,
    verified: true,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user-1",
    platform: "tiktok" as Platform,
    username: "tech_reviews_mike",
    profile_url: "https://tiktok.com/@tech_reviews_mike",
    follower_count: 890000,
    engagement_rate: 0.078,
    avg_views: 150000,
    niche: ["tech", "reviews", "gadgets"],
    location: "San Francisco, CA",
    email: "mike@techreviews.com",
    bio: "Tech enthusiast reviewing the latest gadgets",
    profile_image_url: null,
    verified: false,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user-1",
    platform: "youtube" as Platform,
    username: "fitness_with_sarah",
    profile_url: "https://youtube.com/fitness_with_sarah",
    follower_count: 2100000,
    engagement_rate: 0.032,
    avg_views: 500000,
    niche: ["fitness", "health", "wellness"],
    location: "Miami, FL",
    email: "sarah@fitnesswithsarah.com",
    bio: "Certified trainer helping you achieve your fitness goals",
    profile_image_url: null,
    verified: true,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "user-1",
    platform: "instagram" as Platform,
    username: "foodie_adventures",
    profile_url: "https://instagram.com/foodie_adventures",
    follower_count: 78000,
    engagement_rate: 0.062,
    avg_views: 25000,
    niche: ["food", "travel", "restaurants"],
    location: "New York, NY",
    email: null,
    bio: "Exploring the best food spots around the world",
    profile_image_url: null,
    verified: false,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    user_id: "user-1",
    platform: "twitter" as Platform,
    username: "startup_insights",
    profile_url: "https://twitter.com/startup_insights",
    follower_count: 45000,
    engagement_rate: 0.089,
    avg_views: null,
    niche: ["startups", "entrepreneurship", "tech"],
    location: "Austin, TX",
    email: "contact@startupinsights.com",
    bio: "Sharing insights from the startup world",
    profile_image_url: null,
    verified: true,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock outreach data
const MOCK_OUTREACH_DATA: Record<
  string,
  {
    status: OutreachStatus | null;
    lastContact: string | null;
    messageCount: number;
    hasReplied: boolean;
  }
> = {
  "1": {
    status: "opened",
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 2,
    hasReplied: false,
  },
  "2": {
    status: "replied",
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 3,
    hasReplied: true,
  },
  "3": {
    status: "sent",
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 1,
    hasReplied: false,
  },
  "4": {
    status: null,
    lastContact: null,
    messageCount: 0,
    hasReplied: false,
  },
  "5": {
    status: "delivered",
    lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 1,
    hasReplied: false,
  },
};

// Mock messages for history
const MOCK_MESSAGES: OutreachMessage[] = [
  {
    id: "msg-1",
    user_id: "user-1",
    influencer_id: "1",
    influencer: MOCK_INFLUENCERS[0],
    subject: "Collaboration opportunity with our brand",
    body: "Hey Emma! Love your content and would love to explore a partnership...",
    status: "opened",
    scheduled_at: null,
    sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    opened_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    replied_at: null,
    template_id: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-2",
    user_id: "user-1",
    influencer_id: "2",
    influencer: MOCK_INFLUENCERS[1],
    subject: "Re: Tech review partnership",
    body: "Hi Mike, thanks for getting back to me! Here are the details...",
    status: "replied",
    scheduled_at: null,
    sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    opened_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    replied_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    template_id: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

type StatusFilter = "all" | "pending" | "contacted" | "replied";
type SortOption = "recent" | "followers" | "engagement";

export default function CampaignOutreachPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("recent");
  const [selectedInfluencer, setSelectedInfluencer] = React.useState<Influencer | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("queue");

  // Filter and sort influencers
  const filteredInfluencers = React.useMemo(() => {
    let result = [...MOCK_INFLUENCERS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (inf) =>
          inf.username.toLowerCase().includes(query) ||
          inf.niche?.some((n) => n.toLowerCase().includes(query)) ||
          inf.platform.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((inf) => {
        const data = MOCK_OUTREACH_DATA[inf.id];
        if (statusFilter === "pending") return !data?.status;
        if (statusFilter === "contacted") return data?.status && !data?.hasReplied;
        if (statusFilter === "replied") return data?.hasReplied;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      const dataA = MOCK_OUTREACH_DATA[a.id];
      const dataB = MOCK_OUTREACH_DATA[b.id];

      if (sortBy === "recent") {
        const dateA = dataA?.lastContact ? new Date(dataA.lastContact).getTime() : 0;
        const dateB = dataB?.lastContact ? new Date(dataB.lastContact).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "followers") {
        return b.follower_count - a.follower_count;
      }
      if (sortBy === "engagement") {
        return b.engagement_rate - a.engagement_rate;
      }
      return 0;
    });

    return result;
  }, [searchQuery, statusFilter, sortBy]);

  // Stats
  const stats = React.useMemo(() => {
    const total = MOCK_INFLUENCERS.length;
    const pending = MOCK_INFLUENCERS.filter((i) => !MOCK_OUTREACH_DATA[i.id]?.status).length;
    const contacted = MOCK_INFLUENCERS.filter(
      (i) => MOCK_OUTREACH_DATA[i.id]?.status && !MOCK_OUTREACH_DATA[i.id]?.hasReplied
    ).length;
    const replied = MOCK_INFLUENCERS.filter((i) => MOCK_OUTREACH_DATA[i.id]?.hasReplied).length;

    return { total, pending, contacted, replied };
  }, []);

  // Handlers
  const handleCompose = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setComposerOpen(true);
  };

  const handleSendMessage = async (message: { subject: string; body: string }) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Sending message:", message, "to:", selectedInfluencer?.username);
  };

  const handleSaveDraft = (message: { subject: string; body: string }) => {
    console.log("Saving draft:", message);
  };

  const handleBulkCompose = () => {
    toast({
      title: "Bulk compose",
      description: `Starting bulk compose for ${stats.pending} pending influencers`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Exporting data",
      description: "Your outreach data is being exported...",
    });
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Refreshed",
      description: "Outreach data has been refreshed",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Outreach Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage influencer outreach for this campaign
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleBulkCompose} disabled={stats.pending === 0}>
            <Send className="h-4 w-4 mr-2" />
            Bulk Compose ({stats.pending})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contacted</p>
                <p className="text-2xl font-bold">{stats.contacted}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Replied</p>
                <p className="text-2xl font-bold">{stats.replied}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Reply className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="queue" className="gap-2">
              <Inbox className="h-4 w-4" />
              Outreach Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Mail className="h-4 w-4" />
              Message History
            </TabsTrigger>
          </TabsList>

          {activeTab === "queue" && (
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search influencers..."
                  className="pl-9 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="followers">Followers</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="queue" className="flex-1 mt-0">
          {filteredInfluencers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No influencers found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add influencers to this campaign to start outreach"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid gap-4 pr-4">
                {filteredInfluencers.map((influencer) => {
                  const data = MOCK_OUTREACH_DATA[influencer.id];
                  return (
                    <OutreachCard
                      key={influencer.id}
                      influencer={influencer}
                      lastMessageStatus={data?.status}
                      lastContactDate={data?.lastContact}
                      messageCount={data?.messageCount || 0}
                      hasReplied={data?.hasReplied || false}
                      onCompose={handleCompose}
                      onViewProfile={(inf) => window.open(inf.profile_url, "_blank")}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0">
          <OutreachHistory
            messages={MOCK_MESSAGES}
            onExport={(messages) => {
              console.log("Exporting messages:", messages);
              toast({
                title: "Export started",
                description: `Exporting ${messages.length} messages...`,
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Composer Dialog */}
      <OutreachComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        influencer={selectedInfluencer}
        campaignId={campaignId}
        onSend={handleSendMessage}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
