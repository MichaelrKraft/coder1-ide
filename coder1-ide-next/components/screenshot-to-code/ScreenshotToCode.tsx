'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Camera, Upload, Loader2, Plus, X, ChevronDown, ChevronRight, Check, Link2 } from 'lucide-react';
import ScaffoldResults from './ScaffoldResults';
import { extractPalette } from '@/lib/screenshot-to-code/color-extractor';

interface ImageEntry {
  preview: string;
  base64: string;
  mimeType: string;
}

interface ComponentDetection {
  type: string;
  description: string;
}

interface ScaffoldResult {
  components: ComponentDetection[];
  code: string;
}

type Framework = 'react' | 'nextjs' | 'vue';
type UILibrary = 'none' | 'shadcn' | 'aceternity';
type BrandMode = 'url' | 'description';
type UploadMode = 'upload' | 'url';

const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] = [
  { value: 'react', label: 'React' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'vue', label: 'Vue 3' },
];

const LIBRARY_OPTIONS: { value: UILibrary; label: string }[] = [
  { value: 'none', label: 'Tailwind' },
  { value: 'shadcn', label: 'shadcn/ui' },
  { value: 'aceternity', label: 'Aceternity' },
];

const MAX_IMAGES = 5;

async function resizeImage(file: File, maxWidth = 1024): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
}

/** Extract the streaming code content from an accumulated SSE text buffer. */
function parseStreamingResult(text: string): { components: ComponentDetection[]; code: string } {
  const componentsMatch = text.match(/<components>([\s\S]*?)<\/components>/);
  let components: ComponentDetection[] = [];
  if (componentsMatch) {
    try { components = JSON.parse(componentsMatch[1].trim()); } catch { /* ignore */ }
  }

  const codeStart = text.indexOf('<code>');
  let code = '';
  if (codeStart !== -1) {
    const after = text.slice(codeStart + 6);
    const codeEnd = after.indexOf('</code>');
    code = codeEnd !== -1 ? after.slice(0, codeEnd).trim() : after;
  }

  return { components, code };
}

export default function ScreenshotToCode() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [framework, setFramework] = useState<Framework>('react');
  const [uiLibrary, setUiLibrary] = useState<UILibrary>('none');
  const [uploadMode, setUploadMode] = useState<UploadMode>('upload');
  const [captureUrl, setCaptureUrl] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Brand context state
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandMode, setBrandMode] = useState<BrandMode>('url');
  const [brandUrl, setBrandUrl] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScaffoldResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: File[]) => {
    setError(null);

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Max ${MAX_IMAGES} screenshots reached.`);
      return;
    }

    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`Only added ${remaining} screenshot${remaining > 1 ? 's' : ''} — max ${MAX_IMAGES} total.`);
    }

    const validFiles = toProcess.filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > 5 * 1024 * 1024) {
        setError('One or more images exceed 5MB and were skipped.');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setError('Please upload PNG, JPEG, or WebP images under 5MB.');
      return;
    }

    const newEntries: ImageEntry[] = [];
    for (const file of validFiles) {
      try {
        const preview = URL.createObjectURL(file);
        const resized = await resizeImage(file, 1024);
        newEntries.push({ preview, base64: resized.base64, mimeType: resized.mimeType });
      } catch {
        setError('Failed to process one or more images.');
      }
    }

    if (newEntries.length > 0) {
      setImages(prev => [...prev, ...newEntries]);
      setResult(null);
    }
  }, [images.length]);

  async function handleCaptureUrl() {
    setCaptureError(null);
    setCapturing(true);
    try {
      const res = await fetch('/api/screenshot-to-code/capture-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: captureUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCaptureError(data.error ?? 'Capture failed.');
        return;
      }
      // data.images: Array<{ base64: string, mimeType: string }>
      const incoming: ImageEntry[] = (data.images as { base64: string; mimeType: string }[])
        .slice(0, MAX_IMAGES - images.length)
        .map(img => ({
          preview: `data:${img.mimeType};base64,${img.base64}`,
          base64: img.base64,
          mimeType: img.mimeType,
        }));
      if (incoming.length > 0) {
        setImages(prev => [...prev, ...incoming]);
        setResult(null);
        setUploadMode('upload'); // switch back to show thumbnails
      }
    } catch {
      setCaptureError('Network error. Please try again.');
    } finally {
      setCapturing(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
    e.target.value = '';
  }, [processFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const imageItems = Array.from(e.clipboardData.items)
      .filter(i => i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageItems.length > 0) processFiles(imageItems);
  }, [processFiles]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
    setError(null);
  }, []);

  async function handleExtractBrand() {
    setExtractError(null);
    setExtractedContent(null);
    setExtracting(true);

    try {
      const response = await fetch('/api/screenshot-to-code/extract-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brandUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setExtractError(data.error ?? 'Failed to extract content.');
        return;
      }

      setExtractedContent(data.text);
    } catch {
      setExtractError('Network error. Please check the URL and try again.');
    } finally {
      setExtracting(false);
    }
  }

  function getActiveBrandContext(): string | undefined {
    if (!brandOpen) return undefined;
    if (brandMode === 'url') return extractedContent ?? undefined;
    return brandDescription.trim() || undefined;
  }

  async function runGenerate(opts?: { previousCode?: string; refinement?: string }) {
    if (images.length === 0) return;
    setLoading(true);
    setIsStreaming(true);
    setError(null);

    // Extract color palette from screenshots
    let palette: string[] = [];
    try {
      const palettes = await Promise.all(images.map(img => extractPalette(img.preview)));
      const seen = new Set<string>();
      for (const p of palettes.flat()) {
        if (!seen.has(p)) { seen.add(p); palette.push(p); }
        if (palette.length >= 5) break;
      }
    } catch { /* palette is optional — ignore errors */ }

    try {
      const response = await fetch('/api/screenshot-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map(i => ({ base64: i.base64, mimeType: i.mimeType })),
          framework,
          uiLibrary,
          brandContext: getActiveBrandContext(),
          palette: palette.length > 0 ? palette : undefined,
          previousCode: opts?.previousCode,
          refinement: opts?.refinement,
        }),
      });

      if (!response.ok || !response.body) {
        // Non-streaming error response (e.g. 400/503)
        const data = await response.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Generation failed. Please try again.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      // Set an empty result immediately so ScaffoldResults renders in streaming mode
      setResult({ components: [], code: '' });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const event = JSON.parse(data) as { token?: string };
            if (event.token) {
              accumulated += event.token;
              // Live-update the result as code streams in
              const parsed = parseStreamingResult(accumulated);
              setResult(parsed);
            }
          } catch { /* ignore malformed chunks */ }
        }
      }

      // Final parse with complete text
      const final = parseStreamingResult(accumulated);
      setResult(final);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setResult(null);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }

  function handleGenerate() {
    return runGenerate();
  }

  function handleRefine(instruction: string) {
    if (!result) return;
    runGenerate({ previousCode: result.code, refinement: instruction });
  }

  function handleReset() {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setResult(null);
    setError(null);
    setExtractedContent(null);
    setExtractError(null);
    setCaptureError(null);
  }

  if (result && !loading) {
    return (
      <ScaffoldResults
        components={result.components}
        code={result.code}
        framework={framework}
        onReset={handleReset}
        onRefine={handleRefine}
        isStreaming={isStreaming}
      />
    );
  }

  // Show streaming result inline while loading
  if (result && loading && isStreaming) {
    return (
      <ScaffoldResults
        components={result.components}
        code={result.code}
        framework={framework}
        onReset={handleReset}
        isStreaming={true}
      />
    );
  }

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div
      className="flex flex-col gap-4 p-4 h-full overflow-y-auto"
      onPaste={handlePaste}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Camera className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Screenshot to Code</h3>
        </div>
        <p className="text-xs text-text-muted">
          Drop up to 5 screenshots (top → bottom) to scaffold a full page.
        </p>
      </div>

      {/* Upload Mode Toggle */}
      <div className="flex rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => { setUploadMode('upload'); setCaptureError(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${uploadMode === 'upload' ? 'bg-coder1-cyan/10 text-coder1-cyan border-r border-coder1-cyan/30' : 'text-text-muted hover:text-text-secondary border-r border-border-default'}`}
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
        <button
          onClick={() => { setUploadMode('url'); setCaptureError(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${uploadMode === 'url' ? 'bg-coder1-cyan/10 text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'}`}
        >
          <Link2 className="w-3 h-3" />
          From URL
        </button>
      </div>

      {/* URL Capture Mode */}
      {uploadMode === 'url' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            <input
              type="url"
              value={captureUrl}
              onChange={e => { setCaptureUrl(e.target.value); setCaptureError(null); }}
              placeholder="https://example.com"
              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
              onKeyDown={e => { if (e.key === 'Enter') handleCaptureUrl(); }}
            />
            <button
              onClick={handleCaptureUrl}
              disabled={!captureUrl || capturing || images.length >= MAX_IMAGES}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${captureUrl && !capturing && images.length < MAX_IMAGES ? 'border-coder1-cyan/50 text-coder1-cyan hover:bg-coder1-cyan/10' : 'border-border-default text-text-muted cursor-not-allowed'}`}
            >
              {capturing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Capture'}
            </button>
          </div>
          {captureError && <p className="text-xs text-red-400">{captureError}</p>}
          <p className="text-xs text-text-muted">
            Takes full-page screenshots automatically — no manual snipping needed.
          </p>
        </div>
      )}

      {/* Empty drop zone (upload mode only) */}
      {uploadMode === 'upload' && images.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
            flex flex-col items-center justify-center min-h-[160px]
            ${isDragging
              ? 'border-coder1-cyan bg-coder1-cyan/10'
              : 'border-border-default hover:border-coder1-cyan/50 hover:bg-bg-tertiary bg-bg-primary'
            }
          `}
        >
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <Upload className="w-8 h-8 text-text-muted" />
            <p className="text-sm text-text-secondary">Drop screenshots here</p>
            <p className="text-xs text-text-muted">or click to browse · paste with ⌘V</p>
            <p className="text-xs text-text-muted">PNG, JPEG, WebP · max 5MB each · up to 5 images</p>
          </div>
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={img.preview} className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`Screenshot ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-coder1-cyan/40"
                />
                <span className="absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-coder1-cyan text-black text-[9px] font-bold leading-none">
                  {i + 1}
                </span>
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-bg-primary border border-border-default text-text-muted hover:text-red-400 hover:border-red-400 transition-colors"
                  aria-label={`Remove screenshot ${i + 1}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {canAddMore && uploadMode === 'upload' && (
              <button
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  w-16 h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                  text-text-muted hover:text-coder1-cyan hover:border-coder1-cyan/50 transition-all
                  ${isDragging ? 'border-coder1-cyan bg-coder1-cyan/10 text-coder1-cyan' : 'border-border-default bg-bg-primary'}
                `}
                aria-label="Add more screenshots"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] mt-0.5">Add</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {images.length}/{MAX_IMAGES} screenshot{images.length !== 1 ? 's' : ''}
              {images.length === MAX_IMAGES ? ' · max reached' : ''}
            </p>
            {images.length > 1 && (
              <p className="text-xs text-text-muted">Order: top → bottom</p>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Framework Selector */}
      <div>
        <label className="text-xs text-text-muted uppercase tracking-wider font-medium block mb-1.5">
          Framework
        </label>
        <div className="flex gap-2">
          {FRAMEWORK_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFramework(opt.value)}
              className={`
                flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200
                ${framework === opt.value
                  ? 'border-coder1-cyan text-coder1-cyan bg-coder1-cyan/10'
                  : 'border-border-default text-text-muted hover:border-border-hover hover:text-text-secondary'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* UI Library Selector */}
      <div>
        <label className="text-xs text-text-muted uppercase tracking-wider font-medium block mb-1.5">
          UI Library
        </label>
        <div className="flex gap-2">
          {LIBRARY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setUiLibrary(opt.value)}
              className={`
                flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200
                ${uiLibrary === opt.value
                  ? 'border-coder1-cyan text-coder1-cyan bg-coder1-cyan/10'
                  : 'border-border-default text-text-muted hover:border-border-hover hover:text-text-secondary'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Context — collapsible */}
      <div className="rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setBrandOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
        >
          <span className="font-medium uppercase tracking-wider">
            Brand Context
            <span className="ml-1.5 text-text-muted font-normal normal-case tracking-normal">(optional)</span>
          </span>
          {brandOpen
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />
          }
        </button>

        {brandOpen && (
          <div className="px-3 pb-3 flex flex-col gap-2.5 border-t border-border-default bg-bg-primary">
            {/* Mode toggle */}
            <div className="flex gap-3 pt-2.5">
              {(['url', 'description'] as BrandMode[]).map(mode => (
                <label key={mode} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="brandMode"
                    value={mode}
                    checked={brandMode === mode}
                    onChange={() => { setBrandMode(mode); setExtractError(null); }}
                    className="accent-coder1-cyan"
                  />
                  <span className="text-text-secondary capitalize">{mode === 'url' ? 'URL' : 'Description'}</span>
                </label>
              ))}
            </div>

            {brandMode === 'url' ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={brandUrl}
                    onChange={e => { setBrandUrl(e.target.value); setExtractedContent(null); setExtractError(null); }}
                    placeholder="https://your-site.com"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
                  />
                  <button
                    onClick={handleExtractBrand}
                    disabled={!brandUrl || extracting}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                      ${brandUrl && !extracting
                        ? 'border-coder1-cyan/50 text-coder1-cyan hover:bg-coder1-cyan/10'
                        : 'border-border-default text-text-muted cursor-not-allowed'
                      }
                    `}
                  >
                    {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Extract'}
                  </button>
                </div>

                {extractedContent && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Extracted {extractedContent.length.toLocaleString()} chars of content
                  </p>
                )}
                {extractError && (
                  <p className="text-xs text-red-400">{extractError}</p>
                )}
                {!extractedContent && !extractError && (
                  <p className="text-xs text-text-muted">
                    Claude will use this site&apos;s copy instead of placeholder text.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={brandDescription}
                  onChange={e => setBrandDescription(e.target.value)}
                  placeholder="e.g. Coder1 is an AI-powered IDE for Claude Code users. We help vibe coders ship faster. Target: developers who want to code with AI."
                  rows={3}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors resize-none"
                />
                <p className="text-xs text-text-muted">
                  Claude will use this description to write real headlines and copy.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Generate + Clear buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={images.length === 0 || loading}
          className={`
            flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            ${images.length > 0 && !loading
              ? 'bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white hover:opacity-90 shadow-lg shadow-coder1-cyan/20'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed border border-border-default'
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing {images.length} screenshot{images.length !== 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Generate Scaffold
            </>
          )}
        </button>

        {images.length > 0 && !loading && (
          <button
            onClick={handleReset}
            className="px-3 py-2.5 rounded-lg text-xs border border-border-default text-text-muted hover:text-text-secondary hover:border-border-hover transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
