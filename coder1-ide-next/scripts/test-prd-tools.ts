/**
 * PRD Tool-Based Generation Test Script
 * 
 * Tests the new tool-based PRD generation system and compares:
 * - Token usage (target: 93% reduction from 42,500 to ~3,000)
 * - Quality scores (target: 8.0+/10 vs 3-4/10)
 * - Generation time
 * - Cost per PRD
 */

import { PRDOrchestrator } from '../services/prd-tools/tool-orchestrator';
import type { PRDGenerationOptions } from '../services/prd-tools/tool-orchestrator';

// Sample questionnaire answers for testing
const SAMPLE_ANSWERS = {
  'product-name': 'TaskFlow Pro',
  'problem-statement': 'Developers struggle with managing complex tasks across multiple projects, leading to missed deadlines and context switching overhead',
  'target-market': 'Software development teams (5-50 developers)',
  'core-differentiator': 'AI-powered task prioritization with real-time collaboration',
  'revenue-model': 'subscription',
  'launch-timeline': '4 months'
};

async function testToolBasedGeneration() {
  console.log('🚀 Testing PRD Tool-Based Generation System\n');
  console.log('='.repeat(70));
  
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set in environment');
    console.log('\nSet your API key:');
    console.log('  export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }
  
  console.log('✅ API key found\n');
  
  // Test Quick Mode
  console.log('📊 Test 1: Quick Mode Generation');
  console.log('-'.repeat(70));
  
  try {
    const orchestrator = new PRDOrchestrator(apiKey);
    
    const quickOptions: PRDGenerationOptions = {
      mode: 'quick',
      pattern: 'linear-project-mgmt',
      includeEvidence: false,
      targetQuality: 7.0,
      sectionsToGenerate: [
        'executive_summary',
        'problem_statement',
        'solution_overview',
        'target_audience',
        'core_features',
        'technical_architecture'
      ]
    };
    
    console.log('⏱️  Starting generation...\n');
    const startTime = Date.now();
    
    const result = await orchestrator.generatePRD(SAMPLE_ANSWERS, quickOptions);
    
    const duration = Date.now() - startTime;
    
    if (!result.success) {
      console.error('❌ Generation failed:', result.error);
      return;
    }
    
    console.log('✅ Generation successful!\n');
    
    // Display metrics
    console.log('📈 METRICS:');
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Tokens: ${result.metadata?.tokensUsed?.total || 0}`);
    console.log(`   Cost: $${result.metadata?.cost?.toFixed(4) || '0.00'}`);
    console.log(`   Quality: ${result.metadata?.quality?.overall_score?.toFixed(1) || 'N/A'}/10`);
    console.log(`   Word Count: ${result.prd?.split(/\s+/).filter(w => w.length > 0).length || 0}`);
    
    // Display quality breakdown
    if (result.metadata?.quality?.dimension_scores) {
      console.log('\n📊 QUALITY SCORES:');
      Object.entries(result.metadata.quality.dimension_scores).forEach(([dim, score]) => {
        if (score !== undefined) {
          const emoji = score >= 8 ? '🟢' : score >= 6 ? '🟡' : '🔴';
          console.log(`   ${emoji} ${dim}: ${score.toFixed(1)}/10`);
        }
      });
    }
    
    // Compare to baseline
    console.log('\n📊 COMPARISON TO BASELINE:');
    console.log('   Template Generation:');
    console.log('     Tokens: ~42,500');
    console.log('     Cost: ~$0.21');
    console.log('     Quality: 3-4/10');
    console.log('     Time: Instant (but poor quality)');
    console.log('\n   Tool-Based Generation:');
    console.log(`     Tokens: ${result.metadata?.tokensUsed?.total || 0}`);
    console.log(`     Cost: $${result.metadata?.cost?.toFixed(4) || '0.00'}`);
    console.log(`     Quality: ${result.metadata?.quality?.overall_score?.toFixed(1) || 'N/A'}/10`);
    console.log(`     Time: ${(duration / 1000).toFixed(1)}s`);
    
    // Calculate improvements
    const tokenReduction = ((42500 - (result.metadata?.tokensUsed?.total || 0)) / 42500 * 100).toFixed(1);
    const costSavings = ((0.21 - (result.metadata?.cost || 0)) / 0.21 * 100).toFixed(1);
    
    console.log('\n✨ IMPROVEMENTS:');
    console.log(`   Token Reduction: ${tokenReduction}%`);
    console.log(`   Cost Savings: ${costSavings}%`);
    console.log(`   Quality Improvement: ${((result.metadata?.quality?.overall_score || 0) / 3.5 * 100 - 100).toFixed(0)}%`);
    
    // Show weak sections if any
    if (result.metadata?.quality?.weak_sections && result.metadata.quality.weak_sections.length > 0) {
      console.log('\n⚠️  WEAK SECTIONS (for improvement):');
      result.metadata.quality.weak_sections.forEach((section: string) => {
        console.log(`   - ${section.replace(/_/g, ' ')}`);
      });
    }
    
    // Show strengths
    if (result.metadata?.quality?.strengths && result.metadata.quality.strengths.length > 0) {
      console.log('\n✅ STRENGTHS:');
      result.metadata.quality.strengths.slice(0, 3).forEach((strength: string) => {
        console.log(`   - ${strength}`);
      });
    }
    
    // Save PRD to file
    const fs = require('fs');
    const path = require('path');
    const testOutputDir = path.join(__dirname, '../test-output');
    
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    
    const outputFile = path.join(testOutputDir, `prd-test-${Date.now()}.md`);
    fs.writeFileSync(outputFile, result.prd);
    
    console.log(`\n💾 PRD saved to: ${outputFile}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 Test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('\nError details:', error.message);
      console.error('\nStack:', error.stack);
    }
    
    process.exit(1);
  }
}

// Run the test
testToolBasedGeneration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
