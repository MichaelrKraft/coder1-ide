# Johnny5 Setup Wizard Simplification

## Objective
Simplify the Johnny5 Setup Wizard from 5 steps to 4 steps with proper API key validation.

## Current State
- 5 steps: Welcome, Integrations, Permissions, Behavior, Complete
- Includes Zapier/Telegram integrations (to be removed)
- Has daemon installation logic (to be removed)
- No API key validation

## New 4-Step Flow
1. **Welcome** - Meet Johnny5 branding
2. **API Key** - Anthropic API key input with real validation
3. **Permissions** - 4 toggles + proactivity slider
4. **Complete** - Quick start tips

## Tasks

- [x] 1. Update SetupWizard.tsx with new 4-step flow
  - Remove 'integrations' and 'behavior' steps
  - Add 'apikey' step
  - Simplify step type to: 'welcome' | 'apikey' | 'permissions' | 'complete'

- [x] 2. Rewrite Welcome step (Step 1)
  - Title: "Meet Johnny5"
  - Subtitle: "Your autonomous AI teammate that learns and grows with you"
  - "Get Started" button
  - Small "Skip" link

- [x] 3. Create API Key step (Step 2)
  - Title: "Connect to Claude"
  - API key input field
  - "Don't have a key?" link to console.anthropic.com
  - "Validate Key" button
  - Show validation status (loading, success, error)
  - Only allow proceed when validated

- [x] 4. Rewrite Permissions step (Step 3)
  - Title: "Set Johnny5's Permissions"
  - 4 toggles: readFiles (ON), suggestCode (ON), executeTerminal (OFF), externalRequests (OFF)
  - Add proactivity slider: Low - Medium - High
  - "Continue" button

- [x] 5. Rewrite Complete step (Step 4)
  - Title: "Johnny5 is Ready!"
  - Quick start tips
  - "Start Chatting" button

- [x] 6. Update API route to handle API key validation
  - Add action: 'validate-api-key' handler
  - Actually call Claude API with test message
  - Return success/error with details

- [x] 7. Remove old code
  - Remove ZapierMCPSetupCard import
  - Remove TelegramSetupCard import
  - Remove IntegrationState interface
  - Remove daemon installation logic
  - Remove unused icons

- [x] 8. Integrate with johnny5-config module
  - Use setApiKey, setPermissions, setProactivityLevel, markSetupComplete
  - Use isSetupComplete for skip logic

## Review

### Summary of Changes

**Files Modified:**

1. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/app/api/johnny5/setup/route.ts`
   - Completely rewrote the API route to use `johnny5-config` module
   - Added `validate-api-key` action that makes a real test call to Claude API
   - Added `save-config` action that saves API key (encrypted), permissions, and proactivity level
   - Removed old daemon installation logic
   - Removed old file-based config management (now uses johnny5-config module)

2. `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/components/johnny5/settings/SetupWizard.tsx`
   - Reduced from 5 steps to 4 steps: Welcome, API Key, Permissions, Complete
   - Removed Zapier/Telegram integration step entirely
   - Removed behavior step (merged proactivity slider into permissions step)
   - Added real API key validation with loading/success/error states
   - Added link to Anthropic console for getting API keys
   - Simplified permissions to 4 clear toggles with colored indicators
   - Added proactivity level selector (Low/Medium/High) with descriptions
   - Updated Complete step with quick start tips instead of setup summary
   - Removed unused imports (ZapierMCPSetupCard, TelegramSetupCard)

### Key Features

1. **API Key Validation**
   - Format validation (must start with `sk-ant-` and be 50+ chars)
   - Real Claude API test call to verify key works
   - Clear error messages for: invalid key, no credits, rate limited, network error
   - Shows connected model name on success

2. **Permissions UI**
   - 4 toggles with icons and descriptions
   - Color-coded by risk level (cyan, green, yellow, orange)
   - "Advanced" badges on terminal and external request permissions
   - Proactivity slider with contextual descriptions

3. **Config Persistence**
   - Uses `johnny5-config` module for encrypted API key storage
   - Saves to `~/.coder1/johnny5-config.json`
   - Marks setup as complete with timestamp

### API Endpoints

```
GET /api/johnny5/setup
  Returns: isSetupComplete, hasApiKey, permissions, proactivityLevel

POST /api/johnny5/setup
  action: 'validate-api-key', apiKey: string
  Returns: success, model (or error, errorType)

POST /api/johnny5/setup
  action: 'save-config', apiKey?, permissions, proactivityLevel
  Returns: success, configSummary
```
