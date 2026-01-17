/**
 * Content Metrics Scraper for LeadPoint.ai
 * Uses Apify to scrape TikTok video metrics
 */

import { runActor } from '@/lib/apify/client'
import { getMockContentMetrics } from './mock'
import type { ContentMetrics, TikTokVideoData, ParsedPostUrl } from '@/types/content'
import type { Platform } from '@/types/database'

// Apify actor IDs for different platforms
const APIFY_ACTORS = {
  tiktok_video: 'clockworks/free-tiktok-scraper',
  tiktok_profile: 'clockworks/tiktok-scraper',
}

/**
 * Parse a post URL to extract platform and identifiers
 */
export function parsePostUrl(url: string): ParsedPostUrl {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // TikTok
    if (hostname.includes('tiktok.com')) {
      const pathMatch = url.match(/@([^/]+)\/video\/(\d+)/)
      if (pathMatch) {
        return {
          platform: 'tiktok',
          username: pathMatch[1],
          postId: pathMatch[2],
          isValid: true,
        }
      }
      // Short URL format
      const shortMatch = url.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/)
      if (shortMatch) {
        return {
          platform: 'tiktok',
          postId: shortMatch[1],
          isValid: true,
        }
      }
      return {
        platform: 'tiktok',
        isValid: false,
        error: 'Invalid TikTok URL format. Expected: https://tiktok.com/@username/video/ID',
      }
    }

    // Instagram
    if (hostname.includes('instagram.com')) {
      const reelMatch = url.match(/\/reel\/([A-Za-z0-9_-]+)/)
      const postMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/)
      const match = reelMatch || postMatch
      if (match) {
        return {
          platform: 'instagram',
          postId: match[1],
          isValid: true,
        }
      }
      return {
        platform: 'instagram',
        isValid: false,
        error: 'Invalid Instagram URL format',
      }
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const shortMatch = url.match(/shorts\/([A-Za-z0-9_-]+)/)
      const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]+)/)
      const shortUrlMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/)
      const match = shortMatch || watchMatch || shortUrlMatch
      if (match) {
        return {
          platform: 'youtube',
          postId: match[1],
          isValid: true,
        }
      }
      return {
        platform: 'youtube',
        isValid: false,
        error: 'Invalid YouTube URL format',
      }
    }

    return {
      platform: 'tiktok', // Default
      isValid: false,
      error: 'Unsupported platform. Supported: TikTok, Instagram, YouTube',
    }
  } catch {
    return {
      platform: 'tiktok',
      isValid: false,
      error: 'Invalid URL format',
    }
  }
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): Platform {
  const parsed = parsePostUrl(url)
  return parsed.platform
}

/**
 * Scrape metrics for a single TikTok video
 */
export async function scrapeTikTokMetrics(url: string): Promise<ContentMetrics | null> {
  // Check if Apify is configured
  if (!process.env.APIFY_API_TOKEN) {
    console.log('[Content Scraper] No Apify token, using mock data')
    return getMockContentMetrics()
  }

  try {
    const results = await runActor<TikTokVideoData>(APIFY_ACTORS.tiktok_video, {
      postURLs: [url],
      resultsPerPage: 1,
    })

    if (!results || results.length === 0) {
      console.log('[Content Scraper] No results from Apify, using mock data')
      return getMockContentMetrics()
    }

    const video = results[0]
    const stats = video.stats

    // Calculate engagement rate
    const totalEngagement = stats.diggCount + stats.commentCount + stats.shareCount
    const engagementRate = stats.playCount > 0 
      ? (totalEngagement / stats.playCount) * 100 
      : 0

    return {
      views: stats.playCount,
      likes: stats.diggCount,
      comments: stats.commentCount,
      shares: stats.shareCount,
      saves: stats.collectCount,
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
      scraped_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Content Scraper] Error scraping TikTok:', error)
    // Return mock data on error
    return getMockContentMetrics()
  }
}

/**
 * Scrape content metrics based on platform
 */
export async function scrapeContentMetrics(url: string): Promise<ContentMetrics | null> {
  const parsed = parsePostUrl(url)
  
  if (!parsed.isValid) {
    console.error('[Content Scraper] Invalid URL:', parsed.error)
    return null
  }

  switch (parsed.platform) {
    case 'tiktok':
      return scrapeTikTokMetrics(url)
    case 'instagram':
      // Instagram scraping would require different Apify actor
      console.log('[Content Scraper] Instagram scraping not yet implemented, using mock')
      return getMockContentMetrics()
    case 'youtube':
      // YouTube scraping would require different Apify actor
      console.log('[Content Scraper] YouTube scraping not yet implemented, using mock')
      return getMockContentMetrics()
    default:
      return getMockContentMetrics()
  }
}

/**
 * Batch scrape metrics for multiple posts
 */
export async function batchScrapeMetrics(
  urls: string[]
): Promise<Map<string, ContentMetrics>> {
  const results = new Map<string, ContentMetrics>()

  // Check if Apify is configured
  if (!process.env.APIFY_API_TOKEN) {
    console.log('[Content Scraper] No Apify token, using mock data for batch')
    urls.forEach(url => {
      results.set(url, getMockContentMetrics())
    })
    return results
  }

  // Group URLs by platform
  const tiktokUrls: string[] = []
  const otherUrls: string[] = []

  urls.forEach(url => {
    const parsed = parsePostUrl(url)
    if (parsed.platform === 'tiktok' && parsed.isValid) {
      tiktokUrls.push(url)
    } else {
      otherUrls.push(url)
    }
  })

  // Batch scrape TikTok videos
  if (tiktokUrls.length > 0) {
    try {
      const tiktokResults = await runActor<TikTokVideoData>(APIFY_ACTORS.tiktok_video, {
        postURLs: tiktokUrls,
        resultsPerPage: tiktokUrls.length,
      })

      tiktokResults.forEach((video) => {
        const url = `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
        const stats = video.stats
        const totalEngagement = stats.diggCount + stats.commentCount + stats.shareCount
        const engagementRate = stats.playCount > 0 
          ? (totalEngagement / stats.playCount) * 100 
          : 0

        results.set(url, {
          views: stats.playCount,
          likes: stats.diggCount,
          comments: stats.commentCount,
          shares: stats.shareCount,
          saves: stats.collectCount,
          engagement_rate: parseFloat(engagementRate.toFixed(2)),
          scraped_at: new Date().toISOString(),
        })
      })
    } catch (error) {
      console.error('[Content Scraper] Error batch scraping TikTok:', error)
      // Use mock data for failed URLs
      tiktokUrls.forEach(url => {
        if (!results.has(url)) {
          results.set(url, getMockContentMetrics())
        }
      })
    }
  }

  // Use mock data for non-TikTok URLs
  otherUrls.forEach(url => {
    results.set(url, getMockContentMetrics())
  })

  // Fill in any missing URLs with mock data
  urls.forEach(url => {
    if (!results.has(url)) {
      results.set(url, getMockContentMetrics())
    }
  })

  return results
}

/**
 * Get thumbnail URL from a video URL (if available)
 */
export async function getVideoThumbnail(url: string): Promise<string | null> {
  // For now, return null - thumbnail fetching requires additional API calls
  // In production, this would scrape or use oEmbed to get thumbnails
  return null
}

/**
 * Extract hashtags from a video
 */
export async function extractHashtags(url: string): Promise<string[]> {
  // Would be populated during scraping
  // For now, return empty array
  return []
}
