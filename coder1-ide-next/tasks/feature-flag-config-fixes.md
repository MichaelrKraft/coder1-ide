# Feature Flag and Configuration Fixes

## Fix 1: Add `multiAIPlatformsEnabled` to FeatureFlags interface [DONE]
- [x] In `lib/feature-flags.ts`, add `multiAIPlatformsEnabled: boolean` to the `FeatureFlags` interface
- [x] Add env var read `NEXT_PUBLIC_ENABLE_MULTI_AI_DETECTION` with default `false`

## Fix 2: Feature flag persistence is localStorage-only [DONE]
- [x] In `config/feature-flags.ts`, update `load()` to merge env vars as source of truth over localStorage
- [x] In `persist()`, keep localStorage write as client-side cache (no change needed)

## Fix 3: Free tier license server call [DONE - NO CHANGE NEEDED]
- [x] Verified: `validateLicense()` already checks `licenseKey === 'free-trial' || !licenseKey` at line 83 and returns `createFreeTrial()` before `validateOnline()` is ever called. Free tier never makes a network request.

## Fix 4: Free tier caps are adoption killers [DONE]
- [x] In `services/license-service.ts` `createFreeTrial()`, changed `validUntil` from 1 day to 365 days
- [x] In `services/license-service.ts` `getFeaturesForTier('free')`, set `memoryPersistence: true` and `unlimitedProjects: true`
- [x] In `lib/feature-gate.ts`, the project limit check (`canCreateProject`) and memory expiration display (`getFeatureStatus`) are derived from these booleans -- they now automatically show "Unlimited" and "Never" for free tier

## Fix 5: CLI detector client is a permanent mock [DOCUMENTED]
- [x] `services/ai-platform/cli-detector-client.ts` is a **browser-safe mock** that returns hardcoded `MOCK_PLATFORMS` data (Claude Code installed+authenticated, OpenAI installed but not authenticated, GitHub Copilot installed+authenticated). It simulates a 500ms delay and caches the result.
- [x] The real server-side implementation is `services/ai-platform/cli-detector.ts` which uses `execSync` to run shell commands (`claude --version`, `gh auth status`, etc.) to detect actual CLI installations.
- [x] To make the client real, it would need to call an API route (e.g., `GET /api/ai-platforms/detect`) that runs the server-side `CLIDetector.detectAll()` and returns the results. The client would then replace its mock data with the API response.

## Verification [DONE]
- [x] `npx tsc --noEmit 2>&1 | grep "feature-flag\|license"` -- zero errors in changed files
- [x] Only pre-existing errors in `__tests__/test-utils/test-helpers.ts` (unrelated syntax errors)

---

## Review

### Files Modified
| File | Change |
|------|--------|
| `lib/feature-flags.ts` | Added `multiAIPlatformsEnabled` to interface + env var mapping |
| `config/feature-flags.ts` | Updated `load()` to merge env var overrides on top of localStorage |
| `services/license-service.ts` | Free tier: 365-day validity, `memoryPersistence: true`, `unlimitedProjects: true` |

### Files NOT Modified
| File | Reason |
|------|--------|
| `services/license-service.ts` `validateLicense()` | Already early-returns for free tier before network call |
| `lib/feature-gate.ts` | Derives limits from `LicenseFeatures` booleans -- auto-updated |
| `services/ai-platform/cli-detector-client.ts` | Mock documented only per instructions |
| `services/ai-platform/cli-detector.ts` | Server-side real detector -- no changes needed |

### Impact Assessment
- **Fix 1**: Any code checking `features().multiAIPlatformsEnabled` will now compile. Previously this would have been a TS error.
- **Fix 2**: Feature flags set via Render env vars will now take effect even if a user has stale values in localStorage.
- **Fix 3**: No change -- already correct.
- **Fix 4**: Free tier users get unlimited projects and persistent memory. The only gated features remaining for free tier are: `searchHistory`, `teamCollaboration`, `prioritySupport`, `customIntegrations`.
- **Fix 5**: To make CLI detection real, create `GET /api/ai-platforms/detect` that calls server-side `CLIDetector.detectAll()`. The client would fetch this route instead of returning `MOCK_PLATFORMS`.
