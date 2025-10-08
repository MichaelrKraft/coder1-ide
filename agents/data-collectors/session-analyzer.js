const fs = require('fs').promises;
const path = require('path');

class SessionAnalyzer {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.sessionsDir = path.join(__dirname, '../../coder1-ide-next/exports');
  }

  async findSessionExports() {
    try {
      await fs.access(this.sessionsDir);
      const files = await fs.readdir(this.sessionsDir);
      
      return files
        .filter(f => f.endsWith('.json') || f.endsWith('.md'))
        .map(f => path.join(this.sessionsDir, f));
    } catch (error) {
      console.log('⚠️  No session exports found, returning empty array');
      return [];
    }
  }

  async analyzeSession(filepath) {
    const content = await fs.readFile(filepath, 'utf8');
    const isJSON = filepath.endsWith('.json');
    
    if (isJSON) {
      return this.analyzeJSONSession(JSON.parse(content), filepath);
    } else {
      return this.analyzeMarkdownSession(content, filepath);
    }
  }

  analyzeJSONSession(session, filepath) {
    const analysis = {
      filepath,
      format: 'json',
      session_id: session.sessionId || 'unknown',
      analyzed_at: new Date().toISOString(),
      duration: this.calculateDuration(session),
      metrics: {
        files_modified: this.countFilesModified(session),
        commands_executed: this.countCommands(session),
        errors_encountered: this.countErrors(session),
        ai_interactions: this.countAIInteractions(session)
      },
      technologies: this.extractTechnologies(session),
      achievements: this.identifyAchievements(session),
      tutorial_potential: this.assessTutorialPotential(session),
      case_study_score: this.calculateCaseStudyScore(session)
    };

    return analysis;
  }

  analyzeMarkdownSession(content, filepath) {
    const analysis = {
      filepath,
      format: 'markdown',
      analyzed_at: new Date().toISOString(),
      word_count: content.split(/\s+/).length,
      code_blocks: (content.match(/```/g) || []).length / 2,
      headers: (content.match(/^#+\s/gm) || []).length,
      metrics: {
        estimated_duration: this.estimateDurationFromMarkdown(content),
        complexity: this.assessComplexity(content)
      },
      technologies: this.extractTechnologiesFromText(content),
      tutorial_potential: this.assessMarkdownTutorialPotential(content),
      case_study_score: this.calculateMarkdownCaseStudyScore(content)
    };

    return analysis;
  }

  calculateDuration(session) {
    if (session.startTime && session.endTime) {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      const minutes = Math.round((end - start) / 60000);
      return { minutes, formatted: `${minutes} minutes` };
    }
    return { minutes: 0, formatted: 'unknown' };
  }

  countFilesModified(session) {
    if (!session.files) return 0;
    return Array.isArray(session.files) ? session.files.length : Object.keys(session.files).length;
  }

  countCommands(session) {
    if (!session.terminal || !session.terminal.history) return 0;
    return Array.isArray(session.terminal.history) ? session.terminal.history.length : 0;
  }

  countErrors(session) {
    if (!session.terminal || !session.terminal.history) return 0;
    const history = session.terminal.history || [];
    return history.filter(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('failed')
    ).length;
  }

  countAIInteractions(session) {
    if (!session.aiInteractions) return 0;
    return Array.isArray(session.aiInteractions) ? session.aiInteractions.length : 0;
  }

  extractTechnologies(session) {
    const tech = new Set();
    const content = JSON.stringify(session).toLowerCase();
    
    const patterns = {
      'React': /\breact\b/,
      'Next.js': /\bnext\.?js\b/,
      'TypeScript': /\btypescript\b|\bts\b/,
      'Node.js': /\bnode\.?js\b/,
      'Express': /\bexpress\b/,
      'MongoDB': /\bmongodb\b/,
      'PostgreSQL': /\bpostgresql\b|\bpostgres\b/,
      'Tailwind': /\btailwind\b/,
      'API': /\bapi\b|\brest\b/,
      'Claude': /\bclaude\b/,
      'AI': /\bai\b|\bartificial intelligence\b/
    };

    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        tech.add(name);
      }
    }

    return Array.from(tech);
  }

  extractTechnologiesFromText(content) {
    const tech = new Set();
    const lower = content.toLowerCase();
    
    const patterns = {
      'React': /\breact\b/,
      'Next.js': /\bnext\.?js\b/,
      'TypeScript': /\btypescript\b/,
      'Node.js': /\bnode\.?js\b/,
      'Express': /\bexpress\b/,
      'MongoDB': /\bmongodb\b/,
      'PostgreSQL': /\bpostgresql\b|\bpostgres\b/,
      'Tailwind': /\btailwind\b/,
      'API': /\bapi\b|\brest api\b/,
      'Claude': /\bclaude\b/
    };

    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(lower)) {
        tech.add(name);
      }
    }

    return Array.from(tech);
  }

  identifyAchievements(session) {
    const achievements = [];
    const metrics = session.metrics || {};

    if (metrics.files_modified >= 5) {
      achievements.push('Multi-file project');
    }
    if (metrics.commands_executed >= 10) {
      achievements.push('Complex workflow');
    }
    if (metrics.errors_encountered === 0 && metrics.commands_executed > 0) {
      achievements.push('Error-free development');
    }
    if (this.calculateDuration(session).minutes <= 30) {
      achievements.push('Rapid development');
    }
    if (session.technologies && session.technologies.length >= 3) {
      achievements.push('Multi-tech stack');
    }

    return achievements;
  }

  assessTutorialPotential(session) {
    let score = 0;
    const metrics = session.metrics || {};

    if (this.calculateDuration(session).minutes >= 5 && this.calculateDuration(session).minutes <= 30) {
      score += 30;
    }
    if (metrics.files_modified >= 2 && metrics.files_modified <= 10) {
      score += 25;
    }
    if (metrics.errors_encountered === 0) {
      score += 20;
    }
    if (metrics.commands_executed >= 5 && metrics.commands_executed <= 20) {
      score += 15;
    }
    if (session.technologies && session.technologies.length >= 2) {
      score += 10;
    }

    return {
      score,
      rating: score >= 70 ? 'excellent' : score >= 50 ? 'good' : score >= 30 ? 'moderate' : 'low',
      suitable: score >= 50
    };
  }

  assessMarkdownTutorialPotential(content) {
    let score = 0;

    const codeBlocks = (content.match(/```/g) || []).length / 2;
    const headers = (content.match(/^#+\s/gm) || []).length;
    const wordCount = content.split(/\s+/).length;

    if (wordCount >= 500 && wordCount <= 3000) score += 30;
    if (codeBlocks >= 3 && codeBlocks <= 15) score += 25;
    if (headers >= 5 && headers <= 15) score += 20;
    if (content.includes('step') || content.includes('first') || content.includes('then')) score += 15;
    if (content.toLowerCase().includes('build') || content.toLowerCase().includes('create')) score += 10;

    return {
      score,
      rating: score >= 70 ? 'excellent' : score >= 50 ? 'good' : score >= 30 ? 'moderate' : 'low',
      suitable: score >= 50
    };
  }

  calculateCaseStudyScore(session) {
    let score = 0;

    if (this.calculateDuration(session).minutes >= 10) score += 20;
    if (session.metrics && session.metrics.files_modified >= 5) score += 20;
    if (session.achievements && session.achievements.length >= 2) score += 20;
    if (session.technologies && session.technologies.length >= 3) score += 20;
    if (session.metrics && session.metrics.commands_executed >= 15) score += 20;

    return {
      score,
      suitable: score >= 60
    };
  }

  calculateMarkdownCaseStudyScore(content) {
    let score = 0;

    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 1000) score += 30;
    if ((content.match(/```/g) || []).length / 2 >= 5) score += 20;
    if (content.toLowerCase().includes('result') || content.toLowerCase().includes('outcome')) score += 20;
    if (content.toLowerCase().includes('challenge') || content.toLowerCase().includes('problem')) score += 15;
    if (content.toLowerCase().includes('solution')) score += 15;

    return {
      score,
      suitable: score >= 60
    };
  }

  estimateDurationFromMarkdown(content) {
    const wordCount = content.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 200);
    return { minutes: estimatedMinutes, formatted: `~${estimatedMinutes} minutes` };
  }

  assessComplexity(content) {
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    const headers = (content.match(/^#+\s/gm) || []).length;
    const score = codeBlocks * 2 + headers;

    if (score >= 30) return 'high';
    if (score >= 15) return 'medium';
    return 'low';
  }

  async analyzeAllSessions() {
    console.log('🔍 Searching for session exports...');
    const sessionFiles = await this.findSessionExports();
    
    if (sessionFiles.length === 0) {
      console.log('ℹ️  No session exports found');
      return {
        total_sessions: 0,
        analyses: [],
        recommendations: {
          blog_worthy: [],
          youtube_worthy: [],
          case_study_worthy: []
        }
      };
    }

    console.log(`📊 Analyzing ${sessionFiles.length} sessions...`);
    const analyses = [];

    for (const file of sessionFiles) {
      try {
        const analysis = await this.analyzeSession(file);
        analyses.push(analysis);
      } catch (error) {
        console.error(`⚠️  Error analyzing ${path.basename(file)}:`, error.message);
      }
    }

    const recommendations = this.generateRecommendations(analyses);

    return {
      total_sessions: analyses.length,
      analyzed_at: new Date().toISOString(),
      analyses,
      recommendations
    };
  }

  generateRecommendations(analyses) {
    return {
      blog_worthy: analyses
        .filter(a => a.tutorial_potential && a.tutorial_potential.suitable)
        .sort((a, b) => b.tutorial_potential.score - a.tutorial_potential.score)
        .slice(0, 5)
        .map(a => ({
          file: path.basename(a.filepath),
          score: a.tutorial_potential.score,
          technologies: a.technologies
        })),
      
      youtube_worthy: analyses
        .filter(a => a.tutorial_potential && a.tutorial_potential.score >= 70)
        .sort((a, b) => b.tutorial_potential.score - a.tutorial_potential.score)
        .slice(0, 3)
        .map(a => ({
          file: path.basename(a.filepath),
          score: a.tutorial_potential.score,
          technologies: a.technologies,
          duration: a.duration || a.metrics?.estimated_duration
        })),
      
      case_study_worthy: analyses
        .filter(a => a.case_study_score && a.case_study_score.suitable)
        .sort((a, b) => b.case_study_score.score - a.case_study_score.score)
        .slice(0, 3)
        .map(a => ({
          file: path.basename(a.filepath),
          score: a.case_study_score.score,
          technologies: a.technologies,
          achievements: a.achievements
        }))
    };
  }

  async saveAnalysis(analysis, filename) {
    await fs.mkdir(this.dataDir, { recursive: true });
    const filepath = path.join(this.dataDir, filename);
    await fs.writeFile(filepath, JSON.stringify(analysis, null, 2));
    console.log(`✅ Analysis saved to ${filepath}`);
    return filepath;
  }
}

async function main() {
  const analyzer = new SessionAnalyzer();
  
  try {
    const results = await analyzer.analyzeAllSessions();
    
    console.log('\n📈 Analysis Results:');
    console.log(`  Total Sessions: ${results.total_sessions}`);
    console.log(`  Blog-Worthy: ${results.recommendations.blog_worthy.length}`);
    console.log(`  YouTube-Worthy: ${results.recommendations.youtube_worthy.length}`);
    console.log(`  Case Study-Worthy: ${results.recommendations.case_study_worthy.length}`);
    
    if (results.recommendations.youtube_worthy.length > 0) {
      console.log('\n🎬 Top YouTube Candidates:');
      results.recommendations.youtube_worthy.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.file} (score: ${item.score}) - ${item.technologies.join(', ')}`);
      });
    }
    
    const filename = `session-analysis-${Date.now()}.json`;
    await analyzer.saveAnalysis(results, filename);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SessionAnalyzer;
