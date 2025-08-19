# Autonomous Vibe Interface (Coder1)

AI-powered web development platform with intelligent requirements gathering, Monaco IDE, and Claude Code integration.

📋 **For complete project status, features, and documentation**: See [PROJECT_STATUS.md](./PROJECT_STATUS.md)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run locally:**
   ```bash
   npm start
   ```
   Visit http://localhost:3000

## Project Structure

```
autonomous-vibe-interface/
├── src/
│   ├── routes/        # API endpoints
│   ├── integrations/  # External service integrations
│   ├── middleware/    # Express middleware
│   └── app.js        # Main server file
├── public/           # Static files (homepage, assets)
├── package.json      # Dependencies
├── .env             # Environment variables (create from .env.example)
└── render.yaml      # Render deployment configuration
```

## Key Features

- **Smart PRD Generator**: AI-guided requirements gathering with wireframe generation
- **Monaco IDE**: Professional code editor with syntax highlighting and IntelliSense  
- **Terminal Integration**: Real PTY sessions with Claude Code supervision
- **AI Intelligence Systems**: 8 integrated AI systems for enhanced development

## Main URLs

- **Homepage/PRD Generator**: `http://localhost:3000`
- **Monaco IDE**: `http://localhost:3000/ide`
- **AI Monitor Dashboard**: `http://localhost:3000/ai-monitor.html`
- **Health Check**: `http://localhost:3000/health`

## Deployment

This project is configured for easy deployment on Render:

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Deploy update"
   git push origin main
   ```

2. Render will automatically deploy from your GitHub repository.

## Environment Variables

Required for production:
- `ANTHROPIC_API_KEY` - Primary Claude API integration
- `CLAUDE_CODE_API_KEY` - Claude Code CLI integration (preferred)
- `OPENAI_API_KEY` - Additional AI features
- `SESSION_SECRET` - Session encryption key

Optional:
- `AIRTOP_API_KEY` - Browser automation features
- `BYPASS_FRIEND_AUTH` - Set to 'true' to disable authentication (dev only)
- `PORT` - Server port (default: 3000)

## Documentation

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Complete project overview and status
- **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** - Deployment and configuration guide
- **[IDE_DEVELOPMENT_GUIDE.md](./IDE_DEVELOPMENT_GUIDE.md)** - Monaco IDE development guide
- **[TERMINAL_STARTUP_GUIDE.md](./TERMINAL_STARTUP_GUIDE.md)** - Terminal integration guide
- **[CANONICAL/README.md](./CANONICAL/README.md)** - File organization and structure

## Support

Contact Michael for beta access codes and technical assistance.