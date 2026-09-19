"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PALETTE_SHIFT_TRACKS } from "@/artifacts/_shared/music/tracks";
import {
  DEFAULT_PALETTE,
  loadArtworkPalette,
  readableForeground,
  rgbToCss,
  type ArtworkPalette,
} from "@/artifacts/_shared/music/palette";
import styles from "./PaletteShiftArtifact.module.scss";

export type PaletteShiftArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
  initialArtworkIndex?: number;
  autoCycle?: boolean;
};

type BufferState = {
  source: string | null;
  palette: ArtworkPalette;
};

const artworkSources = PALETTE_SHIFT_TRACKS.map((track) => track.artworkSrc);

const normalizeIndex = (index: number) => Math.max(0, Math.min(artworkSources.length - 1, Math.round(index)));
const emptyBuffer = (): BufferState => ({ source: null, palette: DEFAULT_PALETTE });

const ambientBackground = (palette: ArtworkPalette) => {
  const base = rgbToCss(palette.base);
  const accent = rgbToCss(palette.accent);
  const middle = palette.base.map((channel, index) => Math.round((channel + palette.accent[index]) / 2)).join(", ");
  const seed = palette.base.reduce((total, channel, index) => total + channel * (index + 3), 0);
  return [
    `radial-gradient(circle at ${38 + (seed % 24)}% 28%, rgba(${accent}, 0.72), transparent 44%)`,
    `radial-gradient(circle at 14% ${62 + (seed % 18)}%, rgba(${base}, 0.64), transparent 50%)`,
    `radial-gradient(circle at ${76 + (seed % 12)}% 58%, rgba(${middle}, 0.34), transparent 48%)`,
    "linear-gradient(180deg, rgba(4, 4, 4, 0.08), rgba(4, 4, 4, 0.58))",
  ].join(", ");
};

export function PaletteShiftArtifact({
  mode = "full",
  className,
  initialArtworkIndex = 0,
  autoCycle,
}: PaletteShiftArtifactProps) {
  const startingIndex = normalizeIndex(initialArtworkIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectArtworkRef = useRef<(index: number) => void>(() => undefined);
  const [buffers, setBuffers] = useState<[BufferState, BufferState]>(() => [
    { source: artworkSources[startingIndex], palette: DEFAULT_PALETTE },
    emptyBuffer(),
  ]);
  const [activeBuffer, setActiveBuffer] = useState<0 | 1>(0);
  const [bloomingBuffer, setBloomingBuffer] = useState<0 | 1 | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(startingIndex);
  const [palette, setPalette] = useState<ArtworkPalette>(DEFAULT_PALETTE);
  const [isPreparing, setIsPreparing] = useState(false);
  const shouldAutoCycle = autoCycle ?? mode === "preview";

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mounted = true;
    let visible = mode === "full";
    let generation = 0;
    let currentIndex = startingIndex;
    let requestedIndex = startingIndex;
    let currentBuffer: 0 | 1 = 0;
    let controller: AbortController | null = null;
    let observer: IntersectionObserver | null = null;
    let cycleTimer: number | null = null;
    let cleanupTimer: number | null = null;
    let bloomTimer: number | null = null;
    const transitionFrames = new Set<number>();

    const clearCycle = () => {
      if (cycleTimer !== null) window.clearInterval(cycleTimer);
      cycleTimer = null;
    };

    const clearTransitionWork = () => {
      if (cleanupTimer !== null) window.clearTimeout(cleanupTimer);
      if (bloomTimer !== null) window.clearTimeout(bloomTimer);
      cleanupTimer = null;
      bloomTimer = null;
      transitionFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      transitionFrames.clear();
    };

    const syncCycle = () => {
      clearCycle();
      const canAnimate = visible && !document.hidden && !reducedMotion.matches;
      const canCycle = shouldAutoCycle && canAnimate;
      root.dataset.motion = canAnimate ? "running" : "paused";
      if (!canCycle) return;
      cycleTimer = window.setInterval(() => {
        selectArtworkRef.current((currentIndex + 1) % artworkSources.length);
      }, 5000);
    };

    const prepareArtwork = async (index: number, animate: boolean) => {
      const nextIndex = normalizeIndex(index);
      requestedIndex = nextIndex;
      const nextGeneration = ++generation;
      controller?.abort();
      controller = new AbortController();
      clearTransitionWork();
      if (mounted) setIsPreparing(true);

      try {
        const prepared = await loadArtworkPalette(artworkSources[nextIndex], { signal: controller.signal });
        if (!mounted || nextGeneration !== generation) return;

        if (!animate || reducedMotion.matches) {
          const slot = currentBuffer;
          setBuffers((current) => {
            const next = [...current] as [BufferState, BufferState];
            next[slot] = { source: artworkSources[nextIndex], palette: prepared.palette };
            next[slot === 0 ? 1 : 0] = emptyBuffer();
            return next;
          });
          setPalette(prepared.palette);
          setSelectedIndex(nextIndex);
          setBloomingBuffer(null);
          currentIndex = nextIndex;
          setIsPreparing(false);
          return;
        }

        const incomingBuffer: 0 | 1 = currentBuffer === 0 ? 1 : 0;
        const outgoingBuffer = currentBuffer;
        setBuffers((current) => {
          const next = [...current] as [BufferState, BufferState];
          next[incomingBuffer] = { source: artworkSources[nextIndex], palette: prepared.palette };
          return next;
        });

        const firstFrame = window.requestAnimationFrame(() => {
          transitionFrames.delete(firstFrame);
          const secondFrame = window.requestAnimationFrame(() => {
            transitionFrames.delete(secondFrame);
            if (!mounted || nextGeneration !== generation) return;
            currentBuffer = incomingBuffer;
            currentIndex = nextIndex;
            setActiveBuffer(incomingBuffer);
            setBloomingBuffer(incomingBuffer);
            setPalette(prepared.palette);
            setSelectedIndex(nextIndex);
            setIsPreparing(false);

            bloomTimer = window.setTimeout(() => {
              if (mounted && nextGeneration === generation) setBloomingBuffer(null);
              bloomTimer = null;
            }, 720);
            cleanupTimer = window.setTimeout(() => {
              if (mounted && nextGeneration === generation) {
                setBuffers((current) => {
                  const next = [...current] as [BufferState, BufferState];
                  next[outgoingBuffer] = emptyBuffer();
                  return next;
                });
              }
              cleanupTimer = null;
            }, 900);
          });
          transitionFrames.add(secondFrame);
        });
        transitionFrames.add(firstFrame);
      } catch (error) {
        if (mounted && !(error instanceof DOMException && error.name === "AbortError")) {
          requestedIndex = currentIndex;
          setPalette(DEFAULT_PALETTE);
          setIsPreparing(false);
        }
      }
    };

    selectArtworkRef.current = (index) => {
      if (normalizeIndex(index) === requestedIndex) return;
      void prepareArtwork(index, true);
    };

    const onVisibilityChange = () => syncCycle();
    const onReducedMotionChange = () => syncCycle();

    if (mode === "preview") {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        syncCycle();
      }, { threshold: [0, 0.35, 0.6] });
      observer.observe(root);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onReducedMotionChange);
    syncCycle();
    void prepareArtwork(startingIndex, false);

    return () => {
      mounted = false;
      generation += 1;
      controller?.abort();
      observer?.disconnect();
      clearCycle();
      clearTransitionWork();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onReducedMotionChange);
      selectArtworkRef.current = () => undefined;
    };
  }, [mode, shouldAutoCycle, startingIndex]);

  const foreground = useMemo(() => readableForeground(palette.base), [palette]);
  const rootStyle = {
    "--palette-base": rgbToCss(palette.base),
    "--palette-accent": rgbToCss(palette.accent),
    "--palette-foreground": rgbToCss(foreground),
    backgroundColor: `rgb(${rgbToCss(palette.base)})`,
  } as CSSProperties;

  const rootClassName = [styles.root, mode === "preview" ? styles.preview : styles.full, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClassName} style={rootStyle} data-motion="paused">
      <div className={styles.field} aria-hidden="true">
        {buffers.map((buffer, index) => {
          const bufferStyle = { backgroundImage: ambientBackground(buffer.palette) };
          return (
            <div
              key={index}
              className={[
                styles.ambientBuffer,
                activeBuffer === index ? styles.active : "",
                bloomingBuffer === index ? styles.blooming : "",
              ].filter(Boolean).join(" ")}
              style={bufferStyle}
            >
              {buffer.source && <Image src={buffer.source} alt="" aria-hidden="true" fill sizes="100vw" unoptimized />}
            </div>
          );
        })}
        <span className={styles.accentBloom} />
        <span className={styles.grain} />
        <span className={styles.shade} />
      </div>

      <div className={styles.artworkStage}>
        <div className={styles.artworkFrame}>
          {buffers.map((buffer, index) => buffer.source && (
            <div key={index} className={[styles.artworkBuffer, activeBuffer === index ? styles.active : ""].filter(Boolean).join(" ")}>
              <Image
                src={buffer.source}
                alt={activeBuffer === index
                  ? `${PALETTE_SHIFT_TRACKS[selectedIndex].title} by ${PALETTE_SHIFT_TRACKS[selectedIndex].artist} album artwork`
                  : ""}
                aria-hidden={activeBuffer !== index}
                fill
                sizes={mode === "preview" ? "(max-width: 560px) 48vw, 12rem" : "(max-width: 720px) 62vw, 27rem"}
                loading={mode === "preview" ? "lazy" : "eager"}
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>

      {mode === "full" && (
        <>
          <div className={styles.paletteReadout} aria-label="Extracted artwork palette">
            <span><i className={styles.baseSwatch} />Base</span>
            <span><i className={styles.accentSwatch} />Accent</span>
          </div>
          <div className={styles.controls} role="group" aria-label="Choose demonstration artwork">
            {PALETTE_SHIFT_TRACKS.map((track, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Use artwork for ${track.title}`}
                aria-pressed={selectedIndex === index}
                onClick={() => selectArtworkRef.current(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <p className={styles.status} aria-live="polite">
            {isPreparing ? "Preparing artwork palette" : `Artwork ${selectedIndex + 1} selected`}
          </p>
        </>
      )}
    </div>
  );
}
