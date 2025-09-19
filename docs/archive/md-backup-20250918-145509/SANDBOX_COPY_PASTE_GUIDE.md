# Sandbox Terminal - Copy/Paste Guide

## How to Copy Content from Sandbox to Main Terminal

The sandbox terminal allows you to view checkpoint history in a read-only format. To transfer content to your main terminal, use standard copy/paste operations:

### Method 1: Select and Copy (Recommended)
1. **Open a Checkpoint**: Click any checkpoint to view it in the sandbox terminal
2. **Select Text**: Click and drag to select the specific commands or output you want
3. **Copy**: Use `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac) to copy
4. **Switch to Main**: Click the "Main Terminal" tab
5. **Paste**: Use `Ctrl+V` (Windows/Linux) or `Cmd+V` (Mac) to paste

### Method 2: Right-Click Copy
1. **Select Text**: Highlight the content you want to copy
2. **Right-Click**: Context menu will appear
3. **Choose Copy**: Click "Copy" from the menu
4. **Switch and Paste**: Go to main terminal and paste as above

### Available Buttons in Sandbox
- **🎯 Extract Commands**: Extracts any Claude commands found in the checkpoint for easy replay
- **❌ Close**: Closes the sandbox and returns to main terminal only

### Benefits of Manual Copy/Paste
- ✅ **Full Control**: Copy only what you need, not everything
- ✅ **Reliable**: Standard browser functionality - always works
- ✅ **Flexible**: Can copy partial commands, specific output, or multiple selections
- ✅ **No Server Load**: Doesn't trigger any server operations

## Recent Fix (September 2025)

### ⚠️ What Was Actually Causing Server Crashes
The DELETE request cascade that crashed the server was **NOT** caused by the "Copy to Main" button. The real issue was in the **SessionContext cleanup logic**:

- `refreshSessions()` was being called repeatedly
- Each refresh triggered `cleanupOldSessions()` automatically  
- This created a loop: refresh → cleanup → more refreshes → more cleanup
- Result: hundreds of DELETE requests that overwhelmed the server

### ✅ How We Fixed It
1. **Added cleanup mutex** to prevent concurrent cleanup operations
2. **Added rate limiting** - cleanup can only run once every 30 seconds
3. **Added delays** between individual DELETE requests to prevent server overload
4. **Removed "Copy to Main" button** as a precaution (manual copy/paste is better anyway)

### 🎯 Result
- Server now remains stable during sandbox usage
- Manual copy/paste provides better user control
- No more EMFILE errors or server crashes
- Sandbox functionality works perfectly for checkpoint viewing

The fix addressed the root cause in session management rather than just treating symptoms. The server at `http://localhost:3003/ide` now works reliably with sandbox functionality.