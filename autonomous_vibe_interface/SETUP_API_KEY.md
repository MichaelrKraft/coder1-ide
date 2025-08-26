# Setting Up Your Claude API Key for Coder1

## Quick Setup

1. **Edit the `.env.local` file**:
   ```bash
   nano .env.local
   ```

2. **Replace `your-actual-api-key-here` with your real Anthropic API key**:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-YOUR-ACTUAL-KEY-HERE
   CLAUDE_CODE_API_KEY=sk-ant-api03-YOUR-ACTUAL-KEY-HERE
   ```

3. **Save the file and restart the server**:
   - Press `Ctrl+X`, then `Y`, then `Enter` to save in nano
   - The server will auto-restart with nodemon

## Getting Your API Key

1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-api03-`)

## Verify It's Working

After adding your key and the server restarts:

1. Go to http://localhost:3000/ide
2. Click the Terminal tab
3. Click the **Parallel Agents** button
4. You should see real AI responses instead of demo messages

## Features That Will Work With API Key

✅ **Parallel Agents**: 3 specialized AI agents working simultaneously
✅ **Hivemind Mode**: Coordinated AI team collaboration
✅ **Infinite Loop**: Iterative AI improvement cycles
✅ **Supervision**: AI monitoring and guidance
✅ **Smart Context**: AI with project awareness

## Security Notes

- Never commit `.env.local` to git (it's already in .gitignore)
- Keep your API key secret
- Use environment variables in production
- Rotate keys regularly for security

## Troubleshooting

If you still see "demo mode" after adding your key:

1. Check the server logs for errors
2. Verify your API key is valid
3. Ensure `.env.local` is in the root directory
4. Try restarting the server manually: `npm run dev`

## Current Status

The system is configured to:
- Load API keys from `.env.local` (priority) or `.env`
- Use the key for all AI features in Coder1
- Fall back to demo mode if no valid key is found

Once you add your API key to `.env.local`, all AI features will use real Claude responses!