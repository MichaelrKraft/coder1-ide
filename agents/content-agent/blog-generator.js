const path = require('path');
const fs = require('fs').promises;
const ClaudeAPI = require('../lib/claude-api');
const GitHubActivityCollector = require('../data-collectors/github-activity-collector');
const TrendDetector = require('../data-collectors/trend-detector');

class BlogGenerator {
  constructor() {
    this.claudeAPI = new ClaudeAPI();
    this.githubCollector = new GitHubActivityCollector(process.env.GITHUB_TOKEN);
    this.trendDetector = new TrendDetector(process.env.GITHUB_TOKEN);
    this.queueDir = path.join(__dirname, '../review-queue/pending');
    this.dataDir = path.join(__dirname, '../data');
  }

  async generateBlogPost(topic, context = {}) {
    console.log(`📝 Generating blog post about: ${topic}`);

    const prompt = this.buildBlogPrompt(topic, context);
    
    try {
      const response = await this.claudeAPI.generateResponse(prompt, {
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000
      });

      const blogPost = this.formatBlogPost(response, topic, context);
      return blogPost;
    } catch (error) {
      console.error('Error generating blog post with Claude:', error.message);
      return this.generateFallbackBlogPost(topic, context);
    }
  }

  buildBlogPrompt(topic, context) {
    return `You are a technical blog writer for Coder1, an AI-first IDE for Claude Code integration.

Write a comprehensive blog post about: ${topic}

Context:
${context.technologies ? `- Technologies: ${context.technologies.join(', ')}` : ''}
${context.trending_score ? `- Trending Score: ${context.trending_score}` : ''}
${context.community_interest ? `- Community Interest: ${context.community_interest}` : ''}
${context.user_pain_points ? `- User Pain Points: ${context.user_pain_points}` : ''}

The blog post should:
1. Have a catchy, SEO-friendly title
2. Start with a hook that captures attention
3. Include 3-5 main sections with practical examples
4. Feature code snippets where appropriate (use markdown code blocks)
5. Show how Coder1 IDE solves the problem
6. End with a clear call-to-action
7. Be 800-1200 words
8. Use a friendly, developer-focused tone

Format as markdown with proper headings (##, ###).
Do not include meta tags or front matter.`;
  }

  formatBlogPost(content, topic, context) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const formatted = `---
title: ${this.extractTitle(content)}
date: ${dateStr}
author: Coder1 AI Team
tags: ${this.generateTags(topic, context)}
status: draft
---

${content}

---

*🤖 This blog post was generated using Coder1's AI content system powered by Claude.*  
*[Try Coder1 Free](https://coder1.dev) - The AI-First IDE for modern developers*
`;

    return formatted;
  }

  extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1];
    }
    
    const firstLine = content.split('\n')[0];
    return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled Post';
  }

  generateTags(topic, context) {
    const tags = ['coder1', 'ai-ide', 'development'];
    
    if (context.technologies) {
      context.technologies.slice(0, 3).forEach(tech => {
        tags.push(tech.toLowerCase().replace(/\s+/g, '-'));
      });
    }
    
    const topicWords = topic.toLowerCase().split(/\s+/);
    topicWords.slice(0, 2).forEach(word => {
      if (word.length > 3 && !tags.includes(word)) {
        tags.push(word);
      }
    });
    
    return tags.join(', ');
  }

  generateFallbackBlogPost(topic, context) {
    const dateStr = new Date().toISOString().split('T')[0];
    
    return `---
title: ${topic}
date: ${dateStr}
author: Coder1 AI Team
tags: ${this.generateTags(topic, context)}
status: draft
---

# ${topic}

## Introduction

Developers today face increasing complexity in their workflows. Between managing dependencies, coordinating with AI assistants, and maintaining code quality, the modern development experience can be overwhelming.

That's where Coder1 comes in.

## The Challenge

${context.user_pain_points || 'Modern development requires juggling multiple tools and contexts. Switching between your IDE, terminal, AI assistant, and documentation creates friction and slows you down.'}

## The Coder1 Solution

Coder1 is the first IDE built specifically for Claude Code integration, bringing AI assistance directly into your development workflow:

- **Integrated Terminal**: Full PTY support with AI supervision
- **Smart Context**: Eternal memory that never forgets your project
- **Session Intelligence**: Comprehensive development summaries for perfect handoffs
- **AI Team**: Multiple specialized agents working together

## Getting Started

\`\`\`bash
# Install Coder1
git clone https://github.com/MichaelrKraft/coder1-ide
cd coder1-ide
npm install

# Start developing
npm run dev
\`\`\`

## Real-World Example

Let's say you're building ${context.example_project || 'a REST API with Express and TypeScript'}. With Coder1:

1. **Start a session**: Open Coder1 IDE
2. **Ask Claude**: "Help me scaffold an Express API"
3. **AI generates**: Complete project structure
4. **You customize**: Make it yours with AI assistance
5. **Deploy**: One-click deployment

## Why Developers Love Coder1

${context.testimonials || '- "Cut my development time in half" - Early Adopter\\n- "Finally, an IDE that understands my workflow" - Beta Tester\\n- "Claude Code integration is seamless" - Power User'}

## Conclusion

Whether you're a solo developer or part of a team, Coder1 brings AI-first development to life. With Claude Code integration, eternal memory, and intelligent session management, you can focus on what matters: building great software.

Ready to transform your development workflow?

## Get Started Today

- 🆓 **Free Forever**: Full IDE with 7-day memory trial
- 💎 **Pro ($29/mo)**: Unlimited eternal memory + advanced features
- 🌟 **Star us on GitHub**: [github.com/MichaelrKraft/coder1-ide](https://github.com/MichaelrKraft/coder1-ide)

---

*🤖 This blog post was generated using Coder1's AI content system powered by Claude.*  
*[Try Coder1 Free](https://coder1.dev) - The AI-First IDE for modern developers*
`;
  }

  async generateWeeklyBlogPosts(count = 5) {
    console.log(`\n📊 Generating ${count} blog posts for the week...\n`);
    
    const trends = await this.trendDetector.detectTrendingTopics(['javascript', 'typescript'], 7);
    
    const opportunities = trends.content_opportunities
      .filter(opp => opp.type === 'blog_post')
      .slice(0, count);

    if (opportunities.length === 0) {
      console.log('⚠️  No content opportunities found, generating generic posts');
      opportunities.push(
        { title: 'Getting Started with AI-First Development', confidence: 80 },
        { title: 'Claude Code Integration Best Practices', confidence: 75 },
        { title: 'Building Full-Stack Apps with Eternal Memory', confidence: 70 }
      );
    }

    const posts = [];
    for (const opp of opportunities) {
      try {
        const context = {
          technologies: trends.trending_technologies.slice(0, 3).map(t => t.name),
          trending_score: opp.trending_score || opp.confidence,
          suggested_angle: opp.suggested_angle || 'Developer productivity'
        };

        const post = await this.generateBlogPost(opp.title, context);
        posts.push({
          topic: opp.title,
          content: post,
          confidence: opp.confidence || 70
        });

        console.log(`✅ Generated: ${opp.title} (confidence: ${opp.confidence}%)`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error generating post "${opp.title}":`, error.message);
      }
    }

    return {
      generated_at: new Date().toISOString(),
      posts_generated: posts.length,
      posts
    };
  }

  async saveToReviewQueue(post, queueId) {
    await fs.mkdir(this.queueDir, { recursive: true });
    
    const queueItem = {
      id: queueId,
      type: 'blog_post',
      topic: post.topic,
      content: post.content,
      confidence: post.confidence,
      created_at: new Date().toISOString(),
      status: 'pending_review'
    };

    const filepath = path.join(this.queueDir, `blog-${queueId}.json`);
    await fs.writeFile(filepath, JSON.stringify(queueItem, null, 2));
    
    console.log(`📋 Saved to review queue: ${filepath}`);
    return filepath;
  }

  async saveBatchToQueue(results) {
    const saved = [];
    
    for (let i = 0; i < results.posts.length; i++) {
      const post = results.posts[i];
      const queueId = `${Date.now()}-${i}`;
      const filepath = await this.saveToReviewQueue(post, queueId);
      saved.push({ queueId, filepath, topic: post.topic });
    }

    return saved;
  }

  async generateDailyDigest(savedPosts) {
    const digest = {
      subject: `📝 Coder1 Blog Posts Ready for Review (${new Date().toLocaleDateString()})`,
      html: this.buildDigestHTML(savedPosts),
      text: this.buildDigestText(savedPosts)
    };

    return digest;
  }

  buildDigestHTML(posts) {
    return `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #6366f1; color: white; padding: 20px; }
    .post { border: 1px solid #ddd; margin: 20px 0; padding: 15px; border-radius: 5px; }
    .topic { font-size: 18px; font-weight: bold; color: #6366f1; }
    .actions { margin-top: 10px; }
    .btn { display: inline-block; padding: 8px 16px; margin-right: 10px; text-decoration: none; border-radius: 4px; }
    .approve { background: #10b981; color: white; }
    .edit { background: #f59e0b; color: white; }
    .reject { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📝 Blog Posts Ready for Review</h1>
    <p>${new Date().toLocaleDateString()} - ${posts.length} posts generated</p>
  </div>
  
  ${posts.map(post => `
    <div class="post">
      <div class="topic">${post.topic}</div>
      <p><strong>Queue ID:</strong> ${post.queueId}</p>
      <div class="actions">
        <a href="mailto:support@callspot.ai?subject=APPROVE ${post.queueId}" class="btn approve">✓ Approve</a>
        <a href="mailto:support@callspot.ai?subject=EDIT ${post.queueId}" class="btn edit">✏️ Edit</a>
        <a href="mailto:support@callspot.ai?subject=REJECT ${post.queueId}" class="btn reject">✗ Reject</a>
      </div>
    </div>
  `).join('')}
  
  <hr>
  <p style="color: #666; font-size: 12px;">
    Reply to this email with APPROVE, EDIT, or REJECT followed by the Queue ID.
    Example: "APPROVE ${posts[0]?.queueId}"
  </p>
</body>
</html>`;
  }

  buildDigestText(posts) {
    let text = `📝 Coder1 Blog Posts Ready for Review\n`;
    text += `${new Date().toLocaleDateString()} - ${posts.length} posts generated\n\n`;
    text += `${'='.repeat(60)}\n\n`;

    posts.forEach((post, i) => {
      text += `${i + 1}. ${post.topic}\n`;
      text += `   Queue ID: ${post.queueId}\n`;
      text += `   Actions: APPROVE ${post.queueId} | EDIT ${post.queueId} | REJECT ${post.queueId}\n\n`;
    });

    text += `${'='.repeat(60)}\n`;
    text += `\nReply with your action followed by the Queue ID.\n`;
    text += `Example: "APPROVE ${posts[0]?.queueId}"`;

    return text;
  }
}

async function main() {
  const generator = new BlogGenerator();
  
  try {
    console.log('🚀 Starting blog post generation...\n');
    
    const results = await generator.generateWeeklyBlogPosts(5);
    
    console.log(`\n✅ Generated ${results.posts_generated} blog posts`);
    
    console.log('\n📋 Saving to review queue...');
    const saved = await generator.saveBatchToQueue(results);
    
    console.log(`\n✅ Saved ${saved.length} posts to review queue`);
    
    const digest = await generator.generateDailyDigest(saved);
    console.log('\n📧 Digest email generated (ready to send via email service)');
    console.log('Subject:', digest.subject);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BlogGenerator;
