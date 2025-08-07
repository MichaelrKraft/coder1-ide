const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Get project root directory
const getProjectRoot = () => {
  return process.cwd();
};

// File extensions to include in search
const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.css', '.scss', '.html',
  '.vue', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.php',
  '.rb', '.sh', '.yml', '.yaml', '.xml', '.sql', '.env', '.gitignore'
];

// Directories to exclude from search
const EXCLUDED_DIRS = [
  'node_modules', '.git', '.next', 'build', 'dist', 'coverage', 
  '.nyc_output', 'logs', '.cache', '.tmp', '.temp'
];

/**
 * Recursively scan directory for files
 */
async function scanDirectory(dirPath, relativePath = '') {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDED_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        
        // Add directory
        files.push({
          path: relativeFilePath,
          name: entry.name,
          type: 'directory'
        });
        
        // Recursively scan subdirectory
        const subFiles = await scanDirectory(fullPath, relativeFilePath);
        files.push(...subFiles);
        
      } else if (entry.isFile()) {
        // Check if file extension is supported
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext) || entry.name.startsWith('.')) {
          files.push({
            path: relativeFilePath,
            name: entry.name,
            type: 'file'
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Build hierarchical file tree
 */
async function buildFileTree(dirPath, relativePath = '') {
  const children = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories  
        if (EXCLUDED_DIRS.includes(entry.name)) {
          continue;
        }
        
        // Recursively build tree for directories
        const subTree = await buildFileTree(fullPath, relativeFilePath);
        children.push({
          name: entry.name,
          path: relativeFilePath,
          type: 'directory',
          children: subTree
        });
        
      } else if (entry.isFile()) {
        // Include all files for the tree view
        children.push({
          name: entry.name,
          path: relativeFilePath,
          type: 'file',
          extension: path.extname(entry.name).slice(1)
        });
      }
    }
  } catch (error) {
    console.error(`Error building file tree for ${dirPath}:`, error);
  }
  
  // Sort: directories first, then files, alphabetically
  children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  return children;
}

/**
 * GET /api/files/list
 * Returns list of all files in the project
 */
router.get('/list', async (req, res) => {
  try {
    const projectRoot = getProjectRoot();
    const files = await scanDirectory(projectRoot);
    
    // Sort files: directories first, then files, alphabetically
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json({
      success: true,
      files,
      totalFiles: files.filter(f => f.type === 'file').length,
      totalDirectories: files.filter(f => f.type === 'directory').length
    });
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files'
    });
  }
});

/**
 * GET /api/files/preview?path=<file-path>
 * Returns preview of file content (first 1000 characters)
 */
router.get('/preview', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }
    
    const projectRoot = getProjectRoot();
    const fullPath = path.resolve(projectRoot, filePath);
    
    // Security check: ensure file is within project directory
    if (!fullPath.startsWith(projectRoot)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        return res.json({
          success: true,
          preview: '[Directory]',
          isDirectory: true
        });
      }
      
      // Check file size (limit to 100KB for preview)
      if (stats.size > 100 * 1024) {
        return res.json({
          success: true,
          preview: '[File too large for preview]',
          size: stats.size
        });
      }
      
      // Check if file is binary
      const ext = path.extname(filePath).toLowerCase();
      const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tar', '.gz'];
      
      if (binaryExtensions.includes(ext)) {
        return res.json({
          success: true,
          preview: '[Binary file]',
          isBinary: true
        });
      }
      
      // Read file content
      let content = await fs.readFile(fullPath, 'utf8');
      
      // Limit preview to first 1000 characters
      if (content.length > 1000) {
        content = content.substring(0, 1000) + '...';
      }
      
      res.json({
        success: true,
        preview: content,
        size: stats.size,
        lastModified: stats.mtime
      });
      
    } catch (fileError) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
  } catch (error) {
    console.error('Error loading file preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load file preview'
    });
  }
});

/**
 * POST /api/files/search
 * Advanced file search with filters
 */
router.post('/search', async (req, res) => {
  try {
    const { query, extensions, includeContent } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const projectRoot = getProjectRoot();
    const files = await scanDirectory(projectRoot);
    
    // Filter by extensions if provided
    let filteredFiles = files;
    if (extensions && extensions.length > 0) {
      filteredFiles = files.filter(file => {
        if (file.type === 'directory') return true;
        const ext = path.extname(file.name).toLowerCase();
        return extensions.includes(ext);
      });
    }
    
    // Search in file names and optionally content
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const file of filteredFiles) {
      const matchInName = file.name.toLowerCase().includes(queryLower);
      let matchInContent = false;
      
      if (includeContent && file.type === 'file') {
        try {
          const fullPath = path.resolve(projectRoot, file.path);
          const stats = await fs.stat(fullPath);
          
          // Only search in small text files
          if (stats.size < 50 * 1024) { // 50KB limit
            const content = await fs.readFile(fullPath, 'utf8');
            matchInContent = content.toLowerCase().includes(queryLower);
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
      
      if (matchInName || matchInContent) {
        results.push({
          ...file,
          matchType: matchInName ? 'name' : 'content'
        });
      }
    }
    
    res.json({
      success: true,
      results,
      query,
      totalResults: results.length
    });
    
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search files'
    });
  }
});

/**
 * GET /api/files/tree
 * Returns hierarchical file tree
 */
router.get('/tree', async (req, res) => {
  try {
    const projectRoot = getProjectRoot();
    const tree = await buildFileTree(projectRoot);
    
    res.json({
      success: true,
      tree: {
        name: path.basename(projectRoot),
        path: '/',
        type: 'directory',
        children: tree
      }
    });
    
  } catch (error) {
    console.error('Error building file tree:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build file tree'
    });
  }
});

/**
 * GET /api/files/read
 * Read full file content
 */
router.get('/read', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }
    
    const projectRoot = getProjectRoot();
    const fullPath = path.resolve(projectRoot, filePath);
    
    // Security check
    if (!fullPath.startsWith(projectRoot)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      console.error(`File not found: ${fullPath} (requested path: ${filePath})`);
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({
      success: true,
      content,
      path: filePath
    });
    
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read file'
    });
  }
});

/**
 * POST /api/files/write
 * Write file content
 */
router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'File path and content are required'
      });
    }
    
    const projectRoot = getProjectRoot();
    const fullPath = path.resolve(projectRoot, filePath);
    
    // Security check
    if (!fullPath.startsWith(projectRoot)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({
      success: true,
      message: 'File saved successfully'
    });
    
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to write file'
    });
  }
});

module.exports = router;