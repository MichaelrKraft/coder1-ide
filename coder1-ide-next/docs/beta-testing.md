# Beta Testing Guide - Multi-AI Platform Support

## Overview
The Beta environment provides a parallel testing ground for multi-AI platform features without affecting the stable Alpha (Claude-only) environment.

## Route Isolation Verification ✅

### Alpha Route (`/ide`)
- **Location**: `/app/ide/page.tsx`
- **Terminal Component**: Standard `Terminal` from `@/components/terminal/LazyTerminal`
- **Features**: Claude Code only
- **Status**: Stable, production-ready
- **Access**: Always available

### Beta Route (`/ide-beta`)
- **Location**: `/app/ide-beta/page.tsx`  
- **Terminal Component**: `BetaTerminal` from `@/components/terminal/BetaTerminal`
- **Features**: Multi-AI platform support
- **Status**: Experimental
- **Access**: Controlled by environment variable

## Enabling Beta Features

### 1. Set Environment Variables
```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local and set:
NEXT_PUBLIC_ENABLE_BETA_ROUTE=true
ENABLE_MULTI_AI_DETECTION=true
ENABLE_UNIVERSAL_MEMORY=true
```

### 2. Install AI CLI Tools
The Beta terminal will automatically detect installed AI CLI tools:

```bash
# Claude Code (primary)
# Install from https://claude.ai/code

# OpenAI CLI
npm install -g openai

# GitHub Copilot CLI
gh extension install github/gh-copilot

# Aider
pip install aider-chat

# Ollama (for local models)
# Download from https://ollama.ai
ollama pull codellama
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Access Beta Features
- Navigate to `http://localhost:3001/ide-beta`
- If not enabled, you'll see "Beta Access Not Enabled" message
- If enabled, you'll see the Beta warning banner

## Beta Terminal Features

### Multi-AI Platform Support
- **Platform Selector**: Dropdown in terminal header to switch between AI platforms
- **Auto-Detection**: Automatically detects installed AI CLI tools
- **Authentication Status**: Shows which platforms are authenticated
- **Platform Switching**: Seamlessly switch between different AI providers

### Universal AI Commands
```bash
# Universal AI prefix (uses active platform)
ai: help me write a React component

# Platform-specific prefixes
claude: explain this code
openai: generate unit tests
aider: refactor this function
ollama: optimize this algorithm
```

### Smart Memory Context
- Previous conversations are automatically injected as context
- Token-limited to prevent context window overflow (2000 tokens max)
- Works across all AI platforms

### Visual Indicators
- **Beta Banner**: Orange/yellow gradient warning banner
- **Platform Status**: Shows active platform in terminal status bar
- **Authentication Icons**: Green checkmarks for authenticated platforms
- **Platform Count**: Displays total available platforms

## Testing Checklist

### Route Isolation ✅
- [x] Alpha route (`/ide`) uses standard Terminal component
- [x] Beta route (`/ide-beta`) uses BetaTerminal component
- [x] Beta route requires environment variable to be enabled
- [x] No shared state between Alpha and Beta routes
- [x] Alpha functionality remains unchanged

### Multi-AI Features
- [ ] Platform detection works correctly
- [ ] Platform switching changes active CLI
- [ ] Universal `ai:` prefix routes to active platform
- [ ] Platform-specific prefixes work
- [ ] Context injection maintains token limits
- [ ] Memory persistence across platforms

### UI/UX
- [ ] Platform selector dropdown functions properly
- [ ] Visual indicators update correctly
- [ ] Beta warning banner displays
- [ ] No visual regression in Alpha route

## Monitoring & Metrics

### Key Metrics to Track
1. **Platform Usage**: Which AI platforms are most used
2. **Switch Frequency**: How often users switch platforms
3. **Token Efficiency**: Average tokens saved through smart context
4. **Error Rates**: Platform-specific failure rates
5. **Response Times**: Performance comparison across platforms

### Debug Information
Enable debug logging:
```bash
# In .env.local
CLI_PUPPETEER_DEBUG=true
```

Check browser console for:
- Platform detection results
- Context injection details
- API wrapper operations
- Memory service activity

## Known Limitations

1. **Platform Availability**: Some CLI tools may require paid subscriptions
2. **Authentication**: Each platform needs separate authentication
3. **Context Compatibility**: Not all platforms support the same context formats
4. **Local Models**: Ollama requires significant system resources
5. **Rate Limits**: Each platform has different rate limiting

## Rollback Plan

If Beta features cause issues:

1. **Immediate Disable**: Set `NEXT_PUBLIC_ENABLE_BETA_ROUTE=false`
2. **Users Redirected**: Beta route will show "not enabled" message
3. **Alpha Unaffected**: `/ide` route continues working normally
4. **No Data Loss**: All sessions and memory preserved

## Future Enhancements

### Phase 2 - Advanced Features
- [ ] AI Arbitrage Engine (route to cheapest capable model)
- [ ] Cross-platform session handoff
- [ ] Unified billing dashboard
- [ ] Performance benchmarking tools

### Phase 3 - Enterprise Features
- [ ] Team platform preferences
- [ ] Compliance controls
- [ ] Usage analytics
- [ ] Cost optimization reports

## Support & Feedback

- **Report Issues**: Create GitHub issues with `[BETA]` tag
- **Feature Requests**: Use `[BETA-FEATURE]` tag
- **Discussions**: Join #beta-testing channel

---

*Last Updated: January 2025*
*Beta Version: 0.1.0*