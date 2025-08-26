# Coder1 IDE - Docker Build & Deployment Instructions

## Prerequisites
- Docker Desktop installed ([download](https://www.docker.com/products/docker-desktop))
- 4GB free disk space
- Port 3000 available

## Quick Start - One-Line Install

For end users, simply run:
```bash
curl -sSL https://get.coder1.dev | bash
```

Or if testing locally:
```bash
./install.sh
```

## Manual Build Instructions

### 1. Build Docker Image

```bash
# Navigate to the project directory
cd /Users/michaelkraft/autonomous_vibe_interface

# Build the Docker image
docker build -t coder1/ide:latest .

# This will:
# - Install Node.js 18 and Python
# - Set up all dependencies
# - Configure MCP servers
# - Create data directories
# - Set up the entrypoint script
```

### 2. Run with Docker Compose (Recommended)

```bash
# Start Coder1 IDE
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop Coder1 IDE
docker-compose down
```

### 3. Manual Docker Run

```bash
# Create workspace directories
mkdir -p ~/Coder1/projects ~/Coder1/config ~/Coder1/cache

# Run container
docker run -d \
  --name coder1 \
  -p 3000:3000 \
  -p 80:3000 \
  -v ~/Coder1/projects:/workspace \
  -v ~/Coder1/config:/data/config \
  -v ~/Coder1/cache:/data/cache \
  -e BYPASS_FRIEND_AUTH=true \
  coder1/ide:latest

# Check container status
docker ps

# View logs
docker logs -f coder1
```

## Testing the Installation

### 1. Access the Application

- **With coder1.local**: http://coder1.local
- **Without domain setup**: http://localhost:3000

### 2. First-Time Setup

1. You'll be redirected to `/welcome` on first launch
2. Choose one of:
   - **Start Free Trial** - 7 days, 50 commands
   - **Enter License Key** - For paid users
   - **View Pricing** - See subscription options

### 3. Verify Features

After authentication, test these features:

1. **IDE Access**: Navigate to http://localhost:3000/ide
2. **Terminal**: Open terminal in IDE, run `claude --help`
3. **AI Dashboard**: Click 🧠 button in upper right
4. **File Operations**: Create/edit files in the editor
5. **Repository Intelligence**: Test MCP servers if enabled

## Environment Variables

Create a `.env` file for configuration:

```bash
# License Configuration
LICENSE_KEY=C1-USERNAME-XXXXXXXX  # For paid users
LICENSE_SECRET=your-secret-key    # For validation

# API Keys (optional)
ANTHROPIC_API_KEY=sk-ant-xxx      # Your Claude API key
OPENAI_API_KEY=sk-xxx             # OpenAI for fallback

# System Configuration
BYPASS_FRIEND_AUTH=true           # Required for Docker
ENABLE_MCP_SERVERS=true           # Enable repository intelligence
SESSION_SECRET=change-in-prod     # Session encryption
PORT=3000                         # Application port
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs coder1

# Verify ports are free
lsof -i :3000
lsof -i :80

# Remove and recreate
docker rm -f coder1
docker-compose up -d
```

### License Issues
```bash
# Check license status
curl http://localhost:3000/api/license/status

# Reset trial (remove trial file)
docker exec coder1 rm /data/config/trial.json
```

### Performance Issues
```bash
# Check resource usage
docker stats coder1

# Increase resources in docker-compose.yml
# Uncomment the deploy section and adjust limits
```

## Development Mode

For development without Docker:

```bash
# Install dependencies
npm install

# Set environment variables
export BYPASS_FRIEND_AUTH=false
export NODE_ENV=development

# Start server
npm run dev

# Access at http://localhost:3000
```

## Distribution

### For Commercial Release

1. **Push to Docker Hub**:
```bash
docker tag coder1/ide:latest coder1/ide:v1.0.0
docker push coder1/ide:v1.0.0
docker push coder1/ide:latest
```

2. **Update installer script**:
- Point to official Docker Hub image
- Update version numbers
- Test on fresh systems

3. **Create release notes**:
- Document new features
- List known issues
- Provide upgrade instructions

## Support

- **Documentation**: https://docs.coder1.dev
- **Email**: support@coder1.dev
- **GitHub**: https://github.com/coder1/ide

---

*Last Updated: January 2025*
*Version: 1.0.0-alpha*