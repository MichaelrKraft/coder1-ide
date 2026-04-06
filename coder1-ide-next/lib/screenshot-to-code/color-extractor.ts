/**
 * Client-side dominant color extraction using Canvas API.
 * Samples a grid of pixels from the image and returns the top N distinct hex colors.
 */

const SAMPLE_GRID = 20;       // 20×20 = 400 sample points
const SIMILARITY_THRESHOLD = 40; // color distance to consider "the same"
const MAX_COLORS = 5;

interface ColorEntry {
  r: number;
  g: number;
  b: number;
  count: number;
}

function colorDistance(a: ColorEntry, b: ColorEntry): number {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
  );
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export async function extractPalette(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve([]); return; }

      ctx.drawImage(img, 0, 0);

      const stepX = Math.max(1, Math.floor(img.width / SAMPLE_GRID));
      const stepY = Math.max(1, Math.floor(img.height / SAMPLE_GRID));
      const buckets: ColorEntry[] = [];

      for (let y = 0; y < img.height; y += stepY) {
        for (let x = 0; x < img.width; x += stepX) {
          const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
          if (a < 128) continue; // skip transparent pixels

          const candidate: ColorEntry = { r, g, b, count: 1 };
          const match = buckets.find(b => colorDistance(b, candidate) < SIMILARITY_THRESHOLD);
          if (match) {
            match.r = Math.round((match.r * match.count + r) / (match.count + 1));
            match.g = Math.round((match.g * match.count + g) / (match.count + 1));
            match.b = Math.round((match.b * match.count + b) / (match.count + 1));
            match.count++;
          } else {
            buckets.push(candidate);
          }
        }
      }

      const palette = buckets
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_COLORS)
        .map(({ r, g, b }) => toHex(r, g, b));

      resolve(palette);
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}
