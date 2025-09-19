# Cloudflare Configuration for Coder1 Bridge Production Deployment

## Overview
Configuration guide for routing Claude Code OAuth requests and WebSocket connections through Cloudflare to the unified Render service.

## Domain Configuration

### DNS Settings
```
CNAME  coder1          coder1-ide-production.onrender.com
CNAME  bridge          coder1-ide-production.onrender.com  
CNAME  api             coder1-ide-production.onrender.com
```

### SSL/TLS Settings
- **SSL/TLS encryption mode**: Full (strict)
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON
- **HSTS**: Enable with 6 months max-age

## Page Rules Configuration

### 1. WebSocket Support Rule
**Pattern**: `coder1.yourdomain.com/*`
```
Cache Level: Bypass
Browser Integrity Check: OFF
Security Level: Medium
```

### 2. API Route Optimization  
**Pattern**: `coder1.yourdomain.com/api/*`
```
Cache Level: Bypass
Browser Cache TTL: 30 minutes
Edge Cache TTL: 2 hours
```

### 3. Static Assets Caching
**Pattern**: `coder1.yourdomain.com/_next/static/*`
```
Cache Level: Cache Everything
Browser Cache TTL: 1 year
Edge Cache TTL: 1 month
```

## Worker Script for Advanced Routing

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle WebSocket upgrade requests
  if (request.headers.get('Upgrade') === 'websocket') {
    return handleWebSocket(request)
  }
  
  // Handle Claude Code OAuth callbacks
  if (url.pathname.startsWith('/auth/claude/')) {
    return handleClaudeOAuth(request)
  }
  
  // Handle Bridge API requests
  if (url.pathname.startsWith('/api/bridge/')) {
    return handleBridgeAPI(request)
  }
  
  // Pass through to Render
  return fetch(request)
}

function handleWebSocket(request) {
  // Ensure proper WebSocket headers are preserved
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      'X-Forwarded-Proto': 'https',
      'X-Real-IP': request.headers.get('CF-Connecting-IP')
    }
  })
  
  return fetch(newRequest)
}

function handleClaudeOAuth(request) {
  // Add security headers for OAuth flow
  const response = fetch(request)
  
  response.then(res => {
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  })
  
  return response
}

function handleBridgeAPI(request) {
  // Add CORS headers for Bridge API
  const response = fetch(request)
  
  response.then(res => {
    res.headers.set('Access-Control-Allow-Origin', 'https://coder1.yourdomain.com')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  })
  
  return response
}
```

## Firewall Rules

### Allow Claude Code OAuth
```
(http.request.uri.path contains "/auth/claude/" and ip.geoip.country in {"US" "CA" "GB" "AU" "DE" "FR"}) then Allow
```

### Rate Limiting for API
```
(http.request.uri.path contains "/api/" and cf.threat_score gt 10) then Challenge
```

### Block Known Bad Actors
```
(cf.threat_score gt 30 or ip.geoip.country in {"CN" "RU" "KP"}) then Block
```

## WebSocket Configuration

### Headers to Preserve
```
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: [client-generated]
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: [if present]
```

### Custom Headers to Add
```
X-Forwarded-Proto: https
X-Real-IP: [CF-Connecting-IP]
X-Cloudflare-Ray: [CF-RAY]
```

## Security Headers

### Content Security Policy
```
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
style-src 'self' 'unsafe-inline'; 
connect-src 'self' wss://coder1.yourdomain.com ws://coder1.yourdomain.com; 
font-src 'self' data:; 
img-src 'self' data: https:;
```

### Additional Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Caching Strategy

### Never Cache
- `/api/auth/*` - Authentication endpoints
- `/api/bridge/*` - Bridge API calls
- `/api/sessions/*` - Session management
- WebSocket upgrade requests

### Cache Aggressively  
- `/_next/static/*` - Next.js static assets
- `/favicon.ico` - Icons and static files
- `/assets/*` - Public assets

### Cache with Validation
- `/api/health` - Health checks (5 min)
- `/api/docs/*` - Documentation (1 hour)

## Health Check Configuration

### Endpoint
```
GET https://coder1.yourdomain.com/api/health
```

### Expected Response
```json
{
  "status": "healthy",
  "services": {
    "bridge": "connected",
    "oauth": "available",
    "websocket": "active"
  },
  "version": "1.0.0"
}
```

### Monitoring Alert Conditions
- Response time > 5 seconds
- Status code != 200  
- Bridge service != "connected"
- More than 3 failures in 5 minutes

## Performance Optimization

### Compression
- Enable Brotli compression for text assets
- Gzip fallback for older clients
- Compress JSON API responses

### Minification
- Auto-minify HTML, CSS, JavaScript
- Preserve source maps for debugging
- Exclude API responses from minification

### Image Optimization
- Enable Polish for image compression
- WebP format conversion when supported
- Responsive image delivery

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check: Browser Integrity Check is OFF
   - Check: WebSocket headers are preserved
   - Check: No proxy timeout limits

2. **OAuth Redirect Fails**
   - Check: HTTPS enforcement is enabled
   - Check: Redirect URI matches exactly
   - Check: No extra slashes in URL

3. **API Calls Return 525 Error**
   - Check: SSL/TLS mode is "Full (strict)"
   - Check: Origin server certificate is valid
   - Check: Render service is responding

4. **Slow Performance**
   - Check: Page Rules are configured correctly
   - Check: Static assets are cached
   - Check: Compression is enabled

### Debug Commands
```bash
# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" https://coder1.yourdomain.com/

# Test OAuth endpoint
curl -v https://coder1.yourdomain.com/auth/claude/login

# Test API health
curl -v https://coder1.yourdomain.com/api/health
```

## Implementation Checklist

- [ ] Configure DNS records (CNAME)
- [ ] Set SSL/TLS to Full (strict)
- [ ] Create Page Rules for WebSocket support
- [ ] Deploy Cloudflare Worker (if using advanced routing)
- [ ] Configure Firewall Rules
- [ ] Set up security headers
- [ ] Configure caching strategy
- [ ] Set up health check monitoring
- [ ] Test WebSocket connections
- [ ] Test Claude Code OAuth flow
- [ ] Verify API routing
- [ ] Monitor performance metrics

## Production Deployment Notes

1. **Domain**: Replace `yourdomain.com` with actual domain
2. **Render URL**: Use actual Render service URL from deployment
3. **OAuth URLs**: Update Claude Code OAuth configuration with Cloudflare URLs
4. **Monitoring**: Set up Cloudflare Analytics and alerts
5. **Backup**: Document all configuration for disaster recovery

This configuration ensures optimal performance, security, and reliability for the Coder1 Bridge production deployment through Cloudflare.