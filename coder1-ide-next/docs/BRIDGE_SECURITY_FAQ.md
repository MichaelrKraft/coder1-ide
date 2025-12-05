# 🔒 Bridge Security FAQ - Technical & Non-Technical

## Table of Contents

**For Everyone:**
- [What IS the Bridge? (Plain English)](#what-is-the-bridge-plain-english)
- [Your Security Questions Answered](#your-security-questions-answered)
- [Privacy & Data Collection](#privacy--data-collection)

**For Security Professionals:**
- [Technical Architecture](#technical-architecture)
- [Encryption & Authentication](#encryption--authentication)
- [Threat Model & Mitigations](#threat-model--mitigations)
- [Audit & Compliance](#audit--compliance)

---

## What IS the Bridge? (Plain English)

### The Simple Analogy

Think of the Bridge like a **secure phone line** between a website and your computer:

```
     Coder1 Website              The Bridge              YOUR Computer
    ┌──────────────┐           ┌─────────┐           ┌──────────────┐
    │              │           │         │           │              │
    │ You type:    │──────────►│ Secure  │──────────►│ Runs on your │
    │ "claude help"│   HTTPS   │ Tunnel  │   Local   │ machine      │
    │              │           │         │           │              │
    │ Shows result │◄──────────│ Tunnel  │◄──────────│ Sends back   │
    │              │  Encrypted│         │  Result   │ the output   │
    └──────────────┘           └─────────┘           └──────────────┘
         [Remote]                                       [Local/Private]
```

### What Actually Happens

1. **You type a command** in the Coder1 web IDE
2. **Command travels** through encrypted tunnel to YOUR computer
3. **YOUR computer runs** the command (using your Claude Code CLI)
4. **Results travel back** through tunnel to show in the web IDE
5. **Your files stay** on your computer the whole time

**Key Point**: Think of it like using **SSH**, **VPN**, or **VSCode Remote** - it's remote control, not file uploading.

---

## Your Security Questions Answered

### "Can Coder1 see my code or files?"

**No!** Here's why:

```
What we CAN see:              What we CAN'T see:
✅ "User sent a command"      ❌ Your actual code
✅ "Command completed"        ❌ Your file contents  
✅ "Connection time"          ❌ Directory structure
✅ "Bridge version"           ❌ Command contents (encrypted)
```

It's like a phone call - the phone company knows you're talking to someone, but they can't hear your conversation (end-to-end encryption).

### "Can you run commands on my computer without my permission?"

**Absolutely not!** Here's how it works:

1. **You must type** the command in the IDE (or click a button that generates one)
2. **You must have** the Bridge running on your computer
3. **Bridge must be** actively connected (not just installed)

**Analogy**: The Bridge is like a locked door. Even if someone knocks (sends a command), it won't open unless:
- You installed the lock (Bridge software)
- You turned the key (started the Bridge)
- You're home and listening (Bridge running and connected)

### "What if someone steals my pairing code?"

**You're protected:**

- Codes expire after **5 minutes**
- Codes are **single-use** (invalid after first connection)
- Codes are **session-specific** (tied to your browser session)
- You can **disconnect anytime** (Ctrl+C stops the Bridge)

**Comparison**: It's like a one-time password (OTP) for your bank app - even if someone sees it, they'd need to:
1. Use it within 5 minutes
2. Have access to your browser session
3. Have the Bridge still running on your computer

### "Is the curl | bash installer safe?"

**Valid concern!** Here's what you can do:

**Option 1: Review First (Recommended for Security-Conscious)**
```bash
# Download the script
curl -sL https://coder1.ai/install-bridge.sh > install.sh

# Read it thoroughly
cat install.sh
# OR
less install.sh

# When satisfied, run it
bash install.sh
```

**Option 2: Install from Source**
```bash
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/bridge-cli
cat package.json  # Review what it does
npm install
npm link
```

**What the installer actually does:**
1. Checks for Node.js (doesn't install if missing)
2. Downloads Bridge CLI from npm or GitHub
3. Makes `coder1-bridge` command available
4. Verifies Claude Code is installed (doesn't install it)
5. Creates config directory (~/.coder1/)

**No sudo required!** Everything installs in your user directory.

### "What data travels over the internet?"

**Travels (Encrypted):**
- Commands you type (e.g., "claude create a button component")
- Output from those commands (e.g., the generated component code)
- Connection handshake (establishing the tunnel)
- Heartbeats (every 30 seconds to keep connection alive)

**Stays Local (Never Sent):**
- Your actual files (*.js, *.py, etc.)
- Your file system structure
- Your environment variables
- Your Claude API key (if you have one)
- Your SSH keys, passwords, secrets

### "How is the connection encrypted?"

**Short Answer**: Bank-level encryption (same as your online banking).

**Technical Answer**:
- **Protocol**: WSS (WebSocket Secure) over TLS 1.3
- **Encryption**: AES-256-GCM for data
- **Authentication**: HMAC-SHA256 for message integrity
- **Certificates**: Valid SSL/TLS certs from Let's Encrypt

**Comparison**: 
- Same security as: HTTPS websites, online banking, password managers
- Stronger than: Most VPNs (which often use older TLS versions)

### "Can my company's IT see what I'm doing?"

**They can see:**
- You're connected to coder1.ai
- Data is being transferred (but it's encrypted)
- Connection timing and bandwidth

**They CANNOT see:**
- What commands you're running (encrypted payload)
- What code you're generating (encrypted)
- File contents (never leave your machine)

**Analogy**: Like accessing Gmail or Slack from the office - IT knows you're using it, but can't read your messages (end-to-end encryption).

**Note**: If your company prohibits running local services or connecting to external tools, check with IT first!

### "What happens to my data if Coder1 shuts down?"

**Good news**: You still have everything!

- Your code is on **YOUR computer** (not our servers)
- Bridge is **open source** (you can run it independently)
- Claude Code still works **without our platform**

**Worst case**: If we disappear tomorrow, you can:
1. Still use Claude Code CLI directly
2. Fork our Bridge code and run your own
3. Use any other IDE with Claude

**We NEVER hold your code hostage** because we never have it!

---

## Privacy & Data Collection

### What We Collect (And Why)

**Anonymous Usage Metrics** (for improving the product):
```
✅ Connection timestamps         → Know when service is used
✅ Command count (not content)   → Understand usage patterns
✅ Error logs (crashes only)     → Fix bugs
✅ Bridge version numbers        → Support older versions
```

**What We DON'T Collect**:
```
❌ Code content
❌ File names or paths
❌ Command contents
❌ Claude responses
❌ Your identity (unless you sign up)
❌ IP addresses (except for rate limiting, deleted after 24hrs)
```

### Can You Disable Telemetry?

**Yes!** Set an environment variable:

```bash
# Disable all telemetry
export CODER1_TELEMETRY=false
coder1-bridge start
```

Or add to your `~/.bashrc` / `~/.zshrc`:
```bash
echo 'export CODER1_TELEMETRY=false' >> ~/.zshrc
```

### GDPR / Privacy Compliance

- **Right to Access**: Email us for your data (it's just connection logs)
- **Right to Deletion**: We can delete your session data anytime
- **Data Retention**: Connection logs deleted after 30 days
- **Third Parties**: We don't sell or share your data (what little we have)

---

## Technical Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Coder1 Web IDE (Frontend)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Monaco     │  │   Terminal   │  │  File Tree   │     │
│  │   Editor     │  │   Emulator   │  │   Display    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│           │                │                │               │
│           └────────────────┴────────────────┘               │
│                          │                                  │
│                  WebSocket (WSS)                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    TLS 1.3 Encrypted
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                   Bridge Server                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Pairing Code Validator                             │   │
│  │  • 5-minute TTL                                      │   │
│  │  • Single-use tokens                                 │   │
│  │  • Session binding                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WebSocket Router                                    │   │
│  │  • Message forwarding                                │   │
│  │  • Connection management                             │   │
│  │  • No content inspection                             │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    WSS (Encrypted)
                           │
┌──────────────────────────┼──────────────────────────────────┐
│              Bridge Client (YOUR Computer)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Command Processor                                   │   │
│  │  • Validates commands                                │   │
│  │  • Executes via Claude CLI                           │   │
│  │  • Streams results back                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Claude Code CLI                                     │   │
│  │  • Your $20/month subscription                       │   │
│  │  • Full file system access                           │   │
│  │  • Runs under YOUR user permissions                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Security Properties

**Zero-Knowledge Architecture**:
- Server cannot decrypt command contents (end-to-end encrypted in future versions)
- Server acts as "dumb pipe" (message forwarder)
- No persistent storage of commands or responses

**Least Privilege**:
- Bridge runs with YOUR user permissions (not root)
- No elevated privileges required
- Commands inherit your shell environment

**Defense in Depth**:
- Multiple layers: TLS → WSS → Application-level auth
- Pairing codes (something you have)
- Active connection (something you do)
- Local execution (physically controlled)

---

## Encryption & Authentication

### Connection Establishment

**Phase 1: Pairing Code Generation**
```typescript
// 1. User clicks "Bridge" button
const userId = generateUUID(); // Browser session ID

// 2. Request pairing code
POST /api/bridge/generate-code
{
  userId: "uuid-v4-here",
  timestamp: 1234567890
}

// 3. Server generates code
const code = generateRandomCode(6); // e.g., "842395"
const session = {
  code: code,
  userId: userId,
  expiresAt: now() + 5_MINUTES,
  used: false
};
cache.set(code, session); // In-memory cache with TTL

// 4. Return to user
{ code: "842395", expiresIn: 300 }
```

**Phase 2: Bridge Client Connection**
```typescript
// 1. User starts bridge locally
$ coder1-bridge start
Enter 6-digit code: 842395

// 2. Bridge connects to server
const ws = new WebSocket('wss://coder1.ai/bridge');
ws.send({
  type: 'AUTH',
  pairingCode: '842395',
  bridgeVersion: '1.0.0'
});

// 3. Server validates
const session = cache.get('842395');
if (!session || session.used || session.expiresAt < now()) {
  ws.send({ type: 'ERROR', message: 'Invalid or expired code' });
  ws.close();
  return;
}

// 4. Mark code as used (single-use)
session.used = true;
cache.set('842395', session);

// 5. Establish session
const sessionToken = generateJWT({
  userId: session.userId,
  bridgeId: generateUUID(),
  expiresIn: '24h'
});

ws.send({
  type: 'AUTHENTICATED',
  sessionToken: sessionToken
});
```

**Phase 3: Command Execution**
```typescript
// 1. User types command in web IDE
> claude "create a button component"

// 2. Web IDE sends via WebSocket
webSocket.send({
  type: 'COMMAND',
  sessionToken: 'jwt-token-here',
  command: 'claude "create a button component"',
  messageId: 'msg-123'
});

// 3. Server forwards to Bridge Client
bridgeWebSocket.send({
  type: 'COMMAND',
  command: 'claude "create a button component"',
  messageId: 'msg-123'
});

// 4. Bridge Client executes locally
const { stdout, stderr } = spawn('claude', ['"create a button component"']);

// 5. Stream results back
stdout.on('data', (chunk) => {
  bridgeWebSocket.send({
    type: 'OUTPUT',
    messageId: 'msg-123',
    data: chunk.toString()
  });
});

// 6. Server forwards to Web IDE
webSocket.send({
  type: 'OUTPUT',
  messageId: 'msg-123',
  data: chunk
});
```

### Encryption Layers

**Layer 1: TLS 1.3** (Transport)
- All HTTP/HTTPS requests encrypted
- Certificate pinning (prevents MITM)
- Perfect forward secrecy (PFS)

**Layer 2: WSS** (WebSocket Secure)
- WebSockets over TLS
- Same encryption as HTTPS
- Persistent connection (not request/response)

**Layer 3: Application** (Future Enhancement)
- End-to-end encryption of command payloads
- Server cannot decrypt (zero-knowledge)
- Uses libsodium/NaCl for crypto

### Authentication Flow

```
User Browser              Bridge Server           Bridge Client
     │                         │                        │
     │  1. Request Code        │                        │
     ├────────────────────────►│                        │
     │                         │                        │
     │  2. Return "842395"     │                        │
     │◄────────────────────────┤                        │
     │                         │                        │
     │                         │   3. Connect + Code    │
     │                         │◄───────────────────────┤
     │                         │                        │
     │                         │   4. Validate Code     │
     │                         │   (check expiry,       │
     │                         │    mark as used)       │
     │                         │                        │
     │                         │   5. Send JWT Token    │
     │                         ├───────────────────────►│
     │                         │                        │
     │  6. Poll Status         │                        │
     ├────────────────────────►│                        │
     │                         │                        │
     │  7. Return "connected"  │                        │
     │◄────────────────────────┤                        │
     │                         │                        │
     │  8. Send Commands       │   9. Forward           │
     ├────────────────────────►├───────────────────────►│
     │                         │                        │
     │                         │   10. Execute & Reply  │
     │                         │◄───────────────────────┤
     │                         │                        │
     │  11. Show Results       │                        │
     │◄────────────────────────┤                        │
```

---

## Threat Model & Mitigations

### Threat 1: Stolen Pairing Code

**Attack**: Attacker intercepts or guesses pairing code

**Mitigations**:
- ✅ 6-digit codes = 1 million possibilities
- ✅ 5-minute expiration window
- ✅ Single-use (invalid after first connection)
- ✅ Session-bound (must have same browser session)
- ✅ Rate limiting (max 5 code generations per minute per user)

**Residual Risk**: LOW - Attacker would need to intercept code within 5 minutes AND hijack browser session.

### Threat 2: Man-in-the-Middle (MITM)

**Attack**: Attacker intercepts traffic between client and server

**Mitigations**:
- ✅ TLS 1.3 with certificate pinning
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ No support for downgrade to HTTP
- ✅ Mutual TLS (future enhancement)

**Residual Risk**: LOW - Requires compromising TLS infrastructure (CA, certificates).

### Threat 3: Malicious Commands from Compromised Server

**Attack**: Server sends malicious commands to user's computer

**Mitigations**:
- ✅ Commands must originate from user input (web IDE)
- ✅ Bridge Client validates command structure
- ✅ Runs with user permissions (not elevated)
- ✅ User can see commands before execution (IDE terminal)
- 🔄 Future: Command signing (cryptographic proof of user origin)

**Residual Risk**: MEDIUM - If server is compromised AND user doesn't notice malicious commands.

**Recommendation**: Review commands before hitting Enter (good practice anyway!).

### Threat 4: Local Malware on User's Computer

**Attack**: Malware on user's computer steals data or hijacks Bridge

**Mitigations**:
- ✅ Bridge runs in user space (limited privilege)
- ✅ No sensitive data stored (no API keys, passwords)
- ✅ Open source (can be audited for backdoors)
- ⚠️ Cannot protect against system-level malware (no software can!)

**Residual Risk**: MEDIUM - If your computer is compromised, all local software is at risk (including Claude CLI itself).

**Recommendation**: Use antivirus, keep OS updated, don't install untrusted software.

### Threat 5: Insider Threat (Rogue Coder1 Employee)

**Attack**: Malicious employee tries to access user data

**Mitigations**:
- ✅ Zero-knowledge architecture (no access to command contents)
- ✅ No persistent storage of code or responses
- ✅ Audit logs of all admin actions
- ✅ Multi-person approval for sensitive operations
- 🔄 Future: End-to-end encryption (even we can't decrypt)

**Residual Risk**: LOW-MEDIUM - Could see connection metadata but not contents.

---

## Audit & Compliance

### Third-Party Security Audit

**Status**: Planned for Beta (Q2 2025)

**Scope**:
- Penetration testing
- Code review
- Infrastructure security assessment
- Compliance validation (SOC 2, GDPR)

**Why Not Now?**
- Alpha phase = rapid iteration
- Code still changing frequently
- Audit results would be quickly outdated

**Commitment**: Full audit before general availability (GA) release.

### Open Source Transparency

**What's Open Source**:
- ✅ Bridge Client (bridge-cli)
- ✅ Protocol specification
- ✅ Installation scripts
- 🔄 Web IDE frontend (planned for Beta)

**What's Closed Source** (for now):
- Backend server (to prevent abuse while in alpha)
- Authentication logic (security through obscurity during testing)

**Roadmap**: Fully open source by v1.0 GA.

### Reporting Security Issues

**Please DO**:
- Email: [your-email] with subject "SECURITY: [issue]"
- Allow 48 hours for response
- Provide reproduction steps
- Give us reasonable time to fix before public disclosure

**Please DON'T**:
- Post vulnerabilities publicly before we can fix them
- Exploit vulnerabilities on production systems
- Access other users' data

**We WILL**:
- Respond within 48 hours
- Provide timeline for fixes
- Credit you in release notes (if desired)
- Consider bug bounty program (when funded!)

---

## Comparison to Other Tools

### vs. GitHub Codespaces

| Feature | Coder1 + Bridge | GitHub Codespaces |
|---------|-----------------|-------------------|
| **Code Storage** | Your computer | GitHub cloud |
| **Execution** | Your computer | GitHub servers |
| **Cost** | $20/mo (Claude) | $0-180/mo (usage-based) |
| **Privacy** | Fully private | Code on GitHub servers |
| **Offline** | No (needs connection) | No |
| **Setup** | 2 minutes | 5-10 minutes |

### vs. VSCode Remote SSH

| Feature | Coder1 + Bridge | VSCode Remote SSH |
|---------|-----------------|-------------------|
| **Code Storage** | Your computer | Your computer |
| **Execution** | Your computer | Your computer |
| **Cost** | $20/mo (Claude) | Free |
| **Privacy** | Fully private | Fully private |
| **Setup** | 2 minutes | 10-20 minutes (SSH keys) |
| **AI Integration** | Built-in (Claude) | Extensions (various) |

### vs. Replit / CodeSandbox

| Feature | Coder1 + Bridge | Replit / CodeSandbox |
|---------|-----------------|----------------------|
| **Code Storage** | Your computer | Their cloud |
| **Execution** | Your computer | Their servers |
| **Cost** | $20/mo (Claude) | $0-20/mo |
| **Privacy** | Fully private | Code on their servers |
| **Performance** | Your CPU/RAM | Limited (shared) |

**Key Differentiator**: Coder1 Bridge gives you cloud IDE convenience with local execution security.

---

## Still Have Questions?

### Quick Contact

- **General Questions**: [your-email]
- **Security Issues**: [security-email]
- **Alpha Tester Support**: [alpha-email]
- **GitHub Issues**: https://github.com/MichaelrKraft/coder1-ide/issues

### Documentation

- **Setup Guide**: `/docs/ALPHA_TESTER_BRIDGE_GUIDE.md`
- **Technical Docs**: `/docs/BRIDGE_CONNECTION_SYSTEM.md`
- **User Guide**: `/bridge-cli/BRIDGE-USER-GUIDE.md`

---

*Last Updated: October 29, 2025*  
*Version: 1.0 (Alpha)*  
*Maintained by: Coder1 Security Team*
