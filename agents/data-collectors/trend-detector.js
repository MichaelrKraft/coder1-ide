const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class TrendDetector {
  constructor(githubToken) {
    this.octokit = new Octokit({ auth: githubToken });
    this.dataDir = path.join(__dirname, '../data');
  }

  async detectTrendingTopics(languages = ['javascript', 'typescript'], days = 7) {
    console.log(`🔍 Detecting trending topics for: ${languages.join(', ')}`);
    
    const trends = await Promise.all(
      languages.map(lang => this.getTrendingRepos(lang, days))
    );

    const allTrends = trends.flat();
    const analysis = this.analyzeTrends(allTrends);

    return {
      detected_at: new Date().toISOString(),
      time_period_days: days,
      languages,
      total_repos_analyzed: allTrends.length,
      trending_topics: analysis.topics,
      trending_technologies: analysis.technologies,
      content_opportunities: analysis.opportunities,
      raw_data: allTrends
    };
  }

  async getTrendingRepos(language, days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    try {
      const { data } = await this.octokit.search.repos({
        q: `language:${language} created:>${sinceStr} stars:>10`,
        sort: 'stars',
        order: 'desc',
        per_page: 30
      });

      return data.items.map(repo => ({
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics || [],
        url: repo.html_url,
        created_at: repo.created_at
      }));
    } catch (error) {
      console.error(`Error fetching trending repos for ${language}:`, error.message);
      return [];
    }
  }

  analyzeTrends(repos) {
    const topicCounts = {};
    const techCounts = {};
    const keywords = {};

    repos.forEach(repo => {
      repo.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });

      if (repo.description) {
        this.extractKeywords(repo.description).forEach(keyword => {
          keywords[keyword] = (keywords[keyword] || 0) + 1;
        });
      }

      const tech = this.identifyTechnologies(repo);
      tech.forEach(t => {
        techCounts[t] = (techCounts[t] || 0) + 1;
      });
    });

    return {
      topics: this.sortAndFormat(topicCounts, 15),
      technologies: this.sortAndFormat(techCounts, 10),
      keywords: this.sortAndFormat(keywords, 20),
      opportunities: this.identifyContentOpportunities(topicCounts, techCounts, keywords)
    };
  }

  extractKeywords(text) {
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/);

    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'to', 'of', 'in',
      'on', 'at', 'by', 'is', 'it', 'that', 'this', 'from', 'as', 'are'
    ]);

    return cleanText.filter(word => 
      word.length >= 4 && 
      !stopwords.has(word) &&
      !/^\d+$/.test(word)
    );
  }

  identifyTechnologies(repo) {
    const text = `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')}`.toLowerCase();
    const technologies = [];

    const techPatterns = {
      'React': /\breact\b/,
      'Next.js': /\bnext\.?js\b/,
      'Vue': /\bvue\b/,
      'Angular': /\bangular\b/,
      'TypeScript': /\btypescript\b/,
      'Node.js': /\bnode\.?js\b/,
      'Express': /\bexpress\b/,
      'FastAPI': /\bfastapi\b/,
      'Django': /\bdjango\b/,
      'Flask': /\bflask\b/,
      'MongoDB': /\bmongodb\b/,
      'PostgreSQL': /\bpostgresql\b|\bpostgres\b/,
      'Redis': /\bredis\b/,
      'Docker': /\bdocker\b/,
      'Kubernetes': /\bkubernetes\b|\bk8s\b/,
      'AWS': /\baws\b/,
      'Azure': /\bazure\b/,
      'GCP': /\bgcp\b|\bgoogle cloud\b/,
      'GraphQL': /\bgraphql\b/,
      'REST API': /\brest\b|\bapi\b/,
      'WebSocket': /\bwebsocket\b/,
      'AI': /\bai\b|\bmachine learning\b|\bml\b/,
      'LLM': /\bllm\b|\blarge language model\b/,
      'Claude': /\bclaude\b/,
      'OpenAI': /\bopenai\b|\bgpt\b/,
      'Tailwind': /\btailwind\b/,
      'Bootstrap': /\bbootstrap\b/,
      'Sass': /\bsass\b|\bscss\b/
    };

    for (const [name, pattern] of Object.entries(techPatterns)) {
      if (pattern.test(text)) {
        technologies.push(name);
      }
    }

    return technologies;
  }

  sortAndFormat(counts, limit) {
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count, popularity_score: count }));
  }

  identifyContentOpportunities(topics, tech, keywords) {
    const opportunities = [];

    const topTopics = Object.entries(topics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topTech = Object.entries(tech)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    topTopics.forEach(([topic, count]) => {
      if (count >= 3) {
        opportunities.push({
          type: 'blog_post',
          title: `Building with ${this.capitalize(topic)}: A Complete Guide`,
          confidence: Math.min(count * 10, 100),
          trending_score: count,
          suggested_angle: `Tutorial on ${topic} integration with Coder1`
        });
      }
    });

    topTech.forEach(([technology, count]) => {
      if (count >= 3) {
        opportunities.push({
          type: 'youtube_tutorial',
          title: `${technology} Development with Coder1 in 10 Minutes`,
          confidence: Math.min(count * 15, 100),
          trending_score: count,
          suggested_angle: `Quick start guide for ${technology} developers`
        });
      }
    });

    for (let i = 0; i < topTopics.length && i < 2; i++) {
      for (let j = 0; j < topTech.length && j < 2; j++) {
        opportunities.push({
          type: 'case_study',
          title: `Building ${this.capitalize(topTopics[i][0])} Apps with ${topTech[j][0]}`,
          confidence: Math.min((topTopics[i][1] + topTech[j][1]) * 5, 100),
          trending_score: topTopics[i][1] + topTech[j][1],
          suggested_angle: `Real-world example combining popular technologies`
        });
      }
    }

    return opportunities.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  capitalize(str) {
    return str.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  async detectIDECompetitorActivity() {
    console.log('🔍 Analyzing IDE competitor activity...');

    const competitors = [
      'cursor-ai',
      'windsurf',
      'github/copilot',
      'replit',
      'stackblitz'
    ];

    const activity = await Promise.all(
      competitors.map(async (comp) => {
        try {
          const [owner, repo] = comp.includes('/') ? comp.split('/') : [comp, comp];
          const { data } = await this.octokit.search.repos({
            q: `${comp} in:name,description`,
            sort: 'updated',
            per_page: 5
          });

          return {
            competitor: comp,
            recent_repos: data.items.slice(0, 3).map(r => ({
              name: r.full_name,
              stars: r.stargazers_count,
              description: r.description
            })),
            total_results: data.total_count
          };
        } catch (error) {
          return {
            competitor: comp,
            recent_repos: [],
            total_results: 0,
            error: error.message
          };
        }
      })
    );

    return {
      analyzed_at: new Date().toISOString(),
      competitors: activity,
      insights: this.generateCompetitorInsights(activity)
    };
  }

  generateCompetitorInsights(activity) {
    const insights = [];

    const totalActivity = activity.reduce((sum, c) => sum + c.total_results, 0);
    const activeCompetitors = activity.filter(c => c.total_results > 0).length;

    insights.push(`${activeCompetitors} out of ${activity.length} competitors have active community projects`);
    
    activity.forEach(comp => {
      if (comp.recent_repos.length > 0) {
        const avgStars = comp.recent_repos.reduce((sum, r) => sum + r.stars, 0) / comp.recent_repos.length;
        if (avgStars > 100) {
          insights.push(`${comp.competitor} has high community engagement (avg ${Math.round(avgStars)} stars)`);
        }
      }
    });

    return insights;
  }

  async saveTrendData(data, filename) {
    await fs.mkdir(this.dataDir, { recursive: true });
    const filepath = path.join(this.dataDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`✅ Trend data saved to ${filepath}`);
    return filepath;
  }
}

async function main() {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN environment variable not set');
    process.exit(1);
  }

  const detector = new TrendDetector(githubToken);
  
  try {
    console.log('📊 Detecting trending topics...\n');
    const trends = await detector.detectTrendingTopics(['javascript', 'typescript'], 7);
    
    console.log('🔥 Top Trending Topics:');
    trends.trending_topics.slice(0, 5).forEach((topic, i) => {
      console.log(`  ${i + 1}. ${topic.name} (${topic.count} repos)`);
    });
    
    console.log('\n💻 Top Technologies:');
    trends.trending_technologies.slice(0, 5).forEach((tech, i) => {
      console.log(`  ${i + 1}. ${tech.name} (${tech.count} occurrences)`);
    });
    
    console.log('\n📝 Content Opportunities:');
    trends.content_opportunities.slice(0, 3).forEach((opp, i) => {
      console.log(`  ${i + 1}. [${opp.type}] ${opp.title}`);
      console.log(`     Confidence: ${opp.confidence}%, Trending Score: ${opp.trending_score}`);
    });
    
    const filename = `trends-${Date.now()}.json`;
    await detector.saveTrendData(trends, filename);
    
    console.log('\n🎯 Analyzing competitor activity...\n');
    const competitors = await detector.detectIDECompetitorActivity();
    
    console.log('💡 Competitor Insights:');
    competitors.insights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight}`);
    });
    
    const compFilename = `competitor-analysis-${Date.now()}.json`;
    await detector.saveTrendData(competitors, compFilename);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TrendDetector;
