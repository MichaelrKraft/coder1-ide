const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class GitDocsPublisher {
  constructor(repoPath) {
    this.repoPath = repoPath || path.join(__dirname, '../../coder1-ide-next/docs');
  }

  async publishDocumentation(docContent, targetPath, commitMessage) {
    console.log(`📚 Publishing documentation to: ${targetPath}`);

    const fullPath = path.join(this.repoPath, targetPath);
    
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      await fs.writeFile(fullPath, docContent);
      console.log(`✅ File written: ${fullPath}`);

      const gitCommit = await this.commitAndPush(fullPath, commitMessage);
      
      return {
        success: true,
        file_path: fullPath,
        committed: gitCommit.success
      };
    } catch (error) {
      console.error(`❌ Error publishing documentation:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async commitAndPush(filePath, message) {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      
      await execAsync(`git add "${relativePath}"`);
      console.log(`   ✓ Added to git: ${relativePath}`);

      const commitMsg = message || `docs: Update ${path.basename(filePath)}`;
      await execAsync(`git commit -m "${commitMsg}"`);
      console.log(`   ✓ Committed: ${commitMsg}`);

      return {
        success: true,
        message: 'Documentation committed to git'
      };
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        console.log(`   ℹ️  No changes to commit`);
        return { success: true, message: 'No changes' };
      }
      
      console.log(`   ⚠️  Could not commit to git: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async publishBatch(docs) {
    console.log(`\n📚 Publishing ${docs.length} documentation files...\n`);

    const results = [];
    
    for (const doc of docs) {
      const targetPath = this.determineTargetPath(doc);
      const result = await this.publishDocumentation(
        doc.content,
        targetPath,
        `docs: Update ${doc.doc_type} for ${doc.source_file}`
      );
      
      results.push({
        source: doc.source_file,
        target: targetPath,
        ...result
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      total: docs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  determineTargetPath(doc) {
    const docType = doc.doc_type || 'reference';
    const sourceFile = doc.source_file || 'unknown';
    
    const basename = path.basename(sourceFile, path.extname(sourceFile));
    const filename = `${basename}.md`;

    const typeDirectories = {
      'api': 'api',
      'component': 'components',
      'guide': 'guides',
      'reference': 'reference'
    };

    const dir = typeDirectories[docType] || 'reference';
    return path.join(dir, filename);
  }
}

async function main() {
  const publisher = new GitDocsPublisher();

  const testDoc = {
    source_file: '/path/to/test-component.tsx',
    doc_type: 'component',
    content: `# Test Component

## Overview

This is test documentation.

## Usage

\`\`\`tsx
<TestComponent prop="value" />
\`\`\`

---

*📚 Auto-generated documentation*
`
  };

  try {
    console.log('🚀 Testing Git Docs Publisher...\n');
    
    const result = await publisher.publishDocumentation(
      testDoc.content,
      'test/test-component.md',
      'docs: Add test component documentation'
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

module.exports = GitDocsPublisher;
