/**
 * DeepContext File Search API
 * Provides real file searching capabilities for the DeepContext panel
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface SearchResult {
  file: string;
  line: number;
  content: string;
  relevance: number;
  context?: string;
  type?: 'function' | 'class' | 'variable' | 'import' | 'comment';
}

// File extensions to search
const SEARCHABLE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json', 
  '.md', '.css', '.scss', '.html', '.py',
  '.java', '.cpp', '.c', '.h', '.go', '.rs'
];

// Directories to exclude from search
const EXCLUDED_DIRS = [
  'node_modules', '.git', '.next', 'dist', 
  'build', 'out', 'coverage', '.cache',
  'vendor', 'tmp', 'temp', 'ARCHIVE',
  'backups', 'exports', 'summaries'
];

export async function POST(req: NextRequest) {
  try {
    const { query, maxResults = 20, fileTypes = [] } = await req.json();
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get the project root (coder1-ide-next directory, but excluding heavy dirs)  
    const projectRoot = process.cwd();
    
    // Special handling for "how many" queries
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('how many') && (lowerQuery.includes('.md') || lowerQuery.includes('md files'))) {
      return await handleFileCountQuery(projectRoot, '.md');
    }
    
    // Add timeout protection for all other searches
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout after 10 seconds')), 10000);
    });
    
    const searchPromise = searchFiles(projectRoot, query.toLowerCase(), maxResults, fileTypes);
    
    // Race between search and timeout
    const results = await Promise.race([searchPromise, timeoutPromise]) as any[];
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    // Limit results
    const limitedResults = results.slice(0, maxResults);
    
    return NextResponse.json(limitedResults);
  } catch (error) {
    console.error('File search error:', error);
    return NextResponse.json(
      { error: 'Failed to search files', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleFileCountQuery(rootDir: string, fileExtension: string) {
  const files: string[] = [];
  
  async function walkForCount(currentPath: string, depth = 0) {
    if (depth > 10) return; // Prevent infinite recursion
    
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!EXCLUDED_DIRS.includes(entry.name)) {
            await walkForCount(fullPath, depth + 1);
          }
        } else if (entry.isFile() && entry.name.endsWith(fileExtension)) {
          const relativePath = path.relative(rootDir, fullPath);
          files.push(relativePath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await walkForCount(rootDir);
  
  // Create summary result
  const result = {
    file: 'FILE_COUNT_SUMMARY',
    line: 1,
    content: `Found ${files.length} ${fileExtension} files in the project`,
    relevance: 1.0,
    context: files.slice(0, 10).join(', ') + (files.length > 10 ? '...' : ''),
    type: 'summary' as const
  };
  
  return NextResponse.json([result]);
}

async function searchFiles(
  dir: string, 
  query: string, 
  maxResults: number,
  fileTypes: string[]
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  let filesProcessed = 0;
  const MAX_FILES_TO_PROCESS = 100; // Limit total files processed
  
  async function walkDirectory(currentPath: string, depth = 0) {
    if (results.length >= maxResults || filesProcessed >= MAX_FILES_TO_PROCESS || depth > 8) return;
    
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!EXCLUDED_DIRS.includes(entry.name)) {
            await walkDirectory(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          filesProcessed++;
          const ext = path.extname(entry.name);
          
          // Check if file type matches filter
          if (fileTypes.length > 0 && !fileTypes.includes(ext.slice(1))) {
            continue;
          }
          
          // Check if file has searchable extension
          if (SEARCHABLE_EXTENSIONS.includes(ext)) {
            const fileResults = await searchInFile(fullPath, query, dir);
            results.push(...fileResults);
          }
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
      console.log(`Skipping ${currentPath}: ${error}`);
    }
  }
  
  await walkDirectory(dir, 0);
  console.log(`Search completed: processed ${filesProcessed} files, found ${results.length} results`);
  return results;
}

async function searchInFile(filePath: string, query: string, rootDir: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(rootDir, filePath);
    
    // Create regex for flexible matching
    const searchRegex = new RegExp(query.split(/\s+/).join('.*'), 'i');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineLower = line.toLowerCase();
      
      // Check for matches
      let relevance = 0;
      let matchType: SearchResult['type'] = undefined;
      
      // Exact match
      if (lineLower.includes(query)) {
        relevance = 1.0;
      }
      // Regex match (flexible)
      else if (searchRegex.test(line)) {
        relevance = 0.8;
      }
      // Word boundary match
      else if (new RegExp(`\\b${query}\\b`, 'i').test(line)) {
        relevance = 0.9;
      }
      
      if (relevance > 0) {
        // Determine match type
        if (line.match(/^\s*(function|const|let|var|class|interface|type|enum)/)) {
          matchType = line.includes('function') ? 'function' : 
                     line.includes('class') ? 'class' : 'variable';
        } else if (line.match(/^\s*(import|require|from)/)) {
          matchType = 'import';
        } else if (line.match(/^\s*(\/\/|\/\*|\*|#)/)) {
          matchType = 'comment';
        }
        
        // Get context (surrounding lines)
        const contextStart = Math.max(0, index - 1);
        const contextEnd = Math.min(lines.length - 1, index + 1);
        const contextLines = lines.slice(contextStart, contextEnd + 1);
        
        results.push({
          file: '/' + relativePath.replace(/\\/g, '/'),
          line: lineNumber,
          content: line.trim().substring(0, 200),
          relevance,
          context: contextLines.join('\n').substring(0, 300),
          type: matchType
        });
      }
    });
  } catch (error) {
    // Silently skip files we can't read
    console.log(`Cannot read file ${filePath}: ${error}`);
  }
  
  return results;
}

// GET endpoint for status check
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    capabilities: ['file-search', 'regex-search', 'context-extraction'],
    searchableExtensions: SEARCHABLE_EXTENSIONS,
    excludedDirectories: EXCLUDED_DIRS
  });
}