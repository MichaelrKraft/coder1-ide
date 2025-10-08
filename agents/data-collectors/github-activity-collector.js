const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class GitHubActivityCollector {
  constructor(githubToken) {
    this.octokit = new Octokit({ auth: githubToken });
    this.dataDir = path.join(__dirname, '../data');
  }

  async collectRepositoryActivity(owner, repo) {
    try {
      const [issues, pullRequests, stars, commits] = await Promise.all([
        this.getRecentIssues(owner, repo),
        this.getRecentPullRequests(owner, repo),
        this.getStargazers(owner, repo),
        this.getRecentCommits(owner, repo)
      ]);

      return {
        repository: `${owner}/${repo}`,
        collected_at: new Date().toISOString(),
        issues,
        pull_requests: pullRequests,
        stars,
        commits,
        metrics: {
          total_issues: issues.length,
          total_prs: pullRequests.length,
          total_stars: stars.length,
          total_commits: commits.length
        }
      };
    } catch (error) {
      console.error('Error collecting repository activity:', error.message);
      throw error;
    }
  }

  async getRecentIssues(owner, repo, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        since: since.toISOString(),
        per_page: 100
      });

      return data
        .filter(issue => !issue.pull_request)
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          created_at: issue.created_at,
          labels: issue.labels.map(l => l.name),
          user: issue.user.login,
          comments: issue.comments
        }));
    } catch (error) {
      console.error('Error fetching issues:', error.message);
      return [];
    }
  }

  async getRecentPullRequests(owner, repo, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 100
      });

      return data
        .filter(pr => new Date(pr.created_at) >= since)
        .map(pr => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          created_at: pr.created_at,
          merged: pr.merged_at !== null,
          user: pr.user.login
        }));
    } catch (error) {
      console.error('Error fetching pull requests:', error.message);
      return [];
    }
  }

  async getStargazers(owner, repo, limit = 50) {
    try {
      const { data } = await this.octokit.activity.listStargazersForRepo({
        owner,
        repo,
        per_page: limit,
        headers: {
          accept: 'application/vnd.github.v3.star+json'
        }
      });

      return data.map(star => ({
        user: star.user.login,
        starred_at: star.starred_at
      }));
    } catch (error) {
      console.error('Error fetching stargazers:', error.message);
      return [];
    }
  }

  async getRecentCommits(owner, repo, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const { data } = await this.octokit.repos.listCommits({
        owner,
        repo,
        since: since.toISOString(),
        per_page: 100
      });

      return data.map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author.name,
        date: commit.commit.author.date
      }));
    } catch (error) {
      console.error('Error fetching commits:', error.message);
      return [];
    }
  }

  async getTrendingTopics(language = 'javascript', days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const { data } = await this.octokit.search.repos({
        q: `language:${language} created:>${since.toISOString().split('T')[0]}`,
        sort: 'stars',
        order: 'desc',
        per_page: 20
      });

      return data.items.map(repo => ({
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics || [],
        url: repo.html_url
      }));
    } catch (error) {
      console.error('Error fetching trending topics:', error.message);
      return [];
    }
  }

  async analyzeCommunityActivity(owner, repo) {
    try {
      const activity = await this.collectRepositoryActivity(owner, repo);
      
      const patterns = {
        most_active_contributors: this.getMostActiveContributors(activity),
        common_issue_labels: this.getCommonLabels(activity.issues),
        trending_topics: this.extractTopicsFromActivity(activity),
        activity_summary: this.generateActivitySummary(activity)
      };

      return {
        ...activity,
        patterns
      };
    } catch (error) {
      console.error('Error analyzing community activity:', error.message);
      throw error;
    }
  }

  getMostActiveContributors(activity) {
    const contributors = {};
    
    activity.issues.forEach(issue => {
      contributors[issue.user] = (contributors[issue.user] || 0) + 1;
    });
    
    activity.pull_requests.forEach(pr => {
      contributors[pr.user] = (contributors[pr.user] || 0) + 2;
    });

    return Object.entries(contributors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([user, count]) => ({ user, activity_score: count }));
  }

  getCommonLabels(issues) {
    const labels = {};
    
    issues.forEach(issue => {
      issue.labels.forEach(label => {
        labels[label] = (labels[label] || 0) + 1;
      });
    });

    return Object.entries(labels)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }));
  }

  extractTopicsFromActivity(activity) {
    const topics = new Set();
    
    activity.issues.forEach(issue => {
      const words = issue.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 5 && !['issue', 'error', 'problem'].includes(word)) {
          topics.add(word);
        }
      });
    });

    return Array.from(topics).slice(0, 20);
  }

  generateActivitySummary(activity) {
    const totalActivity = activity.metrics.total_issues + 
                         activity.metrics.total_prs + 
                         activity.metrics.total_commits;

    return {
      total_activity_items: totalActivity,
      average_daily_activity: (totalActivity / 7).toFixed(1),
      issue_to_pr_ratio: (activity.metrics.total_issues / (activity.metrics.total_prs || 1)).toFixed(2),
      recent_star_velocity: activity.metrics.total_stars
    };
  }

  async saveActivityData(data, filename) {
    await fs.mkdir(this.dataDir, { recursive: true });
    const filepath = path.join(this.dataDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`✅ Activity data saved to ${filepath}`);
    return filepath;
  }

  async loadActivityData(filename) {
    const filepath = path.join(this.dataDir, filename);
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  }
}

async function main() {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN environment variable not set');
    console.log('Set it in .env file or export GITHUB_TOKEN=your_token');
    process.exit(1);
  }

  const collector = new GitHubActivityCollector(githubToken);
  
  const owner = process.env.GITHUB_OWNER || 'MichaelrKraft';
  const repo = process.env.GITHUB_REPO || 'coder1-ide';
  
  console.log(`📊 Collecting activity for ${owner}/${repo}...`);
  
  try {
    const activity = await collector.analyzeCommunityActivity(owner, repo);
    
    console.log('\n📈 Activity Summary:');
    console.log(`  Issues: ${activity.metrics.total_issues}`);
    console.log(`  Pull Requests: ${activity.metrics.total_prs}`);
    console.log(`  Commits: ${activity.metrics.total_commits}`);
    console.log(`  Stars: ${activity.metrics.total_stars}`);
    console.log(`  Daily Activity: ${activity.patterns.activity_summary.average_daily_activity} items/day`);
    
    const filename = `github-activity-${Date.now()}.json`;
    await collector.saveActivityData(activity, filename);
    
    console.log('\n🎯 Trending Topics:', activity.patterns.trending_topics.slice(0, 5).join(', '));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = GitHubActivityCollector;
