const path = require('path');
const fs = require('fs').promises;
const ClaudeAPI = require('../lib/claude-api');
const SessionAnalyzer = require('../data-collectors/session-analyzer');

class CaseStudyCreator {
  constructor() {
    this.claudeAPI = new ClaudeAPI();
    this.sessionAnalyzer = new SessionAnalyzer();
    this.queueDir = path.join(__dirname, '../review-queue/pending');
  }

  async createCaseStudy(sessionData, context = {}) {
    console.log(`📊 Creating case study from session: ${sessionData.filepath || 'unknown'}`);

    const prompt = this.buildCaseStudyPrompt(sessionData, context);
    
    try {
      const response = await this.claudeAPI.generateResponse(prompt, {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500
      });

      const caseStudy = this.formatCaseStudy(response, sessionData, context);
      return caseStudy;
    } catch (error) {
      console.error('Error generating case study with Claude:', error.message);
      return this.generateFallbackCaseStudy(sessionData, context);
    }
  }

  buildCaseStudyPrompt(sessionData, context) {
    const technologies = sessionData.technologies || context.technologies || [];
    const duration = sessionData.duration || sessionData.metrics?.estimated_duration || {};
    
    return `You are a case study writer for Coder1 IDE.

Create a compelling case study based on this development session:

Session Details:
- Technologies: ${technologies.join(', ') || 'Not specified'}
- Duration: ${duration.formatted || 'Not specified'}
- Files Modified: ${sessionData.metrics?.files_modified || 'Not specified'}
- Achievements: ${sessionData.achievements?.join(', ') || 'Successful project completion'}

The case study should:
1. Have an attention-grabbing title
2. Start with "The Challenge" - what problem was being solved
3. Include "The Solution" - how Coder1 IDE helped
4. Feature "The Results" - specific metrics and outcomes
5. Add "Key Takeaways" - lessons learned
6. Be 500-800 words
7. Focus on the value Coder1 provided
8. Use a narrative, story-driven approach

IMPORTANT: Anonymize all user data. Use generic terms like "a developer", "the team", etc.

Format as markdown.`;
  }

  formatCaseStudy(content, sessionData, context) {
    const date = new Date().toISOString().split('T')[0];
    
    const formatted = `---
title: ${this.extractTitle(content)}
date: ${date}
type: case_study
industry: ${context.industry || 'Technology'}
technologies: ${(sessionData.technologies || []).join(', ')}
status: draft
---

${content}

---

## About Coder1

Coder1 is the AI-first IDE built specifically for Claude Code integration. With features like eternal memory, intelligent session management, and multi-agent collaboration, Coder1 helps developers ship faster without sacrificing quality.

**Ready to transform your development workflow?**

- 🆓 [Try Coder1 Free](https://coder1.dev)
- ⭐ [Star on GitHub](https://github.com/MichaelrKraft/coder1-ide)
- 📚 [Read Documentation](https://docs.coder1.dev)

---

*🤖 This case study was generated using Coder1's AI content system powered by Claude.*  
*All user data has been anonymized to protect privacy.*
`;

    return formatted;
  }

  extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1];
    }
    return 'Success Story: Building with Coder1';
  }

  generateFallbackCaseStudy(sessionData, context) {
    const technologies = sessionData.technologies || ['React', 'TypeScript'];
    const duration = sessionData.duration || { formatted: '2 hours' };
    const date = new Date().toISOString().split('T')[0];
    
    return `---
title: How a Developer Built a ${technologies[0]} App in ${duration.formatted} with Coder1
date: ${date}
type: case_study
industry: ${context.industry || 'Technology'}
technologies: ${technologies.join(', ')}
status: draft
---

# How a Developer Built a ${technologies[0]} App in ${duration.formatted} with Coder1

## The Challenge

A developer needed to build a production-ready ${technologies[0]} application quickly. Traditional development would have taken days of setup, configuration, and debugging.

The requirements:
- **Fast Turnaround**: Ship in hours, not days
- **Production Quality**: No shortcuts on code quality
- **Modern Stack**: ${technologies.join(', ')}
- **AI Assistance**: Leverage AI without manual copy-paste

## The Solution: Coder1 IDE

Instead of juggling multiple tools, the developer used Coder1 - the AI-first IDE built specifically for Claude Code integration.

### What Made the Difference

**1. Integrated AI Assistance**
No more switching between IDE and AI chat. Claude Code was built directly into the workflow.

**2. Eternal Memory**
Coder1 never forgot the project context. Every file, every decision, every pattern was remembered.

**3. Multi-Agent Collaboration**
The AI Team feature spawned specialized agents:
- Frontend specialist for ${technologies.includes('React') ? 'React components' : 'UI development'}
- Backend engineer for API architecture
- Testing specialist for quality assurance

**4. Zero Context Switching**
Everything in one place: editor, terminal, AI assistance, and preview.

## The Results

${this.generateResults(sessionData)}

## Technical Highlights

The project leveraged:
- **${technologies[0]}**: Primary framework
${technologies.slice(1).map(t => `- **${t}**: ${this.getTechPurpose(t)}`).join('\n')}

Key features implemented:
- Authentication and authorization
- RESTful API integration
- Responsive UI design
- Automated testing
- Production deployment

## Developer Testimonial

> "Coder1 changed how I develop. What used to take me 2 days took ${duration.formatted}. The AI assistance wasn't just autocomplete - it understood my entire project."

## Key Takeaways

1. **AI-First Development Works**: Integrating AI directly into the IDE is game-changing
2. **Context Is Everything**: Eternal memory eliminates the "remind me what we're doing" problem
3. **Speed Without Compromise**: Fast development doesn't mean messy code
4. **Learning Accelerator**: The AI explanations helped improve skills while building

## Try It Yourself

This isn't a one-off success story. Developers are using Coder1 daily to ship faster:

- **Startups**: MVP in days, not weeks
- **Agencies**: More client projects per month
- **Solo Developers**: Compete with larger teams
- **Students**: Learn by building real projects

---

## About Coder1

Coder1 is the AI-first IDE built specifically for Claude Code integration. With features like eternal memory, intelligent session management, and multi-agent collaboration, Coder1 helps developers ship faster without sacrificing quality.

**Ready to transform your development workflow?**

- 🆓 [Try Coder1 Free](https://coder1.dev)
- ⭐ [Star on GitHub](https://github.com/MichaelrKraft/coder1-ide)
- 📚 [Read Documentation](https://docs.coder1.dev)

---

*🤖 This case study was generated using Coder1's AI content system powered by Claude.*  
*All user data has been anonymized to protect privacy.*
`;
  }

  generateResults(sessionData) {
    const metrics = sessionData.metrics || {};
    
    return `**Development Time**: ${sessionData.duration?.formatted || 'Under 3 hours'}

**Code Generated**: ${metrics.files_modified || 15}+ files created and configured

**Error Rate**: ${metrics.errors_encountered === 0 ? 'Zero errors on first run' : 'Minimal debugging required'}

**Time Saved**: ${this.calculateTimeSaved(sessionData)}

**Developer Satisfaction**: ⭐⭐⭐⭐⭐`;
  }

  calculateTimeSaved(sessionData) {
    const actualMinutes = sessionData.duration?.minutes || 120;
    const traditionalMinutes = actualMinutes * 3;
    const savedHours = Math.floor((traditionalMinutes - actualMinutes) / 60);
    return `${savedHours}+ hours compared to traditional development`;
  }

  getTechPurpose(tech) {
    const purposes = {
      'TypeScript': 'Type safety and better DX',
      'Next.js': 'Full-stack React framework',
      'Node.js': 'Backend runtime',
      'Express': 'API framework',
      'MongoDB': 'Database',
      'PostgreSQL': 'Relational database',
      'Tailwind': 'Styling',
      'API': 'Data integration',
      'React': 'UI framework'
    };
    return purposes[tech] || 'Core functionality';
  }

  async generateWeeklyCaseStudies(count = 1) {
    console.log(`\n📊 Generating ${count} case studies for the week...\n`);
    
    const sessionResults = await this.sessionAnalyzer.analyzeAllSessions();
    
    const candidates = sessionResults.recommendations.case_study_worthy.slice(0, count);

    if (candidates.length === 0) {
      console.log('⚠️  No case study-worthy sessions found, generating generic case study');
      candidates.push({
        file: 'generic',
        technologies: ['React', 'TypeScript', 'Next.js'],
        achievements: ['rapid-development', 'error-free'],
        score: 75
      });
    }

    const caseStudies = [];
    
    for (const candidate of candidates) {
      try {
        const sessionData = {
          filepath: candidate.file,
          technologies: candidate.technologies,
          achievements: candidate.achievements,
          duration: { formatted: '2 hours' },
          metrics: {
            files_modified: 15,
            errors_encountered: 0,
            commands_executed: 20
          }
        };

        const caseStudy = await this.createCaseStudy(sessionData);
        caseStudies.push({
          title: this.extractTitle(caseStudy),
          content: caseStudy,
          confidence: candidate.score || 75,
          based_on_session: candidate.file
        });

        console.log(`✅ Generated case study (confidence: ${candidate.score}%)`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error generating case study:`, error.message);
      }
    }

    return {
      generated_at: new Date().toISOString(),
      case_studies_generated: caseStudies.length,
      case_studies: caseStudies
    };
  }

  async saveToReviewQueue(caseStudy, queueId) {
    await fs.mkdir(this.queueDir, { recursive: true });
    
    const queueItem = {
      id: queueId,
      type: 'case_study',
      title: caseStudy.title,
      content: caseStudy.content,
      confidence: caseStudy.confidence,
      based_on_session: caseStudy.based_on_session,
      created_at: new Date().toISOString(),
      status: 'pending_review'
    };

    const filepath = path.join(this.queueDir, `case-study-${queueId}.json`);
    await fs.writeFile(filepath, JSON.stringify(queueItem, null, 2));
    
    console.log(`📋 Saved to review queue: ${filepath}`);
    return filepath;
  }

  async saveBatchToQueue(results) {
    const saved = [];
    
    for (let i = 0; i < results.case_studies.length; i++) {
      const caseStudy = results.case_studies[i];
      const queueId = `${Date.now()}-${i}`;
      const filepath = await this.saveToReviewQueue(caseStudy, queueId);
      saved.push({ queueId, filepath, title: caseStudy.title });
    }

    return saved;
  }
}

async function main() {
  const creator = new CaseStudyCreator();
  
  try {
    console.log('🚀 Starting case study generation...\n');
    
    const results = await creator.generateWeeklyCaseStudies(1);
    
    console.log(`\n✅ Generated ${results.case_studies_generated} case study`);
    
    console.log('\n📋 Saving to review queue...');
    const saved = await creator.saveBatchToQueue(results);
    
    console.log(`\n✅ Saved ${saved.length} case study to review queue`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CaseStudyCreator;
