// API configuration and utility functions

// Get the API URL from the current window location
export const getApiUrl = () => {
  // If we're running on localhost:3001 (development), use localhost:3002
  // Otherwise, use the same host and port as the current page
  const currentPort = window.location.port;
  const currentHost = window.location.hostname;
  
  if (currentPort === '3001') {
    // Development mode - React dev server running on 3001, API on 3000
    return `http://${currentHost}:3000`;
  } else {
    // Production mode - API on same host/port as the served page
    return `${window.location.protocol}//${currentHost}:${currentPort || '80'}`;
  }
};

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Make authenticated API request
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  console.log('🟡 [authenticatedFetch] Called with URL:', url);
  console.log('🟡 [authenticatedFetch] Options:', options);
  
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  
  console.log('🟡 [authenticatedFetch] Token exists?', !!token);
  console.log('🟡 [authenticatedFetch] API URL:', apiUrl);
  
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;
  console.log('🟡 [authenticatedFetch] Full URL:', fullUrl);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add existing headers if they're an object
  if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
    Object.assign(headers, options.headers);
  }
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  console.log('🟡 [authenticatedFetch] Final headers:', headers);
  console.log('🟡 [authenticatedFetch] About to make fetch request...');
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    console.log('🟡 [authenticatedFetch] Response received:', response);
    console.log('🟡 [authenticatedFetch] Response status:', response.status);
    return response;
  } catch (error) {
    console.error('🔴 [authenticatedFetch] FETCH ERROR:', error);
    throw error;
  }
};

// Socket.IO connection with auth
export const createAuthenticatedSocket = () => {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  
  const socketOptions: any = {
    transports: ['websocket'],
  };
  
  if (token) {
    socketOptions.auth = {
      token: token
    };
  }
  
  // Import socket.io-client dynamically to avoid circular dependencies
  const io = require('socket.io-client').default;
  return io(apiUrl, socketOptions);
};