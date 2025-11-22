/**
 * Browser Console Script: Clear Old Unfiltered Terminal Data
 * 
 * PURPOSE: Retroactively clean up localStorage data that was saved BEFORE
 * the CLI status message filters were added (January 2025).
 * 
 * WHEN TO USE:
 * - You see "Bash(claude) ⎿ Running… ctrl+b to run in background" repeating on every page load
 * - Fresh page loads show old terminal history instead of empty terminal
 * - Console shows "Hidden (2000+)" messages accumulating
 * 
 * HOW TO USE:
 * 1. Open browser DevTools (F12 or Cmd+Option+I)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to execute
 * 5. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
 * 
 * WHAT IT DOES:
 * - Clears terminalHistory from localStorage
 * - Clears any Console Capture Service data
 * - Preserves other IDE settings (activeFile, panel visibility, etc.)
 * - Reports what was cleared
 */

(function clearOldTerminalData() {
  console.log('🧹 Starting localStorage cleanup...');
  
  // Track what we're clearing
  const itemsCleared = [];
  
  // 1. Clear terminal history (main culprit for repeating messages)
  const terminalHistory = localStorage.getItem('terminalHistory');
  if (terminalHistory) {
    const sizeKB = (terminalHistory.length / 1024).toFixed(2);
    localStorage.removeItem('terminalHistory');
    itemsCleared.push(`terminalHistory (${sizeKB} KB)`);
    console.log(`✅ Cleared terminalHistory: ${sizeKB} KB of old data`);
  }
  
  // 2. Clear any Console Capture Service data
  const keysToCheck = [
    'consoleCaptureService',
    'capturedErrors',
    'console-capture-errors'
  ];
  
  keysToCheck.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      itemsCleared.push(key);
      console.log(`✅ Cleared ${key}`);
    }
  });
  
  // 3. Clear sessionStorage terminal data
  if (sessionStorage.getItem('terminalHistory')) {
    sessionStorage.removeItem('terminalHistory');
    itemsCleared.push('sessionStorage.terminalHistory');
    console.log('✅ Cleared sessionStorage.terminalHistory');
  }
  
  // 4. Report results
  console.log('\n📊 CLEANUP SUMMARY:');
  if (itemsCleared.length > 0) {
    console.log(`   Cleared ${itemsCleared.length} items:`);
    itemsCleared.forEach(item => console.log(`   - ${item}`));
    console.log('\n✅ CLEANUP COMPLETE!');
    console.log('   Next steps:');
    console.log('   1. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('   2. Terminal should now be empty on fresh load');
    console.log('   3. Console should be clean (no "Hidden" messages)');
  } else {
    console.log('   No old data found - localStorage is already clean! ✨');
    console.log('   If you still see issues, try:');
    console.log('   1. Clear browser cache completely');
    console.log('   2. Restart the dev server (npm run dev)');
    console.log('   3. Try incognito/private browsing mode');
  }
  
  // 5. Preserve important settings (just report them)
  const preserved = [];
  ['ide-activeFile', 'ide-openFiles', 'ide-explorerVisible', 'ide-terminalVisible', 'ide-terminalSessionId'].forEach(key => {
    if (localStorage.getItem(key)) {
      preserved.push(key);
    }
  });
  
  if (preserved.length > 0) {
    console.log('\n💾 PRESERVED SETTINGS:');
    preserved.forEach(item => console.log(`   - ${item}`));
  }
})();
