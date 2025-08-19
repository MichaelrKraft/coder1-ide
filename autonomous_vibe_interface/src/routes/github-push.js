/**
 * GitHub Push Route - Educational Git Integration for Claude Code Users
 * 
 * This route makes GitHub accessible for new developers and "vibe coders"
 * by providing a friendly, educational interface to git operations.
 * 
 * Teaches concepts like:
 * - What is a commit (saving a snapshot of your code)
 * - What is a push (sharing your code with the world)
 * - Why GitHub matters (backup, collaboration, portfolio)
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Educational messages for different git concepts
const GIT_EDUCATION = {
    commit: {
        emoji: '📸',
        title: 'Creating a Commit',
        explanation: 'A commit is like taking a snapshot of your code at this moment. It saves your progress so you can always come back to this exact version.',
        analogy: 'Think of it like saving your game progress - you can always reload from this save point!'
    },
    push: {
        emoji: '🚀',
        title: 'Pushing to GitHub',
        explanation: 'Pushing uploads your code to GitHub, making it accessible from anywhere and backing it up in the cloud.',
        analogy: 'It\'s like uploading your photos to the cloud - safe, shareable, and accessible from any device!'
    },
    repository: {
        emoji: '📁',
        title: 'Your Repository',
        explanation: 'A repository (or "repo") is your project\'s home on GitHub. It contains all your code, its history, and documentation.',
        analogy: 'Think of it as your project\'s personal folder in the cloud that tracks every change you\'ve ever made!'
    },
    benefits: {
        emoji: '✨',
        title: 'Why Use GitHub?',
        points: [
            '🛡️ **Backup**: Never lose your code again',
            '🤝 **Collaboration**: Work with others easily',
            '💼 **Portfolio**: Show employers your work',
            '📊 **History**: See how your code evolved',
            '🌍 **Open Source**: Share with the world'
        ]
    }
};

/**
 * Check if git is configured
 */
async function checkGitConfig() {
    return new Promise((resolve) => {
        const check = spawn('git', ['config', 'user.email']);
        let hasEmail = false;
        
        check.stdout.on('data', (data) => {
            if (data.toString().trim()) {
                hasEmail = true;
            }
        });
        
        check.on('close', () => {
            resolve(hasEmail);
        });
    });
}

/**
 * Check if remote repository is configured
 */
async function checkRemoteConfig(projectPath) {
    return new Promise((resolve) => {
        const check = spawn('git', ['remote', '-v'], { cwd: projectPath });
        let hasRemote = false;
        
        check.stdout.on('data', (data) => {
            if (data.toString().includes('origin')) {
                hasRemote = true;
            }
        });
        
        check.on('close', () => {
            resolve(hasRemote);
        });
    });
}

/**
 * Get current branch name
 */
async function getCurrentBranch(projectPath) {
    return new Promise((resolve) => {
        const check = spawn('git', ['branch', '--show-current'], { cwd: projectPath });
        let branch = 'main';
        
        check.stdout.on('data', (data) => {
            const branchName = data.toString().trim();
            if (branchName) {
                branch = branchName;
            }
        });
        
        check.on('close', () => {
            resolve(branch);
        });
    });
}

/**
 * Generate a smart commit message based on changes
 */
async function generateCommitMessage(projectPath) {
    return new Promise((resolve) => {
        const diff = spawn('git', ['diff', '--stat'], { cwd: projectPath });
        let filesChanged = [];
        
        diff.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.includes('|')) {
                    const file = line.split('|')[0].trim();
                    if (file) {
                        filesChanged.push(file);
                    }
                }
            });
        });
        
        diff.on('close', () => {
            if (filesChanged.length === 0) {
                resolve('Update project files');
            } else if (filesChanged.length === 1) {
                const file = path.basename(filesChanged[0]);
                resolve(`Update ${file}`);
            } else {
                resolve(`Update ${filesChanged.length} files`);
            }
        });
    });
}

/**
 * Execute git command with progress tracking
 */
async function executeGitCommand(command, args, projectPath, onProgress) {
    return new Promise((resolve, reject) => {
        const git = spawn(command, args, { cwd: projectPath });
        let output = '';
        let error = '';
        
        git.stdout.on('data', (data) => {
            output += data.toString();
            if (onProgress) {
                onProgress('stdout', data.toString());
            }
        });
        
        git.stderr.on('data', (data) => {
            error += data.toString();
            if (onProgress) {
                onProgress('stderr', data.toString());
            }
        });
        
        git.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, output, error });
            } else {
                reject({ success: false, output, error, code });
            }
        });
    });
}

/**
 * POST /api/github/push - Main push endpoint
 */
router.post('/push', async (req, res) => {
    try {
        const { 
            projectPath = process.cwd(),
            commitMessage,
            educationalMode = true 
        } = req.body;
        
        console.log('🚀 GitHub Push: Starting push process');
        console.log('📁 Project path:', projectPath);
        
        const steps = [];
        const education = [];
        
        // Step 1: Check git configuration
        steps.push({
            step: 1,
            title: 'Checking Git Setup',
            status: 'in_progress',
            description: 'Making sure Git knows who you are'
        });
        
        const hasGitConfig = await checkGitConfig();
        if (!hasGitConfig) {
            return res.status(400).json({
                success: false,
                error: 'Git not configured',
                education: {
                    title: 'First Time Setup Needed!',
                    message: 'Git needs to know who you are. This is like signing your name on your work.',
                    solution: 'Run these commands in your terminal:\n\ngit config --global user.name "Your Name"\ngit config --global user.email "your.email@example.com"',
                    emoji: '✍️'
                },
                setupRequired: true
            });
        }
        
        steps[0].status = 'completed';
        
        // Step 2: Check for remote repository
        steps.push({
            step: 2,
            title: 'Checking GitHub Connection',
            status: 'in_progress',
            description: 'Making sure your project is connected to GitHub'
        });
        
        const hasRemote = await checkRemoteConfig(projectPath);
        if (!hasRemote) {
            return res.status(400).json({
                success: false,
                error: 'No GitHub repository connected',
                education: {
                    title: 'Connect to GitHub First!',
                    message: 'Your project needs a home on GitHub. This is where your code will live online.',
                    solution: '1. Create a repository on GitHub.com\n2. Run: git remote add origin https://github.com/yourusername/yourrepo.git',
                    emoji: '🔗'
                },
                setupRequired: true
            });
        }
        
        steps[1].status = 'completed';
        
        // Step 3: Stage all changes
        steps.push({
            step: 3,
            title: 'Preparing Your Changes',
            status: 'in_progress',
            description: 'Getting your files ready to save',
            education: educationalMode ? GIT_EDUCATION.commit : null
        });
        
        await executeGitCommand('git', ['add', '.'], projectPath);
        steps[2].status = 'completed';
        
        // Step 4: Create commit
        steps.push({
            step: 4,
            title: 'Saving Your Progress',
            status: 'in_progress',
            description: 'Creating a snapshot of your code'
        });
        
        const finalMessage = commitMessage || await generateCommitMessage(projectPath);
        const messageWithEmoji = `✨ ${finalMessage} (via Coder1)`;
        
        try {
            await executeGitCommand('git', ['commit', '-m', messageWithEmoji], projectPath);
            steps[3].status = 'completed';
        } catch (error) {
            if (error.output && error.output.includes('nothing to commit')) {
                return res.json({
                    success: true,
                    message: 'No changes to push',
                    education: {
                        title: 'Already Up to Date!',
                        message: 'Your code is already saved and pushed to GitHub. Make some changes first!',
                        emoji: '✅'
                    }
                });
            }
            throw error;
        }
        
        // Step 5: Push to GitHub
        steps.push({
            step: 5,
            title: 'Uploading to GitHub',
            status: 'in_progress',
            description: 'Sending your code to the cloud',
            education: educationalMode ? GIT_EDUCATION.push : null
        });
        
        const branch = await getCurrentBranch(projectPath);
        await executeGitCommand('git', ['push', 'origin', branch], projectPath);
        steps[4].status = 'completed';
        
        // Success response with education
        res.json({
            success: true,
            message: 'Successfully pushed to GitHub! 🎉',
            steps,
            education: educationalMode ? {
                ...GIT_EDUCATION.benefits,
                celebration: {
                    title: 'You Did It! 🎊',
                    message: 'Your code is now safely stored on GitHub!',
                    nextSteps: [
                        'Visit your GitHub repository to see your code online',
                        'Share the link with friends or collaborators',
                        'Keep pushing regularly to maintain a backup'
                    ]
                }
            } : null,
            repository: {
                branch,
                lastCommit: finalMessage,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ GitHub Push Error:', error);
        
        // Friendly error messages
        let friendlyError = {
            title: 'Oops! Something went wrong',
            message: error.message || 'Unknown error',
            emoji: '🤔'
        };
        
        if (error.error && error.error.includes('Authentication failed')) {
            friendlyError = {
                title: 'GitHub Login Needed',
                message: 'GitHub needs to verify it\'s really you',
                solution: 'You may need to set up a Personal Access Token. Visit: https://github.com/settings/tokens',
                emoji: '🔐'
            };
        } else if (error.error && error.error.includes('Connection refused')) {
            friendlyError = {
                title: 'Can\'t Reach GitHub',
                message: 'Check your internet connection',
                emoji: '🌐'
            };
        }
        
        res.status(500).json({
            success: false,
            error: friendlyError,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

/**
 * GET /api/github/status - Check git status
 */
router.get('/status', async (req, res) => {
    try {
        const projectPath = req.query.path || process.cwd();
        
        const status = await new Promise((resolve, reject) => {
            const git = spawn('git', ['status', '--porcelain'], { cwd: projectPath });
            let output = '';
            
            git.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            git.on('close', (code) => {
                if (code === 0) {
                    const files = output.split('\n').filter(line => line.trim());
                    resolve({
                        hasChanges: files.length > 0,
                        fileCount: files.length,
                        files: files.map(line => {
                            const [status, ...fileParts] = line.trim().split(' ');
                            return {
                                status: status,
                                file: fileParts.join(' '),
                                emoji: status.includes('M') ? '✏️' : status.includes('A') ? '➕' : '📄'
                            };
                        })
                    });
                } else {
                    reject(new Error('Git status failed'));
                }
            });
        });
        
        res.json({
            success: true,
            ...status,
            education: status.hasChanges ? {
                title: `You have ${status.fileCount} unsaved ${status.fileCount === 1 ? 'change' : 'changes'}`,
                message: 'These files have been modified since your last save',
                emoji: '💾'
            } : {
                title: 'All changes saved!',
                message: 'Your code is up to date with GitHub',
                emoji: '✅'
            }
        });
        
    } catch (error) {
        console.error('❌ Git Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check git status'
        });
    }
});

/**
 * POST /api/github/setup - First-time setup wizard
 */
router.post('/setup', async (req, res) => {
    try {
        const { name, email, repoUrl } = req.body;
        const projectPath = req.body.projectPath || process.cwd();
        
        const setupSteps = [];
        
        // Configure git user
        if (name && email) {
            await executeGitCommand('git', ['config', '--global', 'user.name', name], projectPath);
            await executeGitCommand('git', ['config', '--global', 'user.email', email], projectPath);
            setupSteps.push('✅ Configured your Git identity');
        }
        
        // Initialize repository if needed
        try {
            await executeGitCommand('git', ['status'], projectPath);
        } catch {
            await executeGitCommand('git', ['init'], projectPath);
            setupSteps.push('✅ Initialized Git repository');
        }
        
        // Add remote if provided
        if (repoUrl) {
            try {
                await executeGitCommand('git', ['remote', 'add', 'origin', repoUrl], projectPath);
                setupSteps.push('✅ Connected to GitHub repository');
            } catch {
                // Remote might already exist
                await executeGitCommand('git', ['remote', 'set-url', 'origin', repoUrl], projectPath);
                setupSteps.push('✅ Updated GitHub repository connection');
            }
        }
        
        res.json({
            success: true,
            message: 'Git setup completed successfully!',
            steps: setupSteps,
            education: {
                title: 'You\'re All Set! 🚀',
                message: 'Your project is now connected to GitHub. You can start pushing your code!',
                nextSteps: [
                    'Make some changes to your code',
                    'Click the "Push to GitHub" button',
                    'Watch your code appear on GitHub!'
                ],
                emoji: '🎉'
            }
        });
        
    } catch (error) {
        console.error('❌ Setup Error:', error);
        res.status(500).json({
            success: false,
            error: 'Setup failed',
            details: error.message
        });
    }
});

module.exports = router;