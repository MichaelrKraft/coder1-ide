# Screenshot → Code: Phase 2 Enhancements

## Overview

Six additive improvements to the Screenshot → Code feature. No existing behavior changes.
All features are opt-in. Dependencies: only Feature 2 (URL capture) adds a new package (puppeteer).

---

## Feature 1: "Open in Editor" Button

**What**: After generation, a single click writes the scaffold as a new file in the project
and opens it in the Monaco editor — no copy-paste required.

**UX**:
```
[Copy] [Download] [Open in Editor ↗]
```
Clicking "Open in Editor" shows a one-line filename input pre-filled with
`components/GeneratedScaffold.tsx` (or `.vue` for Vue). User can change the path,
then confirm. File is written, tab opens in Monaco.

**Files changed (3)**:

1. `app/api/files/create/route.ts` — **New**
   - `POST { filePath: string, content: string }`
   - Validates path stays within `ALLOWED_ROOT` (same pattern as existing write route)
   - Unlike the existing write route, creates the file even if it doesn't exist yet
   - Creates parent directories if needed (`mkdir -p`)
   - Returns `{ success: true, path: string }`

2. `components/screenshot-to-code/ScaffoldResults.tsx` — Add "Open in Editor" button + filename input state
   - State: `openPath` (string, default `components/GeneratedScaffold.tsx`) + `openState: 'idle'|'editing'|'saving'|'done'`
   - Click → show inline path editor → confirm → POST to `/api/files/create` → dispatch `openFile()` to IDEStore
   - Import `useIDEStore` to call `openFile({ path, name, content, language: 'typescriptreact' })`

3. No changes to route.ts or prompt.ts — this is entirely a result-stage feature.

---

## Feature 2: URL → Auto-Screenshot

**What**: User pastes a URL; the server captures full-page screenshots automatically
(no manual snipping). Returns up to 4 viewport-height chunks as base64 PNGs, which
populate the image strip exactly like manual uploads.

**UX**: Drop zone gets a "From URL" toggle tab:
```
[📁 Upload] [🔗 From URL]
```
URL mode shows a single text input + "Capture" button. On success, the thumbnail strip
fills with the captured screenshots and the user proceeds normally.

**New dependency**: `puppeteer` (server-side only, ~300MB, chromium bundled).
Added to `devDependencies` to avoid bloating production bundles if server-side rendering ever excludes it.

**Files changed (3)**:

1. `app/api/screenshot-to-code/capture-url/route.ts` — **New**
   - `POST { url: string }`
   - SSRF validation: reuse `isBlockedUrl()` logic from extract-brand route
   - Launch Puppeteer, set viewport to 1440×900
   - Navigate, wait for `networkidle0`
   - Get full-page height, divide into up to 4 viewport-height chunks
   - Screenshot each chunk (clip: `{ x:0, y: offset, width:1440, height:900 }`)
   - Return `{ images: Array<{ base64: string, mimeType: 'image/png' }> }`
   - 30s timeout; close browser in `finally` block

2. `components/screenshot-to-code/ScreenshotToCode.tsx` — Add URL capture tab
   - State: `captureMode: 'upload' | 'url'`, `captureUrl`, `capturing`
   - "Capture" button calls `/api/screenshot-to-code/capture-url`, appends returned images to `images[]`
   - Cap at 5 total (same limit as manual upload)

3. `package.json` — Add `puppeteer` to dependencies

---

## Feature 3: Color Palette Extraction

**What**: After images are loaded (client-side), sample the dominant colors from each
screenshot using the Canvas API. Send the palette with the API call. Claude injects the
colors as Tailwind `extend.colors` suggestions at the top of the generated file.

**UX**: No new UI. Palette extraction is invisible — colors appear automatically in
the generated code as a comment block:

```tsx
// Detected color palette from screenshots:
// --primary:   #1a1f2e   (darkest dominant)
// --accent:    #6366f1   (dominant vibrant)
// --surface:   #0f1117
// --text:      #e2e8f0
// Suggested tailwind.config extend.colors: { primary: '#1a1f2e', accent: '#6366f1' }
```

**Files changed (3)**:

1. `lib/screenshot-to-code/color-extractor.ts` — **New**
   - `extractPalette(imageDataUrl: string): Promise<string[]>`
   - Draws image to offscreen `<canvas>`, samples a grid of pixels
   - Groups similar colors (±30 luminance tolerance), returns top 5 hex strings
   - Pure client-side, no dependencies

2. `components/screenshot-to-code/ScreenshotToCode.tsx`
   - After each image is added, run `extractPalette()` and accumulate colors
   - Deduplicate across all images; send top 5 as `palette: string[]` in API body

3. `lib/screenshot-to-code/prompt.ts`
   - Add optional `palette?: string[]` parameter to `buildScreenshotToCodePrompt()`
   - When provided, inject a palette block before the rules section

4. `app/api/screenshot-to-code/route.ts`
   - Extract `palette` from body, pass to `buildScreenshotToCodePrompt()`

---

## Feature 4: Streaming Output

**What**: Code streams in token-by-token instead of arriving all at once after a 15-second
wait. The code block fills live as Claude responds — like ChatGPT.

**Files changed (3)**:

1. `app/api/screenshot-to-code/route.ts`
   - Switch Claude API call to use `stream: true` (Anthropic SDK streaming)
   - Return `new Response(readableStream, { headers: { 'Content-Type': 'text/event-stream' } })`
   - Stream chunks as `data: {token}\n\n` SSE format
   - When stream ends, send final `data: [DONE]\n\n`

2. `components/screenshot-to-code/ScreenshotToCode.tsx`
   - Change `fetch` call to read a `ReadableStream` via `response.body.getReader()`
   - Decode chunks, accumulate into `streamingCode` state
   - Pass `isStreaming: boolean` and `streamingCode` down to `ScaffoldResults`
   - Parse `<components>` and `<code>` tags on-the-fly as chunks arrive

3. `components/screenshot-to-code/ScaffoldResults.tsx`
   - Accept optional `isStreaming?: boolean` prop
   - When streaming, show a blinking cursor at the end of the code block
   - Disable Copy/Download/Open in Editor buttons until `isStreaming === false`

---

## Feature 5: Refine / Iterate Mode

**What**: After the first generation, a small text input appears at the bottom of the
results: "Describe what to change." User types an amendment ("make the hero full-screen",
"add a pricing table") and gets a revised scaffold — no starting over.

**UX**:
```
┌────────────────────────────────────────────┐
│  Refine this scaffold                       │
│  [Add a pricing section with 3 tiers    ] [→]│
└────────────────────────────────────────────┘
```

**Files changed (3)**:

1. `components/screenshot-to-code/ScaffoldResults.tsx`
   - Add `onRefine: (instruction: string) => void` prop
   - Add refinement input + submit button at bottom of results
   - State: `refineText`, `refineState: 'idle'|'loading'|'done'`
   - On submit, calls `onRefine(refineText)` — parent handles the API call

2. `components/screenshot-to-code/ScreenshotToCode.tsx`
   - When `onRefine` is called: re-POST to the same route with `previousCode` + `refinement` added to body
   - Keep original images + settings; send them all again

3. `app/api/screenshot-to-code/route.ts`
   - Extract optional `previousCode?: string` and `refinement?: string` from body
   - Pass to prompt builder

4. `lib/screenshot-to-code/prompt.ts`
   - When `previousCode` + `refinement` are both provided, append a REFINE block:
   ```
   REFINE THE FOLLOWING CODE:
   {previousCode}

   INSTRUCTION: {refinement}

   Return the complete revised file. Apply only the requested change — preserve everything else.
   ```

---

## Feature 6: Component-Level Drill-Down

**What**: Clicking a component chip in the results scrolls the code view to exactly where
that component is defined and highlights it briefly.

**UX**: Component chips are already rendered. Clicking `hero` scrolls the `<pre>` block
to the `const Hero` definition and flashes the line yellow for 1.5 seconds.

**Files changed (1)**:

1. `components/screenshot-to-code/ScaffoldResults.tsx`
   - After code is set, parse for `const {Name}` and `function {Name}` patterns → map component type → line number
   - Store as `componentLineMap: Record<string, number>`
   - `<pre>` gets a `ref`; chip `onClick` calls `scrollToLine(lineNum)` which uses `scrollTop` arithmetic
   - Flash: add a CSS transition class for 1.5s then remove

---

## File Summary

| File | Action | Features |
|------|--------|----------|
| `app/api/files/create/route.ts` | **Create** | 1 |
| `app/api/screenshot-to-code/capture-url/route.ts` | **Create** | 2 |
| `lib/screenshot-to-code/color-extractor.ts` | **Create** | 3 |
| `app/api/screenshot-to-code/route.ts` | Modify | 3, 4, 5 |
| `lib/screenshot-to-code/prompt.ts` | Modify | 3, 5 |
| `components/screenshot-to-code/ScreenshotToCode.tsx` | Modify | 2, 3, 4, 5 |
| `components/screenshot-to-code/ScaffoldResults.tsx` | Modify | 1, 4, 5, 6 |
| `package.json` | Modify | 2 |

---

## Build Order

1. **Feature 6** — drill-down (1 file, self-contained, no risk)
2. **Feature 3** — color palette (2 new files + small additions elsewhere)
3. **Feature 1** — open in editor (new API route + ScaffoldResults additions)
4. **Feature 4** — streaming (touches route + both components)
5. **Feature 5** — refine mode (additive to all existing files)
6. **Feature 2** — URL capture (new dependency, isolated new route + UI toggle)

## Todo

- [ ] Feature 6: Component drill-down — `ScaffoldResults.tsx`
- [ ] Feature 3: Color palette — `color-extractor.ts` + `prompt.ts` + route + component
- [ ] Feature 1: Open in Editor — `files/create/route.ts` + `ScaffoldResults.tsx`
- [ ] Feature 4: Streaming — `route.ts` + both components
- [ ] Feature 5: Refine mode — `prompt.ts` + `route.ts` + both components
- [ ] Feature 2: URL capture — install puppeteer + `capture-url/route.ts` + component
- [ ] TypeScript check: `npx tsc --noEmit` → 0 errors in changed files
