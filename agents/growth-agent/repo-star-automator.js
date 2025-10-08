const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class RepoStarAutomator {
  constructor(githubToken) {
    this.octokit = new Octokit({ auth: githubToken });
    this.dataDir = path.join(__dirname, '../data');
    this.starredDb = path.join(this.dataDir, 'starred-repos.json');
    
    this.dailyLimit = 5;
    this.minStars = 50;
    this.maxStarsPerRepo = 10000;
    
    this.relevantTopics = [
      'ai', 'llm', 'claude', 'ide', 'editor', 'vscode', 
      'development', 'developer-tools', 'typescript', 'javascript',
      'react', 'nextjs', 'node', 'code-editor', 'ai-assistant'
    ];
  }

  async initialize() {
    await fs.mkdir(this.dataDir, { recursive: true });
    
    try {
      const data = await fs.readFile(this.starredDb, 'utf8');
      this.starredRepos = JSON.parse(data);
    } catch (error) {
      this.starredRepos = {
        repos: [],
        last_run: null,
        total_starred: 0
      };
    }
  }

  async findRelevantRepos(limit = 30) {
    console.log('🔍 Searching for relevant repositories...\n');
    
    const queries = [
      'topic:ai topic:ide stars:>50',
      'topic:developer-tools stars:>100',
      'topic:typescript topic:react stars:>50',
      'topic:code-editor stars:>50',
      'topic:ai-assistant language:typescript'
    ];

    const allRepos = [];
    
    for (const query of queries) {
      try {
        const { data } = await this.octokit.search.repos({
          q: query,
          sort: 'stars',
          per_page: 10
        });

        allRepos.push(...data.items);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error searching with query "${query}":`, error.message);
      }
    }

    const uniqueRepos = this.deduplicateRepos(allRepos);
    return uniqueRepos.slice(0, limit);
  }

  deduplicateRepos(repos) {
    const seen = new Set();
    return repos.filter(repo => {
      if (seen.has(repo.full_name)) {
        return false;
      }
      seen.add(repo.full_name);
      return true;
    });
  }

  calculateRelevanceScore(repo) {
    let score = 0;

    const topicMatches = (repo.topics || []).filter(t => 
      this.relevantTopics.includes(t.toLowerCase())
    ).length;
    score += topicMatches * 15;

    const nameMatch = this.relevantTopics.some(topic => 
      repo.name.toLowerCase().includes(topic)
    );
    if (nameMatch) score += 20;

    const descMatch = this.relevantTopics.some(topic => 
      (repo.description || '').toLowerCase().includes(topic)
    );
    if (descMatch) score += 10;

    const stars = repo.stargazers_count;
    if (stars >= this.minStars && stars <= this.maxStarsPerRepo) {
      score += 25;
    }

    const isActive = this.isRecentlyActive(repo.updated_at);
    if (isActive) score += 10;

    const language = (repo.language || '').toLowerCase();
    if (['typescript', 'javascript'].includes(language)) {
      score += 10;
    }

    return score;
  }

  isRecentlyActive(updatedAt) {
    const lastUpdate = new Date(updatedAt);
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - 3);
    return lastUpdate >= monthsAgo;
  }

  async filterCandidates(repos) {
    const alreadyStarred = new Set(this.starredRepos.repos.map(r => r.full_name));
    
    const candidates = repos
      .filter(repo => !alreadyStarred.has(repo.full_name))
      .map(repo => ({
        ...repo,
        relevance_score: this.calculateRelevanceScore(repo)
      }))
      .filter(repo => repo.relevance_score >= 60)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    return candidates;
  }

  async starRepository(owner, repo, dryRun = false) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would star: ${owner}/${repo}`);
      return { success: true, dry_run: true };
    }

    try {
      await this.octokit.activity.starRepoForAuthenticatedUser({
        owner,
        repo
      });

      return { success: true };
    } catch (error) {
      console.error(`  ❌ Error starring ${owner}/${repo}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async autoStarRepos(dailyLimit = null, dryRun = false) {
    await this.initialize();

    const limit = dailyLimit || this.dailyLimit;
    console.log(`🌟 Auto-starring up to ${limit} repositories${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const repos = await this.findRelevantRepos(30);
    console.log(`📊 Found ${repos.length} repositories to evaluate\n`);

    const candidates = await this.filterCandidates(repos);
    console.log(`✅ ${candidates.length} repositories meet relevance criteria\n`);

    if (candidates.length === 0) {
      console.log('ℹ️  No new repositories to star');
      return {
        starred: 0,
        candidates: 0,
        repos_starred: []
      };
    }

    const toStar = candidates.slice(0, limit);
    const starred = [];

    for (const repo of toStar) {
      const [owner, name] = repo.full_name.split('/');
      
      console.log(`⭐ Starring: ${repo.full_name}`);
      console.log(`   Stars: ${repo.stargazers_count} | Score: ${repo.relevance_score} | Topics: ${(repo.topics || []).join(', ')}`);
      
      const result = await this.starRepository(owner, name, dryRun);
      
      if (result.success) {
        starred.push({
          full_name: repo.full_name,
          stars: repo.stargazers_count,
          relevance_score: repo.relevance_score,
          topics: repo.topics || [],
          starred_at: new Date().toISOString()
        });

        if (!dryRun) {
          this.starredRepos.repos.push({
            full_name: repo.full_name,
            starred_at: new Date().toISOString()
          });
        }

        console.log(`   ✅ ${dryRun ? 'Would be starred' : 'Starred successfully'}\n`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!dryRun) {
      this.starredRepos.last_run = new Date().toISOString();
      this.starredRepos.total_starred += starred.length;
      await this.saveStarredDatabase();
    }

    return {
      starred: starred.length,
      candidates: candidates.length,
      repos_starred: starred,
      dry_run: dryRun
    };
  }

  async saveStarredDatabase() {
    await fs.writeFile(
      this.starredDb,
      JSON.stringify(this.starredRepos, null, 2)
    );
    console.log(`💾 Starred repos database updated: ${this.starredRepos.total_starred} total`);
  }

  async getStats() {
    await this.initialize();

    return {
      total_starred: this.starredRepos.total_starred,
      last_run: this.starredRepos.last_run,
      repos_in_database: this.starredRepos.repos.length,
      recent_stars: this.starredRepos.repos
        .slice(-10)
        .reverse()
        .map(r => ({
          repo: r.full_name,
          starred_at: r.starred_at
        }))
    };
  }
}

async function main() {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN environment variable not set');
    process.exit(1);
  }

  const automator = new RepoStarAutomator(githubToken);
  
  const dryRun = process.argv.includes('--dry-run');
  const limit = process.argv.includes('--limit') ? 
    parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : 
    5;
  
  try {
    const results = await automator.autoStarRepos(limit, dryRun);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 AUTO-STAR SUMMARY');
    console.log('='.repeat(60));
    console.log(`Starred: ${results.starred} repositories`);
    console.log(`Candidates evaluated: ${results.candidates}`);
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No repositories were actually starred');
    }
    console.log('='.repeat(60));
    
    const stats = await automator.getStats();
    console.log('\n📈 OVERALL STATS');
    console.log('='.repeat(60));
    console.log(`Total repos starred: ${stats.total_starred}`);
    console.log(`Last run: ${stats.last_run || 'Never'}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RepoStarAutomator;
