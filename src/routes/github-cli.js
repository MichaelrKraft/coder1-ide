/**
 * GitHub CLI Routes - Advanced GitHub Operations with Educational Content
 * 
 * Provides PR creation, issue management, and workflow automation.
 * Falls back to REST API when CLI is unavailable.
 * Preserves all existing functionality while adding new capabilities.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const githubCLI = require('../utils/github-cli-detector');

// Educational content for GitHub workflows
const GITHUB_EDUCATION = {
    pullRequest: {
        emoji: '🔀',
        title: 'Creating a Pull Request',
        explanation: 'A Pull Request (PR) is a proposal to merge your changes into the main codebase. It allows others to review your code before it becomes part of the project.',
        analogy: 'Think of it like submitting a draft essay to your teacher for review before the final submission. They can suggest improvements before it\'s finalized.',
        benefits: [
            '👥 Get feedback from teammates',
            '🔍 Catch bugs before they reach production',
            '📚 Learn from code reviews',
            '📝 Document why changes were made',
            '🎯 Ensure code quality standards'
        ]
    },
    issue: {
        emoji: '📋',
        title: 'Creating an Issue',
        explanation: 'An issue is a way to track bugs, feature requests, or tasks. It\'s like a to-do item for your project.',
        analogy: 'Issues are like sticky notes on a project board - each one represents something that needs attention.',
        benefits: [
            '🐛 Track bugs systematically',
            '💡 Collect feature requests',
            '📊 Organize project work',
            '🤝 Collaborate with contributors',
            '📈 Monitor project progress'
        ]
    },
    workflow: {
        emoji: '⚙️',
        title: 'GitHub Actions & Workflows',
        explanation: 'Workflows automate tasks like testing code, building applications, or deploying to servers.',
        analogy: 'Like having a robot assistant that automatically checks your homework for errors every time you save it.',
        benefits: [
            '🤖 Automate repetitive tasks',
            '✅ Run tests automatically',
            '🚀 Deploy code automatically',
            '🔔 Get notified of problems',
            '⏰ Save development time'
        ]
    }
};

/**
 * GET /api/github/cli/status - Check GitHub CLI availability and status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await githubCLI.getStatus();
        
        res.json({
            success: true,
            ...status,
            education: {
                title: status.ready ? 'GitHub CLI Ready!' : 'GitHub CLI Setup Needed',
                message: status.ready 
                    ? 'You can use advanced GitHub features like creating PRs and issues'
                    : 'Install and authenticate GitHub CLI to unlock advanced features',
                emoji: status.ready ? '✅' : '🔧'
            }
        });
    } catch (error) {
        console.error('❌ GitHub CLI Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check GitHub CLI status'
        });
    }
});

/**
 * POST /api/github/cli/pr/create - Create a pull request
 */
router.post('/pr/create', async (req, res) => {
    try {
        const {
            title,
            body,
            base = 'main',
            head,
            draft = false,
            educationalMode = true,
            projectPath = process.cwd()
        } = req.body;

        console.log('🔀 Creating Pull Request:', title);

        // Check CLI availability
        const cliStatus = await githubCLI.getStatus();
        
        if (cliStatus.ready) {
            // Use GitHub CLI
            const args = [
                'pr', 'create',
                '--title', title,
                '--body', body || '',
                '--base', base
            ];

            if (head) args.push('--head', head);
            if (draft) args.push('--draft');

            const result = await githubCLI.executeCommand('pr', ['create', ...args.slice(2)], {
                cwd: projectPath
            });

            if (result.success) {
                // Parse PR URL from output
                const prUrlMatch = result.stdout.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/);
                const prUrl = prUrlMatch ? prUrlMatch[0] : null;

                res.json({
                    success: true,
                    method: 'cli',
                    prUrl,
                    message: 'Pull Request created successfully!',
                    education: educationalMode ? {
                        ...GITHUB_EDUCATION.pullRequest,
                        nextSteps: [
                            '👀 Wait for reviewers to look at your code',
                            '💬 Respond to any feedback or questions',
                            '✏️ Make requested changes if needed',
                            '✅ Get approval from reviewers',
                            '🚀 Merge when ready!'
                        ]
                    } : null
                });
            } else {
                throw new Error(result.stderr || 'Failed to create PR');
            }
        } else {
            // Fallback to REST API
            if (!process.env.GITHUB_TOKEN) {
                return res.status(400).json({
                    success: false,
                    error: 'GitHub CLI not available and no GitHub token configured',
                    cliStatus,
                    education: {
                        title: 'Setup Required',
                        message: 'Either install GitHub CLI or configure a GitHub token',
                        options: [
                            '1. Install GitHub CLI (recommended)',
                            '2. Set GITHUB_TOKEN environment variable'
                        ]
                    }
                });
            }

            // Use GitHub REST API as fallback
            const repoInfo = await getRepositoryInfo(projectPath);
            
            const response = await axios.post(
                `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/pulls`,
                {
                    title,
                    body: body || '',
                    base,
                    head: head || repoInfo.currentBranch,
                    draft
                },
                {
                    headers: {
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            res.json({
                success: true,
                method: 'api',
                prUrl: response.data.html_url,
                message: 'Pull Request created successfully!',
                education: educationalMode ? GITHUB_EDUCATION.pullRequest : null
            });
        }
    } catch (error) {
        console.error('❌ PR Creation Error:', error);
        
        let friendlyError = {
            title: 'Could not create Pull Request',
            message: error.message || 'Unknown error',
            emoji: '😕'
        };

        // Provide helpful error messages
        if (error.message && error.message.includes('no commits between')) {
            friendlyError = {
                title: 'No changes to create PR',
                message: 'Your branch has no new commits compared to the base branch',
                solution: 'Make some changes and commit them first',
                emoji: '📝'
            };
        } else if (error.message && error.message.includes('Authentication')) {
            friendlyError = {
                title: 'Authentication needed',
                message: 'GitHub needs to verify your identity',
                solution: 'Run: gh auth login',
                emoji: '🔐'
            };
        }

        res.status(500).json({
            success: false,
            error: friendlyError,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/github/cli/issue/create - Create an issue
 */
router.post('/issue/create', async (req, res) => {
    try {
        const {
            title,
            body,
            labels = [],
            assignees = [],
            educationalMode = true,
            projectPath = process.cwd()
        } = req.body;

        console.log('📋 Creating Issue:', title);

        // Check CLI availability
        const cliStatus = await githubCLI.getStatus();
        
        if (cliStatus.ready) {
            // Use GitHub CLI
            const args = ['issue', 'create', '--title', title];
            
            if (body) args.push('--body', body);
            if (labels.length > 0) args.push('--label', labels.join(','));
            if (assignees.length > 0) args.push('--assignee', assignees.join(','));

            const result = await githubCLI.executeCommand('issue', args.slice(1), {
                cwd: projectPath
            });

            if (result.success) {
                // Parse issue URL from output
                const issueUrlMatch = result.stdout.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/issues\/\d+/);
                const issueUrl = issueUrlMatch ? issueUrlMatch[0] : null;

                res.json({
                    success: true,
                    method: 'cli',
                    issueUrl,
                    message: 'Issue created successfully!',
                    education: educationalMode ? {
                        ...GITHUB_EDUCATION.issue,
                        tips: [
                            '🏷️ Use labels to categorize issues',
                            '👤 Assign issues to team members',
                            '🔗 Reference issues in commits with #123',
                            '📎 Attach screenshots to clarify problems',
                            '✔️ Close issues when resolved'
                        ]
                    } : null
                });
            } else {
                throw new Error(result.stderr || 'Failed to create issue');
            }
        } else {
            // Fallback to REST API
            if (!process.env.GITHUB_TOKEN) {
                return res.status(400).json({
                    success: false,
                    error: 'GitHub CLI not available and no GitHub token configured',
                    cliStatus,
                    education: {
                        title: 'Setup Required',
                        message: 'Either install GitHub CLI or configure a GitHub token'
                    }
                });
            }

            // Use GitHub REST API as fallback
            const repoInfo = await getRepositoryInfo(projectPath);
            
            const response = await axios.post(
                `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/issues`,
                {
                    title,
                    body: body || '',
                    labels,
                    assignees
                },
                {
                    headers: {
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            res.json({
                success: true,
                method: 'api',
                issueUrl: response.data.html_url,
                message: 'Issue created successfully!',
                education: educationalMode ? GITHUB_EDUCATION.issue : null
            });
        }
    } catch (error) {
        console.error('❌ Issue Creation Error:', error);
        res.status(500).json({
            success: false,
            error: {
                title: 'Could not create issue',
                message: error.message || 'Unknown error',
                emoji: '😕'
            }
        });
    }
});

/**
 * GET /api/github/cli/pr/list - List pull requests
 */
router.get('/pr/list', async (req, res) => {
    try {
        const { state = 'open', projectPath = process.cwd() } = req.query;

        const cliStatus = await githubCLI.getStatus();
        
        if (cliStatus.ready) {
            // Use GitHub CLI with JSON output
            const result = await githubCLI.executeCommand('pr', ['list', '--state', state, '--json', 'number,title,state,url,author'], {
                cwd: projectPath
            });

            if (result.success) {
                const prs = JSON.parse(result.stdout || '[]');
                res.json({
                    success: true,
                    method: 'cli',
                    pullRequests: prs,
                    count: prs.length
                });
            } else {
                throw new Error(result.stderr || 'Failed to list PRs');
            }
        } else {
            // REST API fallback
            res.json({
                success: false,
                error: 'GitHub CLI not available',
                cliStatus
            });
        }
    } catch (error) {
        console.error('❌ PR List Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list pull requests'
        });
    }
});

/**
 * GET /api/github/cli/workflow/list - List GitHub Actions workflows
 */
router.get('/workflow/list', async (req, res) => {
    try {
        const { projectPath = process.cwd() } = req.query;

        const cliStatus = await githubCLI.getStatus();
        
        if (cliStatus.ready) {
            // Use GitHub CLI
            const result = await githubCLI.executeCommand('workflow', ['list', '--json', 'name,state,id'], {
                cwd: projectPath
            });

            if (result.success) {
                const workflows = JSON.parse(result.stdout || '[]');
                res.json({
                    success: true,
                    method: 'cli',
                    workflows,
                    education: GITHUB_EDUCATION.workflow
                });
            } else {
                throw new Error(result.stderr || 'Failed to list workflows');
            }
        } else {
            res.json({
                success: false,
                error: 'GitHub CLI not available',
                cliStatus
            });
        }
    } catch (error) {
        console.error('❌ Workflow List Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list workflows'
        });
    }
});

/**
 * Helper function to get repository information
 */
async function getRepositoryInfo(projectPath) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
        // Get remote URL
        const { stdout: remoteUrl } = await execAsync('git remote get-url origin', { cwd: projectPath });
        
        // Parse owner and repo from URL
        // Handles both HTTPS and SSH URLs
        const match = remoteUrl.match(/github\.com[:/]([\w-]+)\/([\w-]+)/);
        if (!match) {
            throw new Error('Could not parse repository information');
        }

        // Get current branch
        const { stdout: branch } = await execAsync('git branch --show-current', { cwd: projectPath });

        return {
            owner: match[1],
            repo: match[2].replace('.git', ''),
            currentBranch: branch.trim()
        };
    } catch (error) {
        throw new Error('Not a GitHub repository or remote not configured');
    }
}

module.exports = router;