#!/usr/bin/env node

// Simple HTTP and WebSocket proxy server for CoderOne IDE
// Forwards requests from port 3000 to port 3005 to fix terminal black screen issue
// This allows React IDE (hardcoded to port 3000) to connect to terminal services on port 3005

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

const app = express();
const server = http.createServer(app);

const PORT = 3000;
const TARGET_PORT = 3005;
const TARGET_URL = `http://localhost:${TARGET_PORT}`;

console.log('🔄 Starting CoderOne IDE Proxy Server...');
console.log(`📡 Proxy: Port ${PORT} -> Port ${TARGET_PORT}`);

// Create proxy middleware with proper configuration
const proxy = createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    ws: true,
    secure: false,
    logLevel: 'warn',
    // Preserve all headers properly
    preserveHeaderKeyCase: true,
    onProxyReq: (proxyReq, req, res) => {
        // Ensure proper headers are forwarded
        proxyReq.setHeader('Host', `localhost:${TARGET_PORT}`);
        // Only log main requests
        if (req.url === '/ide' || req.url === '/ide/') {
            console.log(`🔄 [HTTP] ${req.method} ${req.url} -> port ${TARGET_PORT}`);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // Ensure CORS headers are properly set for the IDE
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    },
    onProxyReqWs: (proxyReq, req, socket, head) => {
        console.log(`🔄 [WS] Proxying WebSocket: ${req.url} -> port ${TARGET_PORT}`);
        // Proper WebSocket header handling
        proxyReq.setHeader('Host', `localhost:${TARGET_PORT}`);
    },
    onError: (err, req, res) => {
        console.error('❌ [PROXY-ERROR]:', err.message);
        if (res && !res.headersSent) {
            res.status(500).json({ error: 'Proxy Error', message: err.message });
        }
    },
    onProxyReqWsError: (err, req, socket) => {
        console.error('❌ [WS-ERROR]:', err.message);
        if (socket && socket.readable) {
            socket.destroy();
        }
    }
});

// Apply proxy to all requests
app.use('/', proxy);

// Start the proxy server
server.listen(PORT, () => {
    console.log('🚀 CoderOne IDE Proxy Server started successfully!');
    console.log(`📊 Proxy running on: http://localhost:${PORT}`);
    console.log(`🎯 Target server: http://localhost:${TARGET_PORT}`);
    console.log(`🖥️ IDE accessible at: http://localhost:${PORT}/ide`);
    console.log(`💡 WebSocket proxy: ws://localhost:${PORT}/terminal -> ws://localhost:${TARGET_PORT}/terminal`);
    console.log('✅ Terminal should now work properly without black screen!');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Shutting down CoderOne IDE Proxy Server...');
    server.close(() => {
        console.log('✅ Proxy server shut down gracefully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 Shutting down CoderOne IDE Proxy Server...');
    server.close(() => {
        console.log('✅ Proxy server shut down gracefully');
        process.exit(0);
    });
});