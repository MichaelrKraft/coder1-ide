#!/bin/bash
# Session Complete Notifier Hook
# Plays a sound and shows desktop notification when Claude finishes a task
# Works on macOS and Linux

# Play completion sound (macOS/Linux)
afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || \
paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || \
echo -e '\a'  # Fallback terminal bell

# Desktop notification (macOS/Linux)
osascript -e 'display notification "Claude has finished the task" with title "Coder1" sound name "Glass"' 2>/dev/null || \
notify-send "Coder1" "Claude has finished the task" --icon=dialog-information 2>/dev/null

exit 0
