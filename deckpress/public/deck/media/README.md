# Deckpress — Media Assets

This directory holds the founder's hero cutout video and fallback image.
These files are **not committed to git** (see `deckpress/.gitignore` —
the `/public/deck/media/*.webm` rule). They must be placed here manually
before deploying.

## Required files

### `founder-cutout.webm`

A WebM video (VP9 codec with alpha channel) of the founder giving a short
elevator pitch. Background must be removed so the transparent area shows
the hero gradient behind it.

**Production workflow:**

1. Record the founder talking (phone camera or webcam is fine).
2. Import into CapCut.
3. Use CapCut Pro's background-removal tool.
4. Export as **WebM with alpha channel** (VP9 codec). If CapCut can only
   export MOV with alpha, transcode with ffmpeg:
   ```bash
   ffmpeg -i input.mov -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 2M founder-cutout.webm
   ```

Recommended specs:
- Duration: 30-60 seconds
- Resolution: 720x960 (or matching the 420x560 container at 2× DPR)
- Frame rate: 30 fps
- Codec: VP9 with alpha (`yuva420p` pixel format)
- Audio: included — investor chooses whether to play via the toggle button

### `founder-fallback.jpg`

A static image shown in Safari (which lacks VP9 alpha support). Use a
still frame from the cutout video or a separate headshot with a
transparent-friendly background.

Recommended specs:
- Resolution: 840x1120 (2× DPR over the 420x560 container)
- Format: JPEG, quality 85
- Size: under 200 KB

## How it's wired up

- Config: `content/deck.config.ts` → `hero.founderCutout`
- HTML: `public/deck/index.html` → `#founder-cutout > #founder-video + #founder-fallback`
- Runtime: `public/deck/js/app.js` → detects WebM VP9 support via
  `video.canPlayType('video/webm; codecs="vp9"')` and chooses between
  the video and the fallback automatically.
