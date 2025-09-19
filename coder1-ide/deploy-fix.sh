#!/bin/bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add .
git commit -m "Fix IDE deployment: Separate homepage from React IDE

- Created dedicated ide-react.html for React IDE
- Restored proper homepage with Enter Coder1 IDE button  
- Fixed routing to serve React IDE at /ide route
- Added proper static asset serving for /ide/static paths
- Resolved black screen issue by correcting file paths

The deployment should now show the homepage with a working IDE button.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main