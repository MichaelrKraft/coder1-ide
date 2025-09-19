# Coder1 Bridge

The Coder1 Bridge is a lightweight service that connects your local Claude CLI installation to the Coder1 web IDE, enabling seamless AI-powered development workflows.

## What is Coder1 Bridge?

Coder1 Bridge is a local service that runs on your development machine to provide secure access between the Coder1 web IDE and your local Claude Code CLI installation. This architecture ensures:

- **Privacy**: Claude CLI commands execute locally on your machine
- **Security**: No API keys transmitted over the internet
- **Performance**: Direct local access to your file system and tools
- **OAuth Integration**: Uses your existing Claude Code authentication

## Quick Start

### Prerequisites

1. **Claude Code CLI**: Install from [claude.ai/code](https://claude.ai/code)
2. **Node.js 16+**: Required to run the bridge service
3. **Coder1 Account**: Sign up at [coder1.app](https://coder1.app)

### Installation

#### Option 1: NPM Global Install (Recommended)
```bash
npm install -g coder1-bridge
coder1-bridge --server-url wss://your-coder1-instance.com
```

#### Option 2: Download Executable
Download the appropriate executable for your platform:
- **Windows**: `coder1-bridge-win.exe`
- **macOS**: `coder1-bridge-macos`
- **Linux**: `coder1-bridge-linux`

### Basic Usage

```bash
# Start bridge with default settings
coder1-bridge

# Connect to specific Coder1 instance
coder1-bridge --server-url wss://your-instance.onrender.com

# Use custom Claude CLI path
coder1-bridge --claude-cli-path /usr/local/bin/claude

# Enable debug logging
DEBUG=1 coder1-bridge
```

## Configuration

### Command Line Options

```bash
coder1-bridge [options]

Options:
  --server-url <url>         Coder1 server WebSocket URL (default: wss://coder1.app)
  --claude-cli-path <path>   Path to Claude CLI executable (auto-detected)
  --auth-token <token>       Bridge authentication token (optional)
  --working-directory <dir>  Working directory for commands (default: current)
  --reconnect-delay <ms>     Reconnection delay in milliseconds (default: 5000)
  --max-reconnects <num>     Maximum reconnection attempts (default: 10)
  --help                     Show help information
  --version                  Show version information
```

### Configuration File

Create `~/.coder1/bridge.json` for persistent configuration:

```json
{
  "serverUrl": "wss://your-instance.onrender.com",
  "claudeCliPath": "/usr/local/bin/claude",
  "workingDirectory": "/Users/yourname/projects",
  "authToken": "your-bridge-token",
  "reconnectDelay": 5000,
  "maxReconnectAttempts": 10
}
```

## How It Works

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    Local API     ┌─────────────────┐
│   Coder1 Web    │ ←──────────────→ │  Coder1 Bridge  │ ←──────────────→ │   Claude CLI    │
│      IDE        │   (Secure WSS)   │   (Your PC)     │   (Child Process) │  (Your Install) │
└─────────────────┘                  └─────────────────┘                  └─────────────────┘
```

### Security Model

1. **Local Execution**: All Claude CLI commands execute on your machine
2. **WebSocket Security**: TLS-encrypted connection to Coder1 servers
3. **Token Authentication**: Bridge-specific authentication tokens
4. **Permission Control**: Fine-grained permissions for bridge operations
5. **Process Isolation**: Each command runs in isolated child processes

## Features

### ✅ Core Features
- 🔒 **Secure WebSocket Connection** to Coder1 servers
- 🤖 **Claude CLI Integration** with full command support
- 📁 **Local File Operations** (read, write, exists)
- 🔄 **Automatic Reconnection** with exponential backoff
- 📊 **Health Monitoring** and status reporting
- 🛡️ **Process Management** with cleanup on exit

### 🚧 Planned Features
- 📝 **Session Persistence** across bridge restarts
- 🔧 **Plugin System** for custom integrations
- 📈 **Performance Metrics** and usage analytics
- 🌐 **Multi-Instance Support** for team workflows
- 🔄 **Update Manager** for automatic bridge updates

## Troubleshooting

### Common Issues

#### Bridge Won't Connect
```bash
# Check server URL
coder1-bridge --server-url wss://your-correct-url.com

# Enable debug logging
DEBUG=1 coder1-bridge
```

#### Claude CLI Not Found
```bash
# Specify Claude CLI path manually
coder1-bridge --claude-cli-path /path/to/claude

# Verify Claude CLI installation
claude --version
```

#### Authentication Failed
1. Check your Coder1 account status
2. Regenerate bridge token in Coder1 web interface
3. Use the new token: `coder1-bridge --auth-token your-new-token`

#### Permission Denied Errors
1. Ensure bridge has read/write access to working directory
2. Check file permissions: `ls -la`
3. Run with appropriate user permissions

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
# Linux/macOS
DEBUG=1 coder1-bridge

# Windows
set DEBUG=1 && coder1-bridge
```

### Log Files

Bridge logs are written to:
- **Linux/macOS**: `~/.coder1/logs/bridge.log`
- **Windows**: `%USERPROFILE%\.coder1\logs\bridge.log`

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/coder1-bridge

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build executables
npm run build
```

### API Reference

The bridge exposes these message types over WebSocket:

#### Outgoing Messages (Bridge → Server)
- `auth`: Authentication with server
- `claude_output`: Claude CLI command output
- `claude_complete`: Command completion status
- `claude_error`: Command execution errors
- `file_result`: File operation results
- `health_response`: Health check responses
- `ping`: Heartbeat messages

#### Incoming Messages (Server → Bridge)
- `auth_success`: Successful authentication
- `auth_error`: Authentication failure
- `claude_command`: Execute Claude CLI command
- `file_operation`: Perform file operation
- `health_check`: Health status request

## Support

### Getting Help

1. **Documentation**: [docs.coder1.app/bridge](https://docs.coder1.app/bridge)
2. **GitHub Issues**: [github.com/MichaelrKraft/coder1-ide/issues](https://github.com/MichaelrKraft/coder1-ide/issues)
3. **Discord Community**: [discord.gg/coder1](https://discord.gg/coder1)
4. **Email Support**: support@coder1.app

### Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Coder1 Bridge v1.0.0-alpha.1**  
*Making AI-powered development accessible to everyone*