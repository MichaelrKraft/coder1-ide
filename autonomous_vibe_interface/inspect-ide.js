const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001/ide');
  await page.waitForTimeout(2000);
  
  // Find the docs button and get its position
  const docsButton = await page.locator('button:has-text("Docs")').first();
  
  if (await docsButton.count() > 0) {
    const box = await docsButton.boundingBox();
    console.log('Docs button position:', box);
    
    // Get computed styles
    const styles = await docsButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        border: computed.border,
        borderColor: computed.borderColor,
        boxShadow: computed.boxShadow,
        backgroundColor: computed.backgroundColor,
        padding: computed.padding,
        margin: computed.margin,
        position: window.getComputedStyle(el.parentElement).position,
        parentTop: el.parentElement.offsetTop,
        parentRight: window.innerWidth - (el.parentElement.offsetLeft + el.parentElement.offsetWidth)
      };
    });
    console.log('Docs button styles:', styles);
  } else {
    console.log('Docs button not found, checking for other buttons...');
    
    // Try to find any button in the header area
    const headerButtons = await page.locator('header button, .header button, [class*="header"] button').all();
    console.log('Found', headerButtons.length, 'header buttons');
    
    for (let i = 0; i < Math.min(3, headerButtons.length); i++) {
      const text = await headerButtons[i].textContent();
      const box = await headerButtons[i].boundingBox();
      console.log(`Button ${i}: "${text}"`, box);
    }
  }
  
  // Keep browser open for inspection
  await page.waitForTimeout(5000);
  await browser.close();
})();