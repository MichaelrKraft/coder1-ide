#!/usr/bin/env bash
#
# Deckpress — ffmpeg frame extraction for the scroll-bound product demo canvas.
#
# Usage:
#   ./scripts/extract-frames.sh path/to/product-demo.mp4
#
# Chooses FPS based on video duration so the output lands in the
# 150-300 frame range (per the Deckpress visual checklist):
#   < 10s  duration → 30 fps (captures fast product motion)
#   10-30s duration → 12 fps (balanced for typical demo length)
#   > 30s  duration → 8  fps (keeps frame count manageable)
#
# Width is capped at 1920px; aspect ratio preserved.
# Output format: libwebp at quality 80 for a good size/quality trade-off.

set -euo pipefail

VIDEO="${1:-}"
if [[ -z "$VIDEO" ]]; then
  echo "Usage: $0 path/to/product-demo.mp4" >&2
  exit 1
fi
if [[ ! -f "$VIDEO" ]]; then
  echo "Error: video file not found: $VIDEO" >&2
  exit 1
fi

# Check dependencies
for bin in ffmpeg ffprobe; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Error: $bin is required but not on PATH" >&2
    echo "Install via: brew install ffmpeg" >&2
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$PROJECT_ROOT/public/deck/frames"

mkdir -p "$OUT"
# Clean any previous extraction so frame count stays accurate
rm -f "$OUT"/*.webp

# Read video metadata
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" | tr -d '\r\n')
WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$VIDEO" | tr -d '\r\n')
HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$VIDEO" | tr -d '\r\n')

if [[ -z "$DURATION" || -z "$WIDTH" || -z "$HEIGHT" ]]; then
  echo "Error: could not read video metadata" >&2
  exit 1
fi

echo "Video: ${WIDTH}x${HEIGHT}, ${DURATION}s"

# Choose fps bucket (use awk for float comparison; bc may not be installed)
FPS=$(awk -v d="$DURATION" 'BEGIN {
  if (d < 10)      print 30
  else if (d < 30) print 12
  else             print 8
}')

# Cap width at 1920
SCALE_WIDTH=$(( WIDTH > 1920 ? 1920 : WIDTH ))

echo "Extracting at ${FPS} fps, scaled to ${SCALE_WIDTH}px wide..."

ffmpeg -hide_banner -loglevel warning -y -i "$VIDEO" \
  -vf "fps=${FPS},scale=${SCALE_WIDTH}:-1" \
  -c:v libwebp -quality 80 \
  "$OUT/frame_%04d.webp"

COUNT=$(ls "$OUT"/*.webp 2>/dev/null | wc -l | tr -d ' ')
echo "✓ Extracted $COUNT frames to public/deck/frames/"
echo "→ Run 'npm run build:config' to update deck config with the new frame count"
