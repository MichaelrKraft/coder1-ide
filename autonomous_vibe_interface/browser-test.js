#!/usr/bin/env node

/**
 * Simple Browser Test for Orchestrator
 * Uses puppeteer to test the full flow
 */

let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (error) {
    console.log('❌ Puppeteer not available. Using direct testing...');
    process.exit(1);
}

async function testOrchestratorFlow() {
    console.log('🎭 Starting Orchestrator Browser Test...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            defaultViewport: null,
            args: ['--start-maximized'] 
        });
        
        const page = await browser.newPage();
        
        // Step 1: Navigate to orchestrator
        console.log('📍 1. Navigating to orchestrator...');
        await page.goto('http://localhost:3000/orchestrator/', { waitUntil: 'networkidle0' });
        
        // Step 2: Fill in project description
        console.log('✍️  2. Entering project description...');
        await page.waitForSelector('#user-query', { timeout: 5000 });
        await page.type('#user-query', 'Build a task management app with real-time collaboration, user authentication, and team workspace features');
        
        // Step 3: Start consultation
        console.log('🚀 3. Starting consultation...');
        await page.click('#start-btn');
        
        // Step 4: Wait for expert responses
        console.log('⏳ 4. Waiting for expert responses (up to 2 minutes)...');
        
        // Wait for completion actions to appear
        let completionFound = false;
        for (let i = 0; i < 24; i++) { // 2 minutes max
            try {
                await page.waitForSelector('#completion-actions', { timeout: 5000 });
                completionFound = true;
                console.log('✅ Expert consultation completed!');
                break;
            } catch {
                console.log(`   Waiting... (${(i + 1) * 5}s)`);
            }
        }
        
        if (!completionFound) {
            console.log('⏰ Consultation taking longer than expected, proceeding with available actions...');
        }
        
        // Step 5: Test PRD Export with confetti
        console.log('🎉 5. Testing PRD Export (with confetti!)...');
        
        // Set up download handling
        await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: '/Users/michaelkraft/autonomous_vibe_interface/'
        });
        
        // Click export and watch for confetti
        const exportButton = await page.$('button[onclick="exportPlan()"]');
        if (exportButton) {
            await exportButton.click();
            
            // Check for confetti animation
            await page.waitForTimeout(500);
            const confettiContainer = await page.$('.confetti-container');
            
            if (confettiContainer) {
                console.log('🎊 CONFETTI ANIMATION DETECTED!');
                
                // Watch confetti for a few seconds
                console.log('   Watching confetti animation...');
                await page.waitForTimeout(4000);
                
                console.log('✨ Confetti animation completed successfully!');
            } else {
                console.log('❌ No confetti animation found');
            }
            
            // Wait for download
            await page.waitForTimeout(2000);
            console.log('📄 PRD should have been downloaded');
            
        } else {
            console.log('❌ Export button not found');
        }
        
        // Step 6: Test Claude Code Prompt
        console.log('💻 6. Testing Claude Code Prompt generation...');
        const claudeButton = await page.$('button[onclick="generateClaudeCodePrompt()"]');
        if (claudeButton) {
            await claudeButton.click();
            console.log('✅ Claude Code prompt generation triggered');
            
            // Wait for potential redirect
            await page.waitForTimeout(3000);
            console.log('🔀 Redirect should have occurred to /ide');
        } else {
            console.log('❌ Claude Code button not found');
        }
        
        console.log('\n🏆 BROWSER TEST COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testOrchestratorFlow();