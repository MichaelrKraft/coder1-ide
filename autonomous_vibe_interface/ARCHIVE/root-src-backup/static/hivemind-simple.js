/**
 * Simple Hivemind Button Injection
 * 
 * Aggressive approach that injects the button regardless of container detection
 */

(function() {
    'use strict';
    
    let hivemindModal = null;
    let currentSessionId = null;
    
    console.log('🧠 Simple Hivemind injection starting...');
    
    function forceInjectButton() {
        // Check if button already exists
        if (document.getElementById('hivemind-button')) {
            console.log('Hivemind button already exists');
            return;
        }
        
        console.log('🔍 Searching for ANY button container...');
        
        // Strategy 1: Look for any element containing multiple buttons
        const allButtons = document.querySelectorAll('button');
        console.log(`Found ${allButtons.length} total buttons`);
        
        if (allButtons.length > 0) {
            // Find the first button that has siblings (likely in a toolbar)
            let targetContainer = null;
            
            for (let i = 0; i < allButtons.length; i++) {
                const btn = allButtons[i];
                const parent = btn.parentElement;
                
                if (parent) {
                    const siblingButtons = parent.querySelectorAll('button');
                    if (siblingButtons.length >= 2) {
                        targetContainer = parent;
                        console.log(`✅ Found button container with ${siblingButtons.length} buttons:`, targetContainer);
                        break;
                    }
                }
            }
            
            // If no multi-button container found, use the first button's parent
            if (!targetContainer && allButtons.length > 0) {
                targetContainer = allButtons[0].parentElement;
                console.log('📌 Using first button parent as fallback:', targetContainer);
            }
            
            if (targetContainer) {
                // Create and inject the Hivemind button
                const hivemindButton = document.createElement('button');
                hivemindButton.id = 'hivemind-button';
                hivemindButton.innerHTML = '🧠 Hive Mind';
                hivemindButton.title = 'Open Hivemind Dashboard';
                
                // Copy styles from first existing button
                const existingButton = targetContainer.querySelector('button');
                if (existingButton) {
                    const styles = window.getComputedStyle(existingButton);
                    Object.assign(hivemindButton.style, {
                        backgroundColor: styles.backgroundColor,
                        color: styles.color,
                        border: styles.border,
                        borderRadius: styles.borderRadius,
                        padding: styles.padding,
                        fontSize: styles.fontSize,
                        fontFamily: styles.fontFamily,
                        fontWeight: styles.fontWeight,
                        height: styles.height,
                        cursor: 'pointer',
                        marginLeft: '8px'
                    });
                } else {
                    // Fallback styles
                    Object.assign(hivemindButton.style, {
                        backgroundColor: '#7aa2f7',
                        color: '#1a1b26',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginLeft: '8px'
                    });
                }
                
                // Add click handler
                hivemindButton.addEventListener('click', openHivemindModal);
                
                // Inject the button
                targetContainer.appendChild(hivemindButton);
                console.log('✅ Hivemind button injected successfully!');
                return true;
            }
        }
        
        // Strategy 2: If no buttons found, inject into body as floating button
        console.log('⚠️ No suitable container found, creating floating button');
        
        const floatingButton = document.createElement('button');
        floatingButton.id = 'hivemind-button';
        floatingButton.innerHTML = '🧠 Hive Mind';
        floatingButton.title = 'Open Hivemind Dashboard';
        
        Object.assign(floatingButton.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#7aa2f7',
            color: '#1a1b26',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            zIndex: '9999',
            boxShadow: '0 4px 12px rgba(122, 162, 247, 0.3)',
            transition: 'all 0.2s ease'
        });
        
        floatingButton.addEventListener('click', openHivemindModal);
        floatingButton.addEventListener('mouseenter', () => {
            floatingButton.style.transform = 'scale(1.05)';
        });
        floatingButton.addEventListener('mouseleave', () => {
            floatingButton.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(floatingButton);
        console.log('✅ Floating Hivemind button created!');
        return true;
    }
    
    function openHivemindModal() {
        if (hivemindModal) {
            hivemindModal.style.display = 'flex';
            return;
        }
        
        console.log('🎯 Opening Hivemind modal...');
        
        // Create simple modal
        hivemindModal = document.createElement('div');
        Object.assign(hivemindModal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10000',
            fontFamily: 'Inter, sans-serif'
        });
        
        const modalContent = document.createElement('div');
        Object.assign(modalContent.style, {
            backgroundColor: '#24283b',
            borderRadius: '12px',
            padding: '24px',
            width: '600px',
            maxWidth: '90vw',
            color: '#c0caf5',
            position: 'relative'
        });
        
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #7aa2f7; font-size: 24px;">🧠 Hivemind Dashboard</h2>
                <button onclick="this.closest('[style*=\"fixed\"]').style.display='none'" 
                        style="background: none; border: none; color: #c0caf5; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            
            <div style="margin-bottom: 20px; padding: 16px; background: #1a1b26; border-radius: 8px;">
                <button onclick="startDemo()" style="
                    background: #7aa2f7; 
                    color: #1a1b26; 
                    border: none; 
                    border-radius: 6px; 
                    padding: 10px 16px; 
                    margin-right: 10px; 
                    cursor: pointer; 
                    font-weight: 500;
                ">Start Demo Session</button>
                <span id="session-status" style="color: #9ece6a;">Ready to start</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: #1a1b26; padding: 12px; border-radius: 8px; border: 2px solid #7aa2f7;">
                    <div style="font-weight: 600; color: #7aa2f7; margin-bottom: 8px;">👑 Agent 1 (Queen)</div>
                    <div style="font-size: 13px; margin-bottom: 4px;">Status: Coordinating</div>
                    <div style="font-size: 12px; color: #565f89;">Tasks completed: 5</div>
                </div>
                <div style="background: #1a1b26; padding: 12px; border-radius: 8px; border: 1px solid #414868;">
                    <div style="font-weight: 600; color: #c0caf5; margin-bottom: 8px;">🤖 Agent 2</div>
                    <div style="font-size: 13px; margin-bottom: 4px;">Status: Coding</div>
                    <div style="font-size: 12px; color: #565f89;">Tasks completed: 3</div>
                </div>
                <div style="background: #1a1b26; padding: 12px; border-radius: 8px; border: 1px solid #414868;">
                    <div style="font-weight: 600; color: #c0caf5; margin-bottom: 8px;">🤖 Agent 3</div>
                    <div style="font-size: 13px; margin-bottom: 4px;">Status: Testing</div>
                    <div style="font-size: 12px; color: #565f89;">Tasks completed: 2</div>
                </div>
            </div>
            
            <div style="background: #1a1b26; padding: 16px; border-radius: 8px;">
                <h4 style="margin: 0 0 12px 0; color: #7aa2f7;">Shared Context & Discoveries</h4>
                <div style="font-size: 13px; line-height: 1.5;">
                    <div style="margin-bottom: 8px;">✅ Identified optimal React component structure</div>
                    <div style="margin-bottom: 8px;">✅ Found reusable utility functions</div>
                    <div style="margin-bottom: 8px;">✅ Established TypeScript configuration</div>
                    <div style="color: #565f89;">Collaboration active • Real-time sync enabled</div>
                </div>
            </div>
        `;
        
        // Add global startDemo function
        window.startDemo = function() {
            document.getElementById('session-status').textContent = 'Demo session active!';
            console.log('🎉 Hivemind demo session started');
        };
        
        hivemindModal.appendChild(modalContent);
        document.body.appendChild(hivemindModal);
        
        console.log('✅ Hivemind modal created!');
    }
    
    // Try injection multiple times with different delays
    function attemptInjection() {
        console.log('🔄 Attempting button injection...');
        
        if (forceInjectButton()) {
            console.log('🎉 Injection successful!');
            return;
        }
        
        // Retry after a delay
        setTimeout(attemptInjection, 2000);
    }
    
    // Start injection attempts
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptInjection);
    } else {
        attemptInjection();
    }
    
    // Also try after longer delays in case React is still loading
    setTimeout(attemptInjection, 3000);
    setTimeout(attemptInjection, 5000);
    
    // Expose for manual testing
    window.forceHivemind = {
        inject: forceInjectButton,
        openModal: openHivemindModal
    };
    
    console.log('🧠 Simple Hivemind ready! Try window.forceHivemind.inject() or window.forceHivemind.openModal()');
    
})();