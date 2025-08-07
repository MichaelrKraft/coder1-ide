// API Configuration Override
// This file dynamically configures API endpoints based on the current environment

(function() {
  // Determine the API base URL based on current location
  const getApiBaseUrl = () => {
    const { protocol, hostname } = window.location;
    
    // In production, use same origin
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '';
    }
    
    // For local development, always use port 3002 where our server is running
    return `${protocol}//${hostname}:3002`;
  };

  const API_BASE_URL = getApiBaseUrl();
  
  // Store the original fetch
  const originalFetch = window.fetch;
  
  // Get auth token
  const getAuthToken = () => localStorage.getItem('authToken');
  
  // Override fetch to intercept API calls
  window.fetch = function(url, options = {}) {
    // Convert URL to string if it's a URL object
    const urlString = url.toString();
    
    // Check if this is an API call to localhost:3002
    if (urlString.includes('localhost:3002') || urlString.includes('127.0.0.1:3002')) {
      // Replace with dynamic base URL
      const newUrl = urlString
        .replace('http://localhost:3002', API_BASE_URL)
        .replace('http://127.0.0.1:3002', API_BASE_URL)
        .replace('https://localhost:3002', API_BASE_URL)
        .replace('https://127.0.0.1:3002', API_BASE_URL);
      
      // Add auth header for API calls
      const token = getAuthToken();
      if (token && newUrl.includes('/api/')) {
        options = options || {};
        options.headers = options.headers || {};
        if (!options.headers['Authorization']) {
          options.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      console.log(`API redirect: ${urlString} -> ${newUrl}`);
      console.log('Request options:', options);
      console.log('Auth token:', token ? 'Present' : 'Missing');
      return originalFetch(newUrl, options);
    }
    
    // For relative API URLs, prepend base URL if needed
    if (urlString.startsWith('/api/')) {
      const newUrl = API_BASE_URL + urlString;
      console.log(`API request: ${newUrl}`);
      return originalFetch(newUrl, options);
    }
    
    // Pass through all other requests unchanged
    return originalFetch(url, options);
  };
  
  // Also override XMLHttpRequest for older code
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    // Convert URL to string
    const urlString = url.toString();
    
    // Check if this is an API call to localhost:3002
    if (urlString.includes('localhost:3002') || urlString.includes('127.0.0.1:3002')) {
      const newUrl = urlString
        .replace('http://localhost:3002', API_BASE_URL)
        .replace('http://127.0.0.1:3002', API_BASE_URL)
        .replace('https://localhost:3002', API_BASE_URL)
        .replace('https://127.0.0.1:3002', API_BASE_URL);
      
      console.log(`XHR redirect: ${urlString} -> ${newUrl}`);
      return originalXHROpen.call(this, method, newUrl, ...args);
    }
    
    // For relative API URLs
    if (urlString.startsWith('/api/')) {
      const newUrl = API_BASE_URL + urlString;
      console.log(`XHR request: ${newUrl}`);
      return originalXHROpen.call(this, method, newUrl, ...args);
    }
    
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  // Export for debugging
  window.__API_CONFIG__ = {
    API_BASE_URL,
    version: '1.0.0'
  };
  
  console.log('API Configuration loaded:', window.__API_CONFIG__);
})();