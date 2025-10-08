const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class MediumPublisher {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.medium.com/v1';
  }

  async publishPost(title, content, tags = [], publishStatus = 'draft') {
    console.log(`📝 Publishing to Medium: ${title}`);

    if (!this.apiKey) {
      console.log('⚠️  No Medium API key, saving to file instead');
      return this.saveToFile(title, content, tags);
    }

    try {
      const userId = await this.getUserId();
      
      const postData = {
        title: this.extractTitle(content, title),
        contentFormat: 'markdown',
        content: content,
        tags: tags.slice(0, 5),
        publishStatus: publishStatus
      };

      const result = await this.makeRequest(
        `/users/${userId}/posts`,
        'POST',
        postData
      );

      console.log(`✅ Published to Medium successfully`);
      console.log(`   URL: ${result.data.url}`);
      
      return {
        success: true,
        url: result.data.url,
        id: result.data.id
      };
    } catch (error) {
      console.error(`❌ Error publishing to Medium:`, error.message);
      console.log(`   Falling back to file save`);
      return this.saveToFile(title, content, tags);
    }
  }

  async getUserId() {
    if (this.userId) {
      return this.userId;
    }

    const result = await this.makeRequest('/me', 'GET');
    this.userId = result.data.id;
    return this.userId;
  }

  extractTitle(content, fallbackTitle) {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1].trim();
    }
    
    const firstLine = content.split('\n')[0];
    const cleaned = firstLine.replace(/^#+\s*/, '').trim();
    return cleaned || fallbackTitle;
  }

  makeRequest(endpoint, method, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.medium.com',
        path: `/v1${endpoint}`,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async saveToFile(title, content, tags) {
    const publishDir = path.join(__dirname, '../data/published-medium');
    await fs.mkdir(publishDir, { recursive: true });

    const filename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const filepath = path.join(publishDir, `${filename}-${Date.now()}.md`);

    const frontMatter = `---
title: ${title}
tags: ${tags.join(', ')}
published: false
platform: medium
saved_at: ${new Date().toISOString()}
---

`;

    await fs.writeFile(filepath, frontMatter + content);

    console.log(`💾 Saved to file: ${filepath}`);
    console.log(`   (Publish manually to Medium when API key is available)`);

    return {
      success: true,
      saved_to_file: filepath,
      manual_publish_required: true
    };
  }
}

async function main() {
  const apiKey = process.env.MEDIUM_API_KEY;
  const publisher = new MediumPublisher(apiKey);

  const testPost = `# Building APIs with Coder1

## Introduction

This is a test blog post for the Medium publisher.

## Features

- Feature 1
- Feature 2
- Feature 3

## Conclusion

Thank you for reading!

---

*🤖 Built with Coder1*
`;

  try {
    const result = await publisher.publishPost(
      'Building APIs with Coder1',
      testPost,
      ['coder1', 'ai', 'development'],
      'draft'
    );

    console.log('\n📊 Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MediumPublisher;
