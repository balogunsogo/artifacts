"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ARCHIVE_TRACKS, TRACK_TRANSITION_TRACKS } from "@/artifacts/_shared/music/tracks";
import {
  DEFAULT_PALETTE,
  loadArtworkPalette,
  readableForeground,
  rgbToCss,
  type ArtworkPalette,
} from "@/artifacts/_shared/music/palette";
import styles from "./TrackTransitionArtifact.module.scss";

export type TrackTransitionArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
  initialTrackIndex?: number;
  autoCycle?: boolean;
  footer?: ReactNode;
};

type TransitionPhase = "idle" | "preparing" | "departing" | "committing" | "arriving";

type AmbientBuffer = {
  source: string | null;
  palette: ArtworkPalette;
};

const wrapIndex = (index: number, length: number) => ((index % length) + length) % length;
const emptyBuffer = (): AmbientBuffer => ({ source: null, palette: DEFAULT_PALETTE });

const ambientBackground = (palette: ArtworkPalette) => {
  const base = rgbToCss(palette.base);
  const accent = rgbToCss(palette.accent);
  const middle = palette.base.map((channel, index) => Math.round((channel + palette.accent[index]) / 2)).join(", ");
  const seed = palette.base.reduce((total, channel, index) => total + channel * (index + 3), 0);
  return [
    `radial-gradient(circle at ${38 + (seed % 24)}% 28%, rgba(${accent}, 0.68), transparent 44%)`,
    `radial-gradient(circle at 14% ${62 + (seed % 18)}%, rgba(${base}, 0.58), transparent 50%)`,
    `radial-gradient(circle at ${76 + (seed % 12)}% 58%, rgba(${middle}, 0.3), transparent 48%)`,
    "linear-gradient(180deg, rgba(3, 3, 3, 0.12), rgba(3, 3, 3, 0.68))",
  ].join(", ");
};

export function TrackTransitionArtifact({
  mode = "full",
  className,
  initialTrackIndex = 0,
  autoCycle,
  footer,
}: TrackTransitionArtifactProps) {
  const demoTracks = mode === "full" ? ARCHIVE_TRACKS : TRACK_TRANSITION_TRACKS;
  const startingIndex = wrapIndex(Math.round(initialTrackIndex), demoTracks.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestTrackRef = useRef<(index: number) => void>(() => undefined);
  const shiftTrackRef = useRef<(direction: -1 | 1) => void>(() => undefined);
  const [displayedIndex, setDisplayedIndex] = useState(startingIndex);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [palette, setPalette] = useState<ArtworkPalette>(DEFAULT_PALETTE);
  const [artworkAvailable, setArtworkAvailable] = useState(true);
  const [ambientBuffers, setAmbientBuffers] = useState<[AmbientBuffer, AmbientBuffer]>(() => [
    { source: demoTracks[startingIndex].artworkSrc, palette: DEFAULT_PALETTE },
    emptyBuffer(),
  ]);
  const [activeBuffer, setActiveBuffer] = useState<0 | 1>(0);
  const [preparedBuffer, setPreparedBuffer] = useState<0 | 1 | null>(null);
  const [bloomingBuffer, setBloomingBuffer] = useState<0 | 1 | null>(null);
  const shouldAutoCycle = autoCycle ?? mode === "preview";
  const displayedTrack = demoTracks[displayedIndex];

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
    let midpointTimer: number | null = null;
    let cleanupTimer: number | null = null;
    let cycleTimer: number | null = null;
    let arrivalFrame: number | null = null;
    let observer: IntersectionObserver | null = null;

    const clearTransitionWork = () => {
      if (midpointTimer !== null) window.clearTimeout(midpointTimer);
      if (cleanupTimer !== null) window.clearTimeout(cleanupTimer);
      if (arrivalFrame !== null) window.cancelAnimationFrame(arrivalFrame);
      midpointTimer = null;
      cleanupTimer = null;
      arrivalFrame = null;
      setBloomingBuffer(null);
    };

    const clearCycle = () => {
      if (cycleTimer !== null) window.clearInterval(cycleTimer);
      cycleTimer = null;
    };

    const syncCycle = () => {
      clearCycle();
      const canAnimate = visible && !document.hidden && !reducedMotion.matches;
      root.dataset.motion = canAnimate ? "running" : "paused";
      if (!shouldAutoCycle || !canAnimate) return;
      cycleTimer = window.setInterval(() => {
        requestTrackRef.current(currentIndex + 1);
      }, 6500);
    };

    const commitTrack = (
      targetIndex: number,
      targetPalette: ArtworkPalette,
      hasArtwork: boolean,
      incomingBuffer: 0 | 1,
      outgoingBuffer: 0 | 1,
      transitionGeneration: number,
    ) => {
      if (!mounted || transitionGeneration !== generation || requestedIndex !== targetIndex) return;

      currentIndex = targetIndex;
      currentBuffer = incomingBuffer;
      setDisplayedIndex(targetIndex);
      setArtworkAvailable(hasArtwork);
      setPalette(targetPalette);
      setActiveBuffer(incomingBuffer);
      setPreparedBuffer(null);

      if (reducedMotion.matches) {
        setPhase("idle");
        setBloomingBuffer(null);
        setAmbientBuffers((current) => {
          const next = [...current] as [AmbientBuffer, AmbientBuffer];
          next[outgoingBuffer] = emptyBuffer();
          return next;
        });
        return;
      }

      setPhase("committing");
      setBloomingBuffer(incomingBuffer);
      arrivalFrame = window.requestAnimationFrame(() => {
        arrivalFrame = null;
        if (!mounted || transitionGeneration !== generation) return;
        setPhase("arriving");
        cleanupTimer = window.setTimeout(() => {
          cleanupTimer = null;
          if (!mounted || transitionGeneration !== generation) return;
          setAmbientBuffers((current) => {
            const next = [...current] as [AmbientBuffer, AmbientBuffer];
            next[outgoingBuffer] = emptyBuffer();
            return next;
          });
          setBloomingBuffer(null);
          setPhase("idle");
        }, 900);
      });
    };

    const prepareTrack = async (targetIndex: number, animate: boolean) => {
      const transitionGeneration = ++generation;
      controller?.abort();
      controller = new AbortController();
      clearTransitionWork();
      const incomingBuffer: 0 | 1 = currentBuffer === 0 ? 1 : 0;
      const outgoingBuffer = currentBuffer;
      setPreparedBuffer(incomingBuffer);
      setPhase("preparing");

      let preparedPalette = DEFAULT_PALETTE;
      let hasArtwork = false;
      try {
        const prepared = await loadArtworkPalette(demoTracks[targetIndex].artworkSrc, { signal: controller.signal });
        if (!mounted || transitionGeneration !== generation || requestedIndex !== targetIndex) return;
        preparedPalette = prepared.palette;
        hasArtwork = prepared.image !== null;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!mounted || transitionGeneration !== generation || requestedIndex !== targetIndex) return;
      }

      setAmbientBuffers((current) => {
        const next = [...current] as [AmbientBuffer, AmbientBuffer];
        next[incomingBuffer] = {
          source: hasArtwork ? demoTracks[targetIndex].artworkSrc : null,
          palette: preparedPalette,
        };
        return next;
      });

      if (!animate || reducedMotion.matches) {
        commitTrack(targetIndex, preparedPalette, hasArtwork, incomingBuffer, outgoingBuffer, transitionGeneration);
        return;
      }

      setPhase("departing");
      midpointTimer = window.setTimeout(() => {
        midpointTimer = null;
        commitTrack(targetIndex, preparedPalette, hasArtwork, incomingBuffer, outgoingBuffer, transitionGeneration);
      }, 180);
    };

    const requestTrack = (index: number) => {
      const targetIndex = wrapIndex(index, demoTracks.length);
      if (targetIndex === requestedIndex) return;
      requestedIndex = targetIndex;

      if (targetIndex === currentIndex) {
        generation += 1;
        controller?.abort();
        clearTransitionWork();
        setPreparedBuffer(null);
        setPhase("idle");
        return;
      }

      void prepareTrack(targetIndex, true);
    };

    requestTrackRef.current = requestTrack;
    shiftTrackRef.current = (direction) => requestTrack(requestedIndex + direction);

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
    void prepareTrack(startingIndex, false);

    return () => {
      mounted = false;
      generation += 1;
      controller?.abort();
      observer?.disconnect();
      clearCycle();
      if (midpointTimer !== null) window.clearTimeout(midpointTimer);
      if (cleanupTimer !== null) window.clearTimeout(cleanupTimer);
      if (arrivalFrame !== null) window.cancelAnimationFrame(arrivalFrame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onReducedMotionChange);
      requestTrackRef.current = () => undefined;
      shiftTrackRef.current = () => undefined;
    };
  }, [demoTracks, mode, shouldAutoCycle, startingIndex]);

  const foreground = useMemo(() => readableForeground(palette.base), [palette]);
  const rootStyle = {
    "--palette-base": rgbToCss(palette.base),
    "--palette-accent": rgbToCss(palette.accent),
    "--palette-foreground": rgbToCss(foreground),
    backgroundColor: `rgb(${rgbToCss(palette.base)})`,
  } as CSSProperties;
  const rootClassName = [
    styles.root,
    mode === "preview" ? styles.preview : styles.full,
    styles[phase],
    className,
  ].filter(Boolean).join(" ");

  const titleWords = displayedTrack.title.split(/\s+/).filter(Boolean);

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={rootStyle}
      data-motion="paused"
      aria-hidden={mode === "preview" ? true : undefined}
    >
      <div className={styles.ambientField} aria-hidden="true">
        {ambientBuffers.map((buffer, index) => (
          <div
            key={index}
            className={[
              styles.ambientBuffer,
              activeBuffer === index ? styles.active : "",
              preparedBuffer === index ? styles.prepared : "",
              bloomingBuffer === index ? styles.blooming : "",
            ].filter(Boolean).join(" ")}
            style={{ backgroundImage: ambientBackground(buffer.palette) }}
          >
            {buffer.source && <Image src={buffer.source} alt="" aria-hidden="true" fill sizes="100vw" unoptimized />}
          </div>
        ))}
        <span className={styles.accentBloom} />
        <span className={styles.grain} />
        <span className={styles.shade} />
      </div>

      <div className={styles.composition} aria-busy={phase !== "idle"}>
        <div className={styles.artworkColumn}>
          <div className={styles.artworkFrame}>
            {artworkAvailable ? (
              <Image
                key={displayedTrack.id}
                src={displayedTrack.artworkSrc}
                alt={`${displayedTrack.title} by ${displayedTrack.artist} album artwork`}
                fill
                sizes={mode === "preview" ? "(max-width: 560px) 38vw, 11rem" : "(max-width: 760px) calc(100vw - 2.5rem), 27rem"}
                loading={mode === "preview" ? "lazy" : "eager"}
                unoptimized
              />
            ) : (
              <span className={styles.artworkFallback} aria-label="Artwork unavailable" />
            )}
          </div>
          <span className={styles.position}>
            {String(displayedIndex + 1).padStart(2, "0")} / {String(demoTracks.length).padStart(2, "0")}
          </span>
        </div>

        <div className={styles.copy}>
          <h2 className={styles.title}>
            <span className={styles.srOnly}>{displayedTrack.title}</span>
            <span aria-hidden="true">
              {titleWords.map((word, index) => (
                <span
                  key={`${displayedTrack.id}-${word}-${index}`}
                  className={styles.titleWord}
                  style={{
                    "--word-index": Math.min(index, 8),
                    "--word-delay": `${60 + Math.min(index, 8) * 26}ms`,
                  } as CSSProperties}
                >
                  {word}{index < titleWords.length - 1 ? "\u00a0" : ""}
                </span>
              ))}
            </span>
          </h2>
          <p className={styles.artist}>{displayedTrack.artist}</p>
          <p className={styles.collection}>{displayedTrack.album}</p>
          {mode === "preview" && <span className={styles.progress} aria-hidden="true"><i key={displayedTrack.id} /></span>}

          {mode === "full" && (
            <div className={styles.controls} role="group" aria-label="Item navigation">
              <button type="button" aria-label="Previous item" onClick={() => shiftTrackRef.current(-1)}>
                Previous
              </button>
              <button type="button" aria-label="Next item" onClick={() => shiftTrackRef.current(1)}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
