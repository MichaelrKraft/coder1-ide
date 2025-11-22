const { chromium } = require('playwright');

async function checkAvailableCommands() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    console.log('🚀 Checking Available Commands...');
    
    try {
        // Navigate to IDE
        console.log('1. Navigating to http://localhost:3001/ide/');
        await page.goto('http://localhost:3001/ide/', { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });
        
        await page.waitForTimeout(3000);
        
        // Find terminal and type /help
        console.log('2. Looking for terminal and typing /help...');
        const terminal = await page.waitForSelector('.terminal, .xterm', { timeout: 10000 });
        
        if (terminal) {
            // Click in terminal to focus
            await terminal.click();
            await page.waitForTimeout(1000);
            
            // Type /help command
            await page.keyboard.type('/help');
            await page.keyboard.press('Enter');
            
            // Wait for output
            await page.waitForTimeout(3000);
            
            // Get terminal content
            const terminalContent = await terminal.textContent();
            console.log('\n=== TERMINAL OUTPUT (last 2000 chars) ===');
            console.log(terminalContent.slice(-2000));
            console.log('=== END TERMINAL OUTPUT ===\n');
        }
        
        // Now let's check what AI Team button actually does
        console.log('3. Looking for AI Team button and checking its implementation...');
        
        // Check what buttons exist with "AI" or "Team" in the text
        const aiButtons = await page.$$eval('button', buttons => 
            buttons.map(btn => ({
                text: btn.textContent?.trim(),
                onClick: btn.onclick ? btn.onclick.toString() : null,
                dataTestId: btn.getAttribute('data-testid'),
                className: btn.className
            })).filter(btn => 
                btn.text && (
                    btn.text.toLowerCase().includes('ai') || 
                    btn.text.toLowerCase().includes('team') ||
                    btn.text.toLowerCase().includes('spawn')
                )
            )
        );
        
        console.log('\n=== AI/TEAM RELATED BUTTONS ===');
        console.log(JSON.stringify(aiButtons, null, 2));
        console.log('=== END BUTTONS ===\n');
        
        // Try clicking the AI Team button again and see what happens
        const aiTeamButton = await page.$('button:has-text("AI Team")');
        if (aiTeamButton) {
            console.log('4. Clicking AI Team button and monitoring network...');
            
            // Monitor network requests
            const requestPromises = [];
            page.on('request', request => {
                if (request.url().includes('claude') || 
                    request.url().includes('spawn') || 
                    request.url().includes('agent') ||
                    request.url().includes('bridge')) {
                    console.log(`📡 Network request: ${request.method()} ${request.url()}`);
                    requestPromises.push(request);
                }
            });
            
            page.on('response', response => {
                if (response.url().includes('claude') || 
                    response.url().includes('spawn') || 
                    response.url().includes('agent') ||
                    response.url().includes('bridge')) {
                    console.log(`📥 Network response: ${response.status()} ${response.url()}`);
                }
            });
            
            // Click the button
            await aiTeamButton.click();
            
            // Wait and see what happens
            await page.waitForTimeout(5000);
            
            console.log(`📊 Captured ${requestPromises.length} relevant network requests`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

checkAvailableCommands().catch(console.error);