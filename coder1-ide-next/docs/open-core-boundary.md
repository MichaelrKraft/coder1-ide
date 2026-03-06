# Open Core Boundary

## What's Open Source (MIT License)

### Multi-Provider Core
- `interfaces/AIProviderService.ts` — provider interface
- `services/ai-platform/provider-factory.ts` — provider registry
- `services/ai-platform/cli-detector.ts` — CLI auto-detection
- `services/ai-platform/codex-cli-service.ts` — Codex CLI provider
- `packages/ai-provider-protocol/` — `@coder1/ai-provider-protocol` npm package

### IDE Core
- Terminal (xterm.js integration)
- Monaco Editor integration
- Session management + checkpoints
- Timeline replay
- Local memory (SQLite)

### Skills + Commands
- Hooks system
- Slash commands framework
- Skills framework

## What's Private (Proprietary)

### Revenue-Generating Features
- `services/ai-platform/shared-memory-service.ts` `transformForPlatform()` — prompt reformatting IP
- Cross-user real-time collaboration WebSocket infrastructure
- Admin dashboard + billing + seat management
- SSO / SCIM implementation
- Token cost attribution dashboard

### Not Ready for OSS
- `services/sandbox-metrics-service.ts` — Lighthouse scores are randomized mocks
- `services/sandbox-preview-service.ts` — same

## Third-Party Provider Guide

To add a new AI CLI provider to Coder1:

1. Install the protocol: `npm i @coder1/ai-provider-protocol`
2. Implement `AIProviderService` interface
3. Register with `registerProvider('name', new MyProvider())`
4. Submit PR to `coder1-providers` community registry

See `services/ai-platform/codex-cli-service.ts` as a reference implementation.
