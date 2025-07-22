# Autonomous Vibe Interface

AI-powered web development platform with intelligent requirements gathering.

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

## API Endpoints

- `GET /health` - Health check
- `POST /api/agent/analyze-requirements` - Analyze project requirements
- `POST /api/agent/create-project` - Create a new project
- `GET /api/agent/status` - Check agent status

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
- `OPENAI_API_KEY` - For AI features
- `ANTHROPIC_API_KEY` - For Claude integration

Optional:
- `AIRTOP_API_KEY` - For browser automation features
- `PORT` - Server port (default: 3000, Render uses 10000)