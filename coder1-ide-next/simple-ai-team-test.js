const { chromium } = require('playwright');

async function simpleAITeamTest() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('🚀 Starting Simple AI Team Test...');
        
        // Navigate to IDE
        console.log('1. Navigating to http://localhost:3001/ide/');
        await page.goto('http://localhost:3001/ide/', { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });
        
        console.log('✅ Page loaded successfully');
        
        // Wait for the page to be ready
        await page.waitForTimeout(3000);
        
        // Look for any buttons and log them
        console.log('2. Looking for all buttons on page...');
        const allButtons = await page.$$eval('button', buttons => 
            buttons.map(btn => ({
                text: btn.textContent?.trim(),
                id: btn.id,
                className: btn.className,
                dataTestId: btn.getAttribute('data-testid'),
                title: btn.title,
                visible: !btn.hidden && btn.offsetParent !== null
            })).filter(btn => btn.visible)
        );
        
        console.log('Found buttons:', allButtons);
        
        // Look specifically for AI Team button
        console.log('3. Looking for AI Team button...');
        const aiTeamButton = await page.$('button:has-text("AI Team")');
        
        if (aiTeamButton) {
            console.log('✅ Found AI Team button!');
            
            // Click it
            console.log('4. Clicking AI Team button...');
            await aiTeamButton.click();
            
            await page.waitForTimeout(2000);
            
            // Look for modal or dialog
            console.log('5. Looking for AI Team modal/dialog...');
            const modal = await page.$('[role="dialog"], .modal, [data-testid*="modal"], [aria-modal="true"]');
            
            if (modal) {
                console.log('✅ Found AI Team modal/dialog');
                
                // Look for input fields
                const inputs = await page.$$eval('input, textarea', inputs => 
                    inputs.map(input => ({
                        type: input.type,
                        placeholder: input.placeholder,
                        id: input.id,
                        className: input.className,
                        visible: !input.hidden && input.offsetParent !== null
                    })).filter(input => input.visible)
                );
                
                console.log('Found input fields:', inputs);
                
                // Try to find requirement input
                const requirementInput = await page.$('input[placeholder*="requirement"], input[placeholder*="task"], textarea[placeholder*="requirement"], textarea[placeholder*="task"]');
                
                if (requirementInput) {
                    console.log('✅ Found requirement input');
                    
                    // Enter test requirement
                    console.log('6. Entering test requirement...');
                    await requirementInput.fill('Build a simple todo list app');
                    
                    // Look for submit button
                    const submitButton = await page.$('button:has-text("Start"), button:has-text("Submit"), button:has-text("Create"), button[type="submit"]');
                    
                    if (submitButton) {
                        console.log('✅ Found submit button');
                        await submitButton.click();
                        
                        console.log('7. Waiting for agents to spawn...');
                        await page.waitForTimeout(10000);
                        
                        // Look for agent tabs
                        const agentTabs = await page.$$('[data-testid*="agent"], .agent-tab, [role="tab"]');
                        console.log(`Found ${agentTabs.length} potential agent tabs`);
                        
                        if (agentTabs.length > 0) {
                            console.log('✅ Agent tabs found!');
                            
                            // Get tab texts
                            for (let i = 0; i < agentTabs.length; i++) {
                                try {
                                    const tabText = await agentTabs[i].textContent();
                                    console.log(`Tab ${i + 1}: "${tabText}"`);
                                } catch (e) {
                                    console.log(`Tab ${i + 1}: Unable to get text`);
                                }
                            }
                            
                            // Click first tab
                            console.log('8. Clicking first agent tab...');
                            await agentTabs[0].click();
                            await page.waitForTimeout(3000);
                            
                            // Look for terminal
                            const terminal = await page.$('.terminal, .xterm, .terminal-output, [data-testid="terminal"]');
                            
                            if (terminal) {
                                console.log('✅ Found terminal in agent tab');
                                const terminalContent = await terminal.textContent();
                                console.log('Terminal content preview:', terminalContent?.substring(0, 200));
                            } else {
                                console.log('❌ No terminal found in agent tab');
                            }
                            
                        } else {
                            console.log('❌ No agent tabs found');
                        }
                        
                    } else {
                        console.log('❌ No submit button found');
                        await requirementInput.press('Enter');
                        console.log('✅ Pressed Enter instead');
                    }
                } else {
                    console.log('❌ No requirement input found');
                }
                
            } else {
                console.log('❌ No AI Team modal found');
            }
            
        } else {
            console.log('❌ AI Team button not found');
            
            // Look for status bar
            const statusBar = await page.$('[data-testid="status-bar"], .status-bar');
            if (statusBar) {
                console.log('✅ Found status bar');
                const statusBarContent = await statusBar.textContent();
                console.log('Status bar content:', statusBarContent);
            } else {
                console.log('❌ No status bar found');
            }
        }
        
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

simpleAITeamTest().catch(console.error);