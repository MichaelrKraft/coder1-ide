const { chromium } = require('playwright');
const path = require('path');

async function enhancedAITeamTest() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('🚀 Starting Enhanced AI Team Test...');
        
        // Navigate to IDE
        console.log('1. Navigating to http://localhost:3001/ide/');
        await page.goto('http://localhost:3001/ide/', { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });
        
        console.log('✅ Page loaded successfully');
        
        // Wait for the page to be fully ready
        await page.waitForTimeout(5000);
        
        // Take initial screenshot
        const timestamp = Date.now();
        await page.screenshot({ path: `ai-team-test-initial-${timestamp}.png`, fullPage: true });
        console.log(`📸 Initial screenshot saved: ai-team-test-initial-${timestamp}.png`);
        
        // Look for AI Team button
        console.log('2. Looking for AI Team button...');
        const aiTeamButton = await page.$('button:has-text("AI Team")');
        
        if (aiTeamButton) {
            console.log('✅ Found AI Team button!');
            
            // Click it
            console.log('3. Clicking AI Team button...');
            await aiTeamButton.click();
            
            console.log('4. Waiting up to 60 seconds for agent tabs to appear...');
            
            // Wait for agent tabs or modals to appear with longer timeout
            let agentTabsFound = false;
            let modalFound = false;
            let attempts = 0;
            const maxAttempts = 12; // 60 seconds total (5 seconds per attempt)
            
            while (attempts < maxAttempts && !agentTabsFound && !modalFound) {
                attempts++;
                console.log(`   Attempt ${attempts}/${maxAttempts} - checking for agent tabs or modal...`);
                
                // Check for modal first
                const modal = await page.$('[role="dialog"], .modal, [data-testid*="modal"], [aria-modal="true"]');
                if (modal) {
                    console.log('✅ Found modal/dialog!');
                    modalFound = true;
                    
                    // Take screenshot of modal
                    await page.screenshot({ path: `ai-team-modal-${timestamp}.png`, fullPage: true });
                    console.log(`📸 Modal screenshot saved: ai-team-modal-${timestamp}.png`);
                    
                    // Look for input and enter requirement
                    const requirementInput = await page.$('input[placeholder*="requirement"], input[placeholder*="task"], textarea[placeholder*="requirement"], textarea[placeholder*="task"], input[type="text"], textarea');
                    
                    if (requirementInput) {
                        console.log('✅ Found requirement input in modal');
                        await requirementInput.fill('Build a simple REST API for managing tasks');
                        
                        // Look for submit button
                        const submitButton = await page.$('button:has-text("Start"), button:has-text("Submit"), button:has-text("Create"), button[type="submit"]');
                        
                        if (submitButton) {
                            console.log('✅ Found submit button - submitting requirement');
                            await submitButton.click();
                        } else {
                            console.log('⚠️ No submit button found - trying Enter key');
                            await requirementInput.press('Enter');
                        }
                        
                        // Wait a bit after submission
                        await page.waitForTimeout(10000);
                    }
                    
                    // Continue checking for agent tabs after modal submission
                }
                
                // Check for agent tabs with various selectors
                const agentSelectors = [
                    '[data-testid*="agent"]',
                    '.agent-tab',
                    '[role="tab"]',
                    '[data-tab-type="agent"]',
                    'button:has-text("Frontend Developer")',
                    'button:has-text("Backend Developer")',
                    'button:has-text("architect")',
                    'button:has-text("fullstack")',
                    '.terminal-tab',
                    '[data-testid*="terminal"]'
                ];
                
                for (const selector of agentSelectors) {
                    const tabs = await page.$$(selector);
                    if (tabs.length > 0) {
                        console.log(`✅ Found ${tabs.length} potential agent tabs with selector: ${selector}`);
                        
                        // Get tab information
                        for (let i = 0; i < tabs.length && i < 5; i++) {
                            try {
                                const tabText = await tabs[i].textContent();
                                const isVisible = await tabs[i].isVisible();
                                console.log(`   Tab ${i + 1}: "${tabText}" (visible: ${isVisible})`);
                            } catch (e) {
                                console.log(`   Tab ${i + 1}: Unable to get text - ${e.message}`);
                            }
                        }
                        
                        agentTabsFound = true;
                        break;
                    }
                }
                
                if (!agentTabsFound && !modalFound) {
                    await page.waitForTimeout(5000);
                }
            }
            
            if (agentTabsFound || modalFound) {
                // Take screenshot of agent tabs or final state
                await page.screenshot({ path: `ai-team-agents-${timestamp}.png`, fullPage: true });
                console.log(`📸 Agent tabs screenshot saved: ai-team-agents-${timestamp}.png`);
                
                if (agentTabsFound) {
                    console.log('5. Clicking on first agent tab to check terminal content...');
                    
                    // Try to click the first agent tab
                    for (const selector of [
                        '[data-testid*="agent"]:first-child',
                        '.agent-tab:first-child',
                        '[role="tab"]:first-child',
                        'button:has-text("Frontend Developer")',
                        'button:has-text("Backend Developer")',
                        'button:has-text("architect")'
                    ]) {
                        const firstTab = await page.$(selector);
                        if (firstTab) {
                            await firstTab.click();
                            console.log(`✅ Clicked agent tab with selector: ${selector}`);
                            break;
                        }
                    }
                    
                    // Wait for terminal content
                    await page.waitForTimeout(5000);
                    
                    // Check for terminal content
                    const terminalSelectors = [
                        '.terminal',
                        '.xterm',
                        '.terminal-output',
                        '[data-testid="terminal"]',
                        '.terminal-container',
                        'pre',
                        '.monaco-editor'
                    ];
                    
                    let terminalFound = false;
                    for (const selector of terminalSelectors) {
                        const terminal = await page.$(selector);
                        if (terminal) {
                            console.log(`✅ Found terminal with selector: ${selector}`);
                            try {
                                const terminalContent = await terminal.textContent();
                                console.log(`📝 Terminal content (first 300 chars): ${terminalContent?.substring(0, 300)}`);
                                
                                if (terminalContent && terminalContent.trim().length > 10) {
                                    console.log('✅ Terminal has content!');
                                } else {
                                    console.log('⚠️ Terminal appears empty');
                                }
                                terminalFound = true;
                            } catch (e) {
                                console.log(`❌ Error reading terminal content: ${e.message}`);
                            }
                            break;
                        }
                    }
                    
                    if (!terminalFound) {
                        console.log('❌ No terminal content found');
                    }
                    
                    // Take final screenshot
                    await page.screenshot({ path: `ai-team-terminal-${timestamp}.png`, fullPage: true });
                    console.log(`📸 Terminal screenshot saved: ai-team-terminal-${timestamp}.png`);
                }
            } else {
                console.log('❌ No agent tabs or modal found after 60 seconds');
                
                // Take screenshot of current state for debugging
                await page.screenshot({ path: `ai-team-no-agents-${timestamp}.png`, fullPage: true });
                console.log(`📸 Debug screenshot saved: ai-team-no-agents-${timestamp}.png`);
            }
            
        } else {
            console.log('❌ AI Team button not found');
        }
        
        // Check browser console for errors
        console.log('6. Checking browser console for errors...');
        const logs = [];
        page.on('console', msg => {
            logs.push(`${msg.type()}: ${msg.text()}`);
        });
        
        // Wait a bit to capture any console messages
        await page.waitForTimeout(2000);
        
        if (logs.length > 0) {
            console.log('📋 Browser console messages:');
            logs.forEach(log => console.log(`   ${log}`));
        } else {
            console.log('ℹ️ No console messages captured');
        }
        
        console.log('✅ Enhanced test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

enhancedAITeamTest().catch(console.error);