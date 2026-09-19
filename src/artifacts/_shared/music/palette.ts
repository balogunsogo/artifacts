export type RGB = [number, number, number];

export type ArtworkPalette = {
  base: RGB;
  accent: RGB;
};

export type PreparedArtwork = {
  image: HTMLImageElement | null;
  palette: ArtworkPalette;
  usedFallback: boolean;
};

type ClampOptions = {
  minimumLuminance?: number;
  maximumLuminance: number;
  maximumSpread: number;
};

type LoadArtworkOptions = {
  signal?: AbortSignal;
  loadTimeoutMs?: number;
  decodeTimeoutMs?: number;
};

export const DEFAULT_PALETTE: ArtworkPalette = {
  base: [22, 22, 24],
  accent: [78, 92, 88],
};

const paletteCache = new Map<string, ArtworkPalette>();
const paletteCacheLimit = 16;

const clonePalette = (palette: ArtworkPalette): ArtworkPalette => ({
  base: [...palette.base] as RGB,
  accent: [...palette.accent] as RGB,
});

const clampChannel = (channel: number) => Math.max(0, Math.min(255, Number.isFinite(channel) ? channel : 0));

export function luminance([red, green, blue]: RGB): number {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function clampColor(color: RGB, {
  minimumLuminance = 0,
  maximumLuminance,
  maximumSpread,
}: ClampOptions): RGB {
  let result = color.map(clampChannel) as RGB;
  const average = result.reduce((total, channel) => total + channel, 0) / result.length;
  const spread = Math.max(...result) - Math.min(...result);

  if (spread > maximumSpread) {
    const saturationScale = maximumSpread / spread;
    result = result.map((channel) => average + (channel - average) * saturationScale) as RGB;
  }

  const currentLuminance = luminance(result);
  if (currentLuminance > maximumLuminance) {
    const brightnessScale = maximumLuminance / currentLuminance;
    result = result.map((channel) => channel * brightnessScale) as RGB;
  } else if (currentLuminance > 0 && currentLuminance < minimumLuminance) {
    const brightnessScale = Math.min(1.6, minimumLuminance / currentLuminance);
    result = result.map((channel) => channel * brightnessScale) as RGB;
  }

  return result.map((channel) => Math.round(Math.max(0, Math.min(170, channel)))) as RGB;
}

export function clampPalette(palette: ArtworkPalette): ArtworkPalette {
  return {
    base: clampColor(palette.base, { maximumLuminance: 58, maximumSpread: 78 }),
    accent: clampColor(palette.accent, {
      minimumLuminance: 36,
      maximumLuminance: 98,
      maximumSpread: 118,
    }),
  };
}

export function extractPaletteFromPixels(pixels: ArrayLike<number>): ArtworkPalette {
  const totals: RGB = [0, 0, 0];
  let samples = 0;
  let accent: RGB = [...DEFAULT_PALETTE.accent] as RGB;
  let accentScore = -1;

  for (let index = 0; index + 3 < pixels.length; index += 16) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];
    const brightest = Math.max(red, green, blue);
    const darkest = Math.min(red, green, blue);
    const pixelLuminance = luminance([red, green, blue]);

    if (alpha < 180 || pixelLuminance < 18 || pixelLuminance > 242) continue;

    totals[0] += red;
    totals[1] += green;
    totals[2] += blue;
    samples += 1;

    const saturation = brightest - darkest;
    const score = saturation * (0.35 + pixelLuminance / 255);
    if (score > accentScore) {
      accentScore = score;
      accent = [red, green, blue];
    }
  }

  if (!samples) return clonePalette(DEFAULT_PALETTE);

  return clampPalette({
    base: totals.map((total) => Math.round(total / samples)) as RGB,
    accent,
  });
}

export function rgbToCss(color: RGB): string {
  return color.join(", ");
}

export function readableForeground(base: RGB): RGB {
  return luminance(base) > 150 ? [18, 18, 17] : [247, 244, 236];
}

function extractPaletteFromImage(image: HTMLImageElement): ArtworkPalette {
  if (typeof document === "undefined") throw new Error("Canvas palette extraction requires a browser document.");

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("A Canvas 2D context is unavailable.");

  try {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return extractPaletteFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function preloadImage(source: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<HTMLImageElement> {
  if (typeof Image === "undefined") throw new Error("Artwork loading requires a browser Image implementation.");

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const abort = () => {
      image.removeAttribute("src");
      finish(new DOMException("Artwork preparation was aborted.", "AbortError"));
    };
    const timeout = window.setTimeout(() => finish(new Error(`Artwork did not load within ${timeoutMs}ms.`)), timeoutMs);

    image.onload = () => finish();
    image.onerror = () => finish(new Error(`Artwork failed to load: ${source}`));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    else image.src = source;
  });

  return image;
}

async function decodeBestEffort(image: HTMLImageElement, signal: AbortSignal | undefined, timeoutMs: number) {
  if (typeof image.decode !== "function") return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish(new DOMException("Artwork decoding was aborted.", "AbortError"));
    const timeout = window.setTimeout(() => finish(), timeoutMs);

    signal?.addEventListener("abort", abort, { once: true });
    image.decode().then(() => finish(), () => finish());
  });
}

export async function loadArtworkPalette(
  source: string,
  { signal, loadTimeoutMs = 8000, decodeTimeoutMs = 1500 }: LoadArtworkOptions = {},
): Promise<PreparedArtwork> {
  try {
    const image = await preloadImage(source, signal, loadTimeoutMs);
    await decodeBestEffort(image, signal, decodeTimeoutMs);
    if (signal?.aborted) throw new DOMException("Artwork preparation was aborted.", "AbortError");

    const cached = paletteCache.get(source);
    if (cached) return { image, palette: clonePalette(cached), usedFallback: false };

    try {
      const palette = extractPaletteFromImage(image);
      if (paletteCache.size >= paletteCacheLimit) {
        const oldestKey = paletteCache.keys().next().value;
        if (oldestKey) paletteCache.delete(oldestKey);
      }
      paletteCache.set(source, clonePalette(palette));
      return { image, palette, usedFallback: false };
    } catch {
      return { image, palette: clonePalette(DEFAULT_PALETTE), usedFallback: true };
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { image: null, palette: clonePalette(DEFAULT_PALETTE), usedFallback: true };
  }
}
