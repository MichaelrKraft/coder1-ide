const fs = require('fs').promises;
const path = require('path');

class ShowcasePublisher {
  constructor() {
    this.showcaseDir = path.join(__dirname, '../../coder1-ide-next/public/showcase');
    this.showcaseDataFile = path.join(this.showcaseDir, 'case-studies.json');
  }

  async publishCaseStudy(caseStudy) {
    console.log(`🎯 Publishing case study to showcase: ${caseStudy.title}`);

    await fs.mkdir(this.showcaseDir, { recursive: true });

    let showcaseData = await this.loadShowcaseData();

    const showcaseItem = {
      id: `case-${Date.now()}`,
      title: caseStudy.title,
      summary: this.extractSummary(caseStudy.content),
      technologies: caseStudy.technologies || [],
      published_date: new Date().toISOString().split('T')[0],
      content_file: await this.saveContent(caseStudy),
      featured: false,
      stats: this.extractStats(caseStudy.content)
    };

    showcaseData.case_studies.unshift(showcaseItem);

    if (showcaseData.case_studies.length > 20) {
      showcaseData.case_studies = showcaseData.case_studies.slice(0, 20);
    }

    await this.saveShowcaseData(showcaseData);

    console.log(`✅ Published to showcase: ${showcaseItem.id}`);

    return {
      success: true,
      showcase_id: showcaseItem.id,
      url: `/showcase/${showcaseItem.id}`
    };
  }

  async loadShowcaseData() {
    try {
      const data = await fs.readFile(this.showcaseDataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        case_studies: [],
        last_updated: new Date().toISOString()
      };
    }
  }

  async saveShowcaseData(data) {
    data.last_updated = new Date().toISOString();
    await fs.writeFile(
      this.showcaseDataFile,
      JSON.stringify(data, null, 2)
    );
  }

  async saveContent(caseStudy) {
    const contentDir = path.join(this.showcaseDir, 'content');
    await fs.mkdir(contentDir, { recursive: true});

    const filename = caseStudy.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + '.md';

    const filepath = path.join(contentDir, filename);
    await fs.writeFile(filepath, caseStudy.content);

    return filename;
  }

  extractSummary(content) {
    const lines = content.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('#') && !line.startsWith('---') && line.length > 50) {
        return line.substring(0, 200) + '...';
      }
    }

    return 'Case study showcasing development with Coder1 IDE.';
  }

  extractStats(content) {
    const stats = {};

    const timeMatch = content.match(/(\d+)\s*(hour|minute)/i);
    if (timeMatch) {
      stats.development_time = timeMatch[0];
    }

    const filesMatch = content.match(/(\d+)\s*files/i);
    if (filesMatch) {
      stats.files_created = parseInt(filesMatch[1]);
    }

    const savedMatch = content.match(/(\d+)\s*(hour|day)s?\s*saved/i);
    if (savedMatch) {
      stats.time_saved = savedMatch[0];
    }

    return stats;
  }

  async getShowcase() {
    const data = await this.loadShowcaseData();
    return data.case_studies;
  }

  async featureCaseStudy(id) {
    const data = await this.loadShowcaseData();
    
    data.case_studies.forEach(cs => {
      cs.featured = (cs.id === id);
    });

    await this.saveShowcaseData(data);

    return { success: true, featured_id: id };
  }
}

async function main() {
  const publisher = new ShowcasePublisher();

  const testCaseStudy = {
    title: 'Building a REST API in 2 Hours',
    content: `# Building a REST API in 2 Hours

## The Challenge

Developer needed to ship quickly.

## The Solution

Used Coder1 IDE with AI assistance.

## Results

- **Development Time**: 2 hours
- **Files Created**: 15 files
- **Time Saved**: 6 hours compared to traditional development

## Key Takeaways

AI-first development works!`,
    technologies: ['TypeScript', 'Express', 'Node.js']
  };

  try {
    console.log('🚀 Testing Showcase Publisher...\n');
    
    const result = await publisher.publishCaseStudy(testCaseStudy);
    
    console.log('\n📊 Result:', JSON.stringify(result, null, 2));

    console.log('\n📚 Current Showcase:');
    const showcase = await publisher.getShowcase();
    console.log(`Total case studies: ${showcase.length}`);
    if (showcase.length > 0) {
      console.log('\nLatest:');
      console.log(`  - ${showcase[0].title}`);
      console.log(`  - Technologies: ${showcase[0].technologies.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ShowcasePublisher;
