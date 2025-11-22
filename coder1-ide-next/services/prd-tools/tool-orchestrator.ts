/**
 * PRD Tool Orchestrator
 * 
 * Coordinates the end-to-end PRD generation workflow using Claude tools.
 * Replaces template-based generation with intelligent, evidence-based content.
 * 
 * Workflow:
 *   1. Analyze answers → Deep insights
 *   2. Gather evidence → Market data (Professional mode only)
 *   3. Generate sections → Parallel execution
 *   4. Score quality → Validation
 *   5. Enhance if needed → Improvement loop
 */

import {
  ToolExecutor,
  analyzeAnswers,
  gatherEvidence,
  scorePRDQuality,
  estimateToolCost,
  type ToolExecutionResult
} from './tool-executor';
import {
  SimpleAPIExecutor,
  convertToSectionContent
} from './simple-api-executor';
import type {
  AnalysisInsights,
  MarketEvidence,
  SectionContent,
  QualityScore
} from './tool-definitions';

export interface PRDGenerationOptions {
  mode: 'quick' | 'professional';
  pattern: string;
  includeEvidence?: boolean;
  targetQuality?: number;
  maxEnhancementLoops?: number;
}

export interface PRDGenerationResult {
  success: boolean;
  prd?: string;
  metadata?: {
    insights: AnalysisInsights;
    evidence?: MarketEvidence;
    sections: Record<string, SectionContent>;
    quality: QualityScore;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    duration: number;
    enhancementLoops: number;
  };
  error?: string;
}

export class PRDOrchestrator {
  private executor: ToolExecutor;
  private simpleExecutor: SimpleAPIExecutor;
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.executor = new ToolExecutor(apiKey);
    this.simpleExecutor = new SimpleAPIExecutor(apiKey);
  }
  
  /**
   * Generate complete PRD using tool-based workflow
   */
  async generatePRD(
    answers: any,
    options: PRDGenerationOptions
  ): Promise<PRDGenerationResult> {
    const startTime = Date.now();
    this.executor.resetTokenUsage();
    
    try {
      // Step 1: Deep answer analysis
      console.log('🧠 Step 1: Analyzing answers with extended thinking...');
      const analysisResult = await analyzeAnswers(
        this.executor,
        answers,
        options.pattern,
        options.mode
      );
      
      if (!analysisResult.success) {
        return { success: false, error: analysisResult.error };
      }
      
      const insights = analysisResult.data!;
      console.log(`✅ Analysis complete (${analysisResult.metadata.tokensUsed.total} tokens)`);
      
      // Step 2: Evidence gathering (Professional mode or if explicitly requested)
      let evidence: MarketEvidence | undefined;
      
      if (options.mode === 'professional' || options.includeEvidence) {
        console.log('🔍 Step 2: Gathering market evidence and competitive intelligence...');
        
        const category = this.extractCategory(answers);
        const competitors = this.extractCompetitors(answers, insights);
        
        const evidenceResult = await gatherEvidence(
          this.executor,
          insights,
          category,
          competitors
        );
        
        if (evidenceResult.success) {
          evidence = evidenceResult.data!;
          console.log(`✅ Evidence gathered (${evidenceResult.metadata.tokensUsed.total} tokens)`);
        } else {
          console.log('⚠️ Evidence gathering failed, continuing without evidence');
        }
      } else {
        console.log('⏭️  Step 2: Skipping evidence gathering (Quick mode)');
      }
      
      // Step 3: Generate all sections in parallel
      console.log('📝 Step 3: Generating PRD sections in parallel...');
      const sections = await this.generateAllSections(insights, options.pattern, evidence);
      console.log(`✅ Sections generated (${Object.keys(sections).length} sections)`);
      
      // Step 4: Compile PRD
      const prd = this.compilePRD(sections, insights, evidence, options);
      console.log('📄 Step 4: PRD compiled');
      
      // Step 5: Quality scoring
      console.log('⭐ Step 5: Scoring PRD quality...');
      const qualityResult = await scorePRDQuality(this.executor, prd);
      
      if (!qualityResult.success) {
        console.log('⚠️ Quality scoring failed, skipping validation');
      }
      
      const quality = qualityResult.data!;
      console.log(`✅ Quality score: ${quality.overall_score}/10`);
      
      // Step 6: Enhancement loop if quality below target
      let enhancementLoops = 0;
      let enhancedPRD = prd;
      const targetQuality = options.targetQuality || 8.0;
      const maxLoops = options.maxEnhancementLoops || 2;
      
      if (quality.overall_score < targetQuality && enhancementLoops < maxLoops) {
        console.log(`🔧 Step 6: Quality below target (${quality.overall_score} < ${targetQuality}), enhancing weak sections...`);
        enhancedPRD = await this.enhanceWeakSections(
          enhancedPRD,
          quality.weak_sections,
          sections,
          insights,
          evidence,
          options.pattern
        );
        enhancementLoops++;
        console.log(`✅ Enhancement complete (loop ${enhancementLoops})`);
      } else {
        console.log(`✅ Step 6: Quality meets target (${quality.overall_score} >= ${targetQuality})`);
      }
      
      // Calculate final metrics
      const duration = Date.now() - startTime;
      const tokensUsed = this.executor.getTokenUsage();
      const cost = estimateToolCost(tokensUsed);
      
      console.log(`\n📊 Generation Summary:
  - Duration: ${duration}ms
  - Tokens: ${tokensUsed.total} (input: ${tokensUsed.input}, output: ${tokensUsed.output})
  - Cost: $${cost.toFixed(4)}
  - Quality: ${quality.overall_score}/10
  - Enhancement loops: ${enhancementLoops}`);
      
      return {
        success: true,
        prd: enhancedPRD,
        metadata: {
          insights,
          evidence,
          sections,
          quality,
          tokensUsed,
          cost,
          duration,
          enhancementLoops
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const tokensUsed = this.executor.getTokenUsage();
      
      console.error('❌ PRD generation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          insights: {} as AnalysisInsights,
          sections: {},
          quality: {} as QualityScore,
          tokensUsed,
          cost: estimateToolCost(tokensUsed),
          duration,
          enhancementLoops: 0
        }
      };
    }
  }
  
  /**
   * Generate all PRD sections in parallel using simple API calls
   */
  private async generateAllSections(
    insights: AnalysisInsights,
    pattern: string,
    evidence?: MarketEvidence
  ): Promise<Record<string, SectionContent>> {
    const sectionNames = [
      'executive_summary',
      'problem_statement',
      'solution_overview',
      'core_features',
      'technical_architecture',
      'implementation_roadmap'
    ];
    
    // Use simple API executor instead of tool use
    console.log(`📝 Generating ${sectionNames.length} sections using direct API calls...`);
    
    const results = await this.simpleExecutor.generateSectionsParallel(
      sectionNames.map(section => ({
        section,
        insights,
        pattern,
        evidence
      }))
    );
    
    const sections: Record<string, SectionContent> = {};
    
    for (let i = 0; i < sectionNames.length; i++) {
      const sectionName = sectionNames[i];
      const result = results[i];
      
      // Convert simple API result to SectionContent format
      sections[sectionName] = convertToSectionContent(result, sectionName);
      
      if (result.success) {
        console.log(`✅ Section '${sectionName}': ${sections[sectionName].word_count} words`);
      } else {
        console.error(`❌ Section '${sectionName}' failed:`, result.error);
      }
    }
    
    // Update total token usage from simple executor
    const simpleTokens = this.simpleExecutor.getTokenUsage();
    console.log(`📊 Section generation tokens: ${simpleTokens.total} (${simpleTokens.input} in, ${simpleTokens.output} out)`);
    
    return sections;
  }
  
  /**
   * Compile sections into complete PRD document
   */
  private compilePRD(
    sections: Record<string, SectionContent>,
    insights: AnalysisInsights,
    evidence: MarketEvidence | undefined,
    options: PRDGenerationOptions
  ): string {
    const productName = this.extractProductName(insights);
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let prd = `# Product Requirements Document\n\n`;
    prd += `## ${productName}\n\n`;
    prd += `*Generated: ${date}*  \n`;
    prd += `*Pattern: ${options.pattern}*  \n`;
    prd += `*Mode: ${options.mode === 'quick' ? 'Quick (5-8 pages)' : 'Professional (15-20 pages)'}*\n\n`;
    prd += `---\n\n`;
    
    // Add each section
    for (const [sectionName, sectionData] of Object.entries(sections)) {
      prd += sectionData.content + '\n\n---\n\n';
    }
    
    // Add evidence section if available
    if (evidence) {
      prd += this.compileEvidenceSection(evidence);
    }
    
    // Add footer
    prd += `\n\n*This PRD was generated using AI-powered analysis with pattern-specific best practices.*\n`;
    prd += `*Ready for implementation in Coder1 IDE.*\n`;
    
    return prd;
  }
  
  /**
   * Enhance weak sections based on quality feedback
   */
  private async enhanceWeakSections(
    prd: string,
    weakSections: string[],
    sections: Record<string, SectionContent>,
    insights: AnalysisInsights,
    evidence: MarketEvidence | undefined,
    pattern: string
  ): Promise<string> {
    // Re-generate weak sections using simple API
    for (const weakSection of weakSections) {
      console.log(`  🔧 Enhancing section: ${weakSection}`);
      
      const result = await this.simpleExecutor.generateSection(
        weakSection,
        insights,
        pattern,
        evidence
      );
      
      sections[weakSection] = convertToSectionContent(result, weakSection);
    }
    
    // Recompile PRD with enhanced sections
    return this.compilePRD(
      sections,
      insights,
      evidence,
      { mode: 'professional', pattern }
    );
  }
  
  /**
   * Helper functions
   */
  
  private extractProductName(insights: AnalysisInsights): string {
    // Extract from insights or default
    return insights.marketPosition?.category || 'Product Name';
  }
  
  private extractCategory(answers: any): string {
    return answers.category || answers['product-category'] || 'software product';
  }
  
  private extractCompetitors(answers: any, insights: AnalysisInsights): string[] {
    const fromAnswers = answers.competitors || [];
    const fromInsights = insights.competitive?.landscape?.map((c: any) => c.name) || [];
    
    return [...new Set([...fromAnswers, ...fromInsights])].slice(0, 5);
  }
  
  private formatSectionName(sectionName: string): string {
    return sectionName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  private compileEvidenceSection(evidence: MarketEvidence): string {
    let section = `## Appendix: Market Evidence\n\n`;
    
    section += `### Market Data\n`;
    section += `- **Size**: ${evidence.marketData.size}\n`;
    section += `- **Growth**: ${evidence.marketData.growth}\n`;
    section += `- **Trends**: ${evidence.marketData.trends.join(', ')}\n\n`;
    
    if (evidence.competitive.landscape.length > 0) {
      section += `### Competitive Landscape\n\n`;
      for (const comp of evidence.competitive.landscape) {
        section += `**${comp.name}**\n`;
        section += `- Strengths: ${comp.strengths.join(', ')}\n`;
        section += `- Weaknesses: ${comp.weaknesses.join(', ')}\n`;
        section += `- Pricing: ${comp.pricing}\n\n`;
      }
    }
    
    section += `---\n\n`;
    
    return section;
  }
}

/**
 * Convenience function for quick PRD generation
 */
export async function generatePRDWithTools(
  apiKey: string,
  answers: any,
  options: PRDGenerationOptions
): Promise<PRDGenerationResult> {
  const orchestrator = new PRDOrchestrator(apiKey);
  return orchestrator.generatePRD(answers, options);
}
