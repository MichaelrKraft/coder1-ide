# 📚 Session Hook Setup - Super Simple!

## Quick Setup (30 seconds)

### Step 1: Install the Hook
In your terminal, run:
```bash
# Create Claude config directory if it doesn't exist
mkdir -p ~/.claude

# Add the sessions hook to your Claude config
cat > ~/.claude/claude_hook.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | { read file_path; if echo \"$file_path\" | grep -q \"^/sessions$\"; then echo \"📚 Loading previous development sessions from CoderOne...\"; find /Users/michaelkraft/autonomous_vibe_interface/data/documentation -name \"session_*.json\" -type f 2>/dev/null | while read -r session_file; do echo \"Reading: $(basename \"$session_file\")\"; cat \"$session_file\" 2>/dev/null | jq -r \".name, .description, .content\" 2>/dev/null | head -100; done; fi; }"
          }
        ]
      }
    ]
  }
}
EOF

echo "✅ Sessions hook installed!"
```

### Step 2: Use It!
In any Claude conversation, just type:
```
Read /sessions
```

That's it! Claude will automatically load all your previous development sessions.

## Alternative: Use the Web Interface

If you prefer a visual approach:
1. Visit: http://localhost:3000/hooks.html
2. Click "Templates" tab
3. Find "Session Context Loader" 
4. Click "Install"
5. Done!

## How It Works

When you type `Read /sessions`, the hook:
1. Detects the special `/sessions` path
2. Finds all session files in your Documentation Intelligence folder
3. Loads them automatically for Claude to read
4. Gives Claude full context from your previous work

## Testing

To test if it's working:
```bash
# Create a test session file
echo '{"name":"Test Session","description":"Testing hook","content":"This is a test session"}' > /Users/michaelkraft/autonomous_vibe_interface/data/documentation/session_test.json

# In Claude, type:
Read /sessions

# You should see your test session loaded!
```

## Troubleshooting

**Hook not working?**
- Check if the config file exists: `ls -la ~/.claude/claude_hook.json`
- Make sure the documentation directory exists: `ls -la /Users/michaelkraft/autonomous_vibe_interface/data/documentation/`

**No sessions loading?**
- Make sure you've stored at least one session first
- Check for session files: `ls /Users/michaelkraft/autonomous_vibe_interface/data/documentation/session_*.json`

## Benefits

✅ **Simple**: Just type `Read /sessions` instead of long paths
✅ **Fast**: Loads all sessions instantly
✅ **Automatic**: No need to remember file names or paths
✅ **Complete**: Gets all your development context in one command

---

*With this hook, every new Claude conversation can start with full context from your previous work!*