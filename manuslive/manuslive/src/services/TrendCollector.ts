import { EventEmitter } from 'events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

/**
 * Individual trend item from any source
 */
export interface TrendItem {
  id: string;
  title: string;
  url: string;
  score: number;
  source: 'hackernews' | 'github' | 'reddit';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Collection of trends from all sources
 */
export interface TrendData {
  collectedAt: number;
  sources: {
    hackernews: TrendItem[];
    github: TrendItem[];
    reddit: TrendItem[];
  };
  keywordMatches: Array<{
    keyword: string;
    source: string;
    item: TrendItem;
  }>;
  competitorMentions: Array<{
    competitor: string;
    source: string;
    item: TrendItem;
  }>;
}

/**
 * Configuration for trend collection
 */
export interface TrendConfig {
  keywords: string[];
  competitors: string[];
  sources: {
    hackernews: boolean;
    github: boolean;
    reddit: string[] | boolean; // array of subreddit names or boolean
  };
  collectIntervalMinutes: number;
  alertThreshold: 'critical' | 'important' | 'fyi';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TrendConfig = {
  keywords: ['claude', 'anthropic', 'ai agents', 'mcp', 'claude code'],
  competitors: ['cursor', 'windsurf', 'cline', 'aider', 'copilot'],
  sources: {
    hackernews: true,
    github: true,
    reddit: ['LocalLLaMA', 'MachineLearning', 'ClaudeAI'],
  },
  collectIntervalMinutes: 60,
  alertThreshold: 'important',
};

/**
 * TrendCollector - Fetches trends from multiple sources hourly
 *
 * Emits:
 * - 'trend-data': When new trend data is collected
 * - 'trend-alert': When a significant trend is detected
 * - 'error': When collection fails
 */
export class TrendCollector extends EventEmitter {
  private config: TrendConfig;
  private configPath: string;
  private trendsDir: string;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private latestTrends: TrendData | null = null;
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  // Rate limit tracking
  private lastGitHubCall = 0;
  private lastRedditCall = 0;
  private readonly GITHUB_RATE_LIMIT_MS = 2000; // 2 seconds between calls
  private readonly REDDIT_RATE_LIMIT_MS = 1000; // 1 second between calls
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  constructor(configPath?: string) {
    super();
    const manusliveDir = join(homedir(), '.manuslive');
    this.configPath = configPath || join(manusliveDir, 'trends.json');
    this.trendsDir = join(manusliveDir, 'trends');
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file, creating default if not exists
   */
  private loadConfig(): TrendConfig {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(content) as Partial<TrendConfig>;
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load trends config, using defaults:', error);
    }

    // Create default config
    this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  /**
   * Save configuration to file
   */
  private saveConfig(config: TrendConfig): void {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save trends config:', error);
    }
  }

  /**
   * Start hourly trend collection
   */
  start(): void {
    if (this.running) {
      console.log('TrendCollector already running');
      return;
    }

    this.running = true;
    const intervalMs = this.config.collectIntervalMinutes * 60 * 1000;

    // Initial collection
    this.collectNow().catch(error => {
      console.error('Initial trend collection failed:', error);
    });

    // Schedule recurring collection
    this.timer = setInterval(() => {
      this.collectNow().catch(error => {
        console.error('Scheduled trend collection failed:', error);
        this.emit('error', error);
      });
    }, intervalMs);

    console.log(`TrendCollector started (interval: ${this.config.collectIntervalMinutes} minutes)`);
  }

  /**
   * Stop trend collection
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    console.log('TrendCollector stopped');
  }

  /**
   * Collect trends immediately
   */
  async collectNow(): Promise<TrendData> {
    console.log('Collecting trends...');
    const startTime = Date.now();

    const trendData: TrendData = {
      collectedAt: startTime,
      sources: {
        hackernews: [],
        github: [],
        reddit: [],
      },
      keywordMatches: [],
      competitorMentions: [],
    };

    // Collect from each source in parallel
    const promises: Promise<void>[] = [];

    if (this.config.sources.hackernews) {
      promises.push(
        this.collectHackerNews()
          .then(items => {
            trendData.sources.hackernews = items;
          })
          .catch(error => {
            console.error('HackerNews collection failed:', error);
          })
      );
    }

    if (this.config.sources.github) {
      promises.push(
        this.collectGitHub()
          .then(items => {
            trendData.sources.github = items;
          })
          .catch(error => {
            console.error('GitHub collection failed:', error);
          })
      );
    }

    const redditSubreddits = this.config.sources.reddit;
    if (redditSubreddits && Array.isArray(redditSubreddits)) {
      const subreddits = redditSubreddits;
      for (const subreddit of subreddits) {
        promises.push(
          this.collectReddit(subreddit)
            .then(items => {
              trendData.sources.reddit.push(...items);
            })
            .catch(error => {
              console.error(`Reddit r/${subreddit} collection failed:`, error);
            })
        );
      }
    }

    await Promise.all(promises);

    // Process keyword and competitor matches
    this.processMatches(trendData);

    // Save to file
    this.saveTrendData(trendData);

    // Update latest and emit event
    this.latestTrends = trendData;
    this.emit('trend-data', trendData);

    const duration = Date.now() - startTime;
    console.log(`Trend collection completed in ${duration}ms`);
    console.log(`  HackerNews: ${trendData.sources.hackernews.length} items`);
    console.log(`  GitHub: ${trendData.sources.github.length} items`);
    console.log(`  Reddit: ${trendData.sources.reddit.length} items`);
    console.log(`  Keyword matches: ${trendData.keywordMatches.length}`);
    console.log(`  Competitor mentions: ${trendData.competitorMentions.length}`);

    return trendData;
  }

  /**
   * Get the most recently collected trends
   */
  getLatestTrends(): TrendData | null {
    return this.latestTrends;
  }

  /**
   * Get historical trend data for a date range
   */
  getHistoricalData(daysBack = 7): TrendData[] {
    const results: TrendData[] = [];
    const now = Date.now();

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const filename = this.getFilenameForDate(date);
      const filepath = join(this.trendsDir, filename);

      try {
        if (existsSync(filepath)) {
          const content = readFileSync(filepath, 'utf-8');
          const data = JSON.parse(content) as TrendData | TrendData[];
          // Handle both single collection and array of collections
          if (Array.isArray(data)) {
            results.push(...data);
          } else {
            results.push(data);
          }
        }
      } catch (error) {
        console.warn(`Failed to read trends for ${filename}:`, error);
      }
    }

    return results;
  }

  // ============ SOURCE COLLECTORS ============

  /**
   * Collect top stories from HackerNews
   */
  private async collectHackerNews(): Promise<TrendItem[]> {
    const cacheKey = 'hackernews-top';
    const cached = this.getFromCache<number[]>(cacheKey);

    let topIds: number[];
    if (cached) {
      topIds = cached;
    } else {
      const response = await this.fetchWithTimeout(
        'https://hacker-news.firebaseio.com/v0/topstories.json'
      );
      topIds = (await response.json()) as number[];
      this.setCache(cacheKey, topIds);
    }

    // Get top 30 stories
    const top30 = topIds.slice(0, 30);
    const items: TrendItem[] = [];

    // Fetch story details in parallel (batch of 10 to avoid rate limits)
    for (let i = 0; i < top30.length; i += 10) {
      const batch = top30.slice(i, i + 10);
      const batchPromises = batch.map(async id => {
        try {
          const itemCacheKey = `hn-item-${id}`;
          let item = this.getFromCache<HNItem>(itemCacheKey);

          if (!item) {
            const itemResponse = await this.fetchWithTimeout(
              `https://hacker-news.firebaseio.com/v0/item/${id}.json`
            );
            item = (await itemResponse.json()) as HNItem;
            this.setCache(itemCacheKey, item);
          }

          if (item && item.title) {
            const trendItem: TrendItem = {
              id: `hn-${item.id}`,
              title: item.title,
              url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
              score: item.score || 0,
              source: 'hackernews',
              timestamp: (item.time || 0) * 1000,
              metadata: {
                comments: item.descendants || 0,
                by: item.by,
              },
            };
            return trendItem;
          }
          return null;
        } catch {
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      items.push(...batchResults.filter((item): item is TrendItem => item !== null));
    }

    return items;
  }

  /**
   * Collect trending repositories from GitHub
   */
  private async collectGitHub(): Promise<TrendItem[]> {
    await this.waitForGitHubRateLimit();

    const items: TrendItem[] = [];

    // Search for each keyword
    for (const keyword of this.config.keywords.slice(0, 3)) {
      // Limit to 3 keywords to avoid rate limits
      await this.waitForGitHubRateLimit();

      const cacheKey = `github-search-${keyword}`;
      let data = this.getFromCache<GitHubSearchResponse>(cacheKey);

      if (!data) {
        try {
          const query = encodeURIComponent(keyword);
          const response = await this.fetchWithTimeout(
            `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=10`,
            {
              headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'ManusLive-TrendCollector/1.0',
              },
            }
          );

          if (response.status === 403) {
            console.warn('GitHub API rate limited');
            break;
          }

          data = (await response.json()) as GitHubSearchResponse;
          this.setCache(cacheKey, data);
        } catch (error) {
          console.warn(`GitHub search for "${keyword}" failed:`, error);
          continue;
        }
      }

      if (data && data.items) {
        for (const repo of data.items) {
          // Dedupe by id
          if (!items.find(i => i.id === `gh-${repo.id}`)) {
            items.push({
              id: `gh-${repo.id}`,
              title: `${repo.full_name}: ${repo.description || 'No description'}`,
              url: repo.html_url,
              score: repo.stargazers_count,
              source: 'github',
              timestamp: new Date(repo.updated_at).getTime(),
              metadata: {
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language,
                topics: repo.topics,
              },
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Collect hot posts from a subreddit
   */
  private async collectReddit(subreddit: string): Promise<TrendItem[]> {
    await this.waitForRedditRateLimit();

    const cacheKey = `reddit-${subreddit}`;
    let data = this.getFromCache<RedditResponse>(cacheKey);

    if (!data) {
      try {
        const response = await this.fetchWithTimeout(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`,
          {
            headers: {
              'User-Agent': 'ManusLive-TrendCollector/1.0',
            },
          }
        );

        if (response.status === 429) {
          console.warn(`Reddit r/${subreddit} rate limited`);
          return [];
        }

        data = (await response.json()) as RedditResponse;
        this.setCache(cacheKey, data);
      } catch (error) {
        console.warn(`Reddit r/${subreddit} fetch failed:`, error);
        return [];
      }
    }

    const items: TrendItem[] = [];

    if (data && data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        if (post && post.title) {
          items.push({
            id: `reddit-${post.id}`,
            title: post.title,
            url: `https://reddit.com${post.permalink}`,
            score: post.score || 0,
            source: 'reddit',
            timestamp: (post.created_utc || 0) * 1000,
            metadata: {
              subreddit: post.subreddit,
              comments: post.num_comments,
              author: post.author,
              upvoteRatio: post.upvote_ratio,
            },
          });
        }
      }
    }

    return items;
  }

  // ============ MATCHING ============

  /**
   * Process all items for keyword and competitor matches
   */
  private processMatches(data: TrendData): void {
    const allItems = [
      ...data.sources.hackernews,
      ...data.sources.github,
      ...data.sources.reddit,
    ];

    for (const item of allItems) {
      const titleLower = item.title.toLowerCase();

      // Check keywords
      for (const keyword of this.config.keywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          data.keywordMatches.push({
            keyword,
            source: item.source,
            item,
          });
        }
      }

      // Check competitors
      for (const competitor of this.config.competitors) {
        if (titleLower.includes(competitor.toLowerCase())) {
          data.competitorMentions.push({
            competitor,
            source: item.source,
            item,
          });
        }
      }
    }
  }

  // ============ PERSISTENCE ============

  /**
   * Save trend data to daily file
   */
  private saveTrendData(data: TrendData): void {
    try {
      if (!existsSync(this.trendsDir)) {
        mkdirSync(this.trendsDir, { recursive: true });
      }

      const filename = this.getFilenameForDate(new Date());
      const filepath = join(this.trendsDir, filename);

      // Load existing data for today if exists
      let dayData: TrendData[] = [];
      if (existsSync(filepath)) {
        try {
          const content = readFileSync(filepath, 'utf-8');
          const parsed = JSON.parse(content);
          dayData = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Start fresh if parse fails
        }
      }

      // Add new collection
      dayData.push(data);

      writeFileSync(filepath, JSON.stringify(dayData, null, 2));
    } catch (error) {
      console.error('Failed to save trend data:', error);
    }
  }

  /**
   * Get filename for a given date
   */
  private getFilenameForDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}.json`;
  }

  // ============ RATE LIMITING & CACHING ============

  /**
   * Wait for GitHub rate limit
   */
  private async waitForGitHubRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastGitHubCall;
    if (elapsed < this.GITHUB_RATE_LIMIT_MS) {
      await this.sleep(this.GITHUB_RATE_LIMIT_MS - elapsed);
    }
    this.lastGitHubCall = Date.now();
  }

  /**
   * Wait for Reddit rate limit
   */
  private async waitForRedditRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRedditCall;
    if (elapsed < this.REDDIT_RATE_LIMIT_MS) {
      await this.sleep(this.REDDIT_RATE_LIMIT_MS - elapsed);
    }
    this.lastRedditCall = Date.now();
  }

  /**
   * Get item from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set item in cache
   */
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  // ============ HELPERS ============

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options?: RequestInit,
    timeoutMs = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep for a duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============ TYPE DEFINITIONS FOR API RESPONSES ============

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  time?: number;
  descendants?: number;
  by?: string;
}

interface GitHubSearchResponse {
  items?: Array<{
    id: number;
    full_name: string;
    description?: string;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    language?: string;
    topics?: string[];
  }>;
}

interface RedditResponse {
  data?: {
    children?: Array<{
      data: {
        id: string;
        title?: string;
        permalink?: string;
        score?: number;
        created_utc?: number;
        subreddit?: string;
        num_comments?: number;
        author?: string;
        upvote_ratio?: number;
      };
    }>;
  };
}
