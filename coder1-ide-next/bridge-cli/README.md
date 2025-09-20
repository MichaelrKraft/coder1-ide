# Coder1 Bridge CLI

Connect your local Claude CLI to the Coder1 IDE running in the cloud. This bridge enables you to use Claude Code commands from your browser-based IDE by routing them through your local machine.

## 🚀 Quick Start

### Installation

#### Option 1: NPM Global Install (Recommended)
```bash
npm install -g coder1-bridge
```

#### Option 2: NPX (No Installation)
```bash
npx coder1-bridge start
```

#### Option 3: Direct from Source
```bash
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/coder1-ide-next/bridge-cli
npm install
npm start
```

### Usage

1. **Open Coder1 IDE** in your browser:
   - Production: https://coder1-ide.onrender.com
   - Local: http://localhost:3001

2. **Generate a Pairing Code** in the IDE:
   - Click the "Connect Bridge" button in the terminal
   - Or use the status bar bridge indicator
   - A 6-digit code will be displayed

3. **Start the Bridge** on your local machine:
   ```bash
   coder1-bridge start
   ```

4. **Enter the Pairing Code** when prompted:
   ```
   Enter the 6-digit pairing code from the IDE: 123456
   ```

5. **Success!** You'll see:
   ```
   ✅ Bridge connected successfully!
   ```

6. **Use Claude** in the IDE terminal:
   ```bash
   claude analyze
   claude fix "error message"
   claude explain function.js
   ```

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **Claude CLI** installed from https://claude.ai/download
- **Coder1 IDE** account (for cloud version)

## 🛠️ Commands

### `coder1-bridge start`
Start the bridge service and connect to Coder1 IDE.

**Options:**
- `-s, --server <url>` - Server URL (default: https://coder1-ide.onrender.com)
- `-d, --dev` - Development mode (connects to localhost:3001)
- `-v, --verbose` - Enable verbose logging
- `--no-banner` - Skip banner display

**Examples:**
```bash
# Connect to production
coder1-bridge start

# Connect to local development
coder1-bridge start --dev

# Connect to custom server
coder1-bridge start --server https://my-coder1.com

# Verbose mode for debugging
coder1-bridge start --verbose
```

### `coder1-bridge status`
Check if the bridge service is available on the server.

```bash
coder1-bridge status
# Output: ✅ Bridge service is online
```

### `coder1-bridge test`
Test your local Claude CLI installation.

```bash
coder1-bridge test
# Output: ✅ Claude CLI is installed and working
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in your project directory:

```env
# Server configuration
CODER1_SERVER=https://coder1-ide.onrender.com

# Bridge settings
BRIDGE_VERBOSE=true
BRIDGE_AUTO_RECONNECT=true
BRIDGE_MAX_RECONNECT_ATTEMPTS=10

# Security (optional)
BRIDGE_JWT_SECRET=your-secret-key
```

### Working Directory
The bridge runs in your current directory by default. Claude commands will execute in this context:

```bash
cd ~/my-project
coder1-bridge start
# Claude commands will run in ~/my-project
```

## 🔐 Security

### How It Works
1. **Pairing Code**: One-time 6-digit code expires after 5 minutes
2. **JWT Token**: Secure token for authenticated WebSocket connection
3. **TLS/WSS**: All connections encrypted
4. **Command Sanitization**: Dangerous commands are blocked
5. **Path Validation**: Prevents directory traversal attacks

### What Bridge Can Access
- ✅ Files in your current working directory
- ✅ Claude CLI on your machine
- ✅ Git repositories you have access to
- ❌ Cannot access system files without permission
- ❌ Cannot run arbitrary shell commands

## 🐛 Troubleshooting

### Bridge Won't Connect

**Check Claude CLI**:
```bash
coder1-bridge test
```

**Check Server Status**:
```bash
coder1-bridge status
```

**Try Verbose Mode**:
```bash
coder1-bridge start --verbose
```

### "Claude CLI not found"

1. Install Claude Code from https://claude.ai/download
2. Restart your terminal
3. Verify installation:
   ```bash
   which claude
   claude --version
   ```

### "Invalid pairing code"

- Codes expire after 5 minutes
- Generate a new code in the IDE
- Ensure you're connecting to the correct server

### Connection Drops

The bridge auto-reconnects by default. If it doesn't:
1. Check your internet connection
2. Restart the bridge
3. Generate a new pairing code

## 🏗️ Architecture

```
Your Machine                    Cloud/Server
┌─────────────┐                ┌──────────────┐
│ Claude CLI  │◄───┐           │  Coder1 IDE  │
└─────────────┘    │           ├──────────────┤
                   │           │   Terminal   │
┌─────────────┐    │    WSS    │   Editor     │
│Coder1 Bridge│◄───┼──────────►│   Preview    │
└─────────────┘    │           └──────────────┘
                   │                   ▲
┌─────────────┐    │                   │
│Local Files  │◄───┘                   │
└─────────────┘                     Browser
```

## 📊 Performance

- **Latency**: < 100ms command routing overhead
- **Throughput**: Streams output in real-time
- **Concurrent Commands**: Up to 5 simultaneous
- **File Operations**: < 500ms for files under 1MB
- **Auto-reconnect**: Within 1-30 seconds

## 🤝 Contributing

### Development Setup
```bash
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/coder1-ide-next/bridge-cli
npm install
npm link  # Makes 'coder1-bridge' available globally
```

### Running Tests
```bash
npm test
```

### Development Mode
```bash
# Connect to local IDE server
node src/index.js start --dev --verbose
```

## 📚 API Reference

### WebSocket Events

**Client → Server**:
- `heartbeat` - Keep-alive signal
- `claude:output` - Stream command output
- `claude:complete` - Command finished
- `file:response` - File operation result

**Server → Client**:
- `claude:execute` - Execute command request
- `file:request` - File operation request
- `config:update` - Configuration change
- `connection:accepted` - Pairing successful

### Error Codes
- `1001` - Invalid pairing code
- `1002` - Token expired
- `1003` - Unauthorized
- `2001` - Command timeout
- `2003` - Claude not found
- `3001` - File not found
- `3002` - Permission denied

## 📝 License

MIT License - See LICENSE file for details

## 🆘 Support

- **Issues**: https://github.com/MichaelrKraft/coder1-ide/issues
- **Discord**: https://discord.gg/coder1
- **Email**: support@coder1.dev

---

**Built with ❤️ for the Coder1 community**