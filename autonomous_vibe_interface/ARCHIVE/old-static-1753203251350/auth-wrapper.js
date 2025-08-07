// Authentication wrapper for IDE
(function() {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        // Redirect to login if not authenticated
        window.location.href = '/login.html';
        return;
    }
    
    // Verify token is still valid
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(response => {
        if (!response.ok) {
            // Token is invalid, redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('userEmail');
            window.location.href = '/login.html';
        }
    }).catch(() => {
        // Network error, let user continue but may have issues
        console.warn('Could not verify authentication');
    });
    
    // Add authentication header to all API requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        let [url, config] = args;
        
        // Only add auth header to API requests
        if (url && url.toString().includes('/api/')) {
            config = config || {};
            config.headers = config.headers || {};
            
            // Add auth token if not already present
            if (!config.headers['Authorization']) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return originalFetch(url, config);
    };
    
    // WebSocket authentication
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        
        // Send authentication on connection
        const originalOnOpen = ws.onopen;
        ws.onopen = function(event) {
            // Send auth token
            ws.send(JSON.stringify({
                type: 'auth',
                token: token
            }));
            
            // Call original handler if exists
            if (originalOnOpen) {
                originalOnOpen.call(ws, event);
            }
        };
        
        return ws;
    };
    
    // Add user info to page
    window.addEventListener('DOMContentLoaded', () => {
        const userEmail = localStorage.getItem('userEmail');
        
        // Try to add user info to header if element exists
        setTimeout(() => {
            const headerRight = document.querySelector('.header-right');
            if (headerRight && userEmail) {
                const userInfo = document.createElement('div');
                userInfo.className = 'user-info';
                userInfo.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-right: 20px;';
                userInfo.innerHTML = `
                    <span style="color: #666; font-size: 14px;">${userEmail}</span>
                    <a href="/dashboard.html" style="color: #007bff; text-decoration: none; font-size: 14px;">Dashboard</a>
                    <button onclick="logout()" style="padding: 6px 12px; background: #333; border: 1px solid #444; border-radius: 4px; color: #e0e0e0; cursor: pointer; font-size: 14px;">Logout</button>
                `;
                headerRight.insertBefore(userInfo, headerRight.firstChild);
            }
        }, 1000);
    });
    
    // Global logout function
    window.logout = function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
        window.location.href = '/login.html';
    };
})();