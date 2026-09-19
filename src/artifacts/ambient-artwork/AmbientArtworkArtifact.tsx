"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AMBIENT_ARTWORK_TRACK, ARCHIVE_TRACKS } from "@/artifacts/_shared/music/tracks";
import styles from "./AmbientArtworkArtifact.module.scss";

export type AmbientArtworkArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
  interactive?: boolean;
  artworkSrc?: string;
  playbackState?: "playing" | "paused";
};

type TiltState = {
  currentX: number;
  currentY: number;
  currentLift: number;
  targetX: number;
  targetY: number;
  targetLift: number;
};

export function AmbientArtworkArtifact({
  mode = "full",
  className,
  interactive = true,
  artworkSrc = AMBIENT_ARTWORK_TRACK.artworkSrc,
  playbackState = "playing",
}: AmbientArtworkArtifactProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const artStageRef = useRef<HTMLDivElement>(null);
  const artworkRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(playbackState);
  const [currentArtworkSrc, setCurrentArtworkSrc] = useState(artworkSrc);

  useEffect(() => {
    const root = rootRef.current;
    const artStage = artStageRef.current;
    const artwork = artworkRef.current;
    if (!root || !artStage || !artwork) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tilt: TiltState = {
      currentX: 0,
      currentY: 0,
      currentLift: 0,
      targetX: 0,
      targetY: 0,
      targetLift: 0,
    };
    let frame: number | null = null;
    let bounds: DOMRect | null = null;
    let visible = false;
    let pointerListening = false;

    const renderDepth = () => {
      tilt.currentX += (tilt.targetX - tilt.currentX) * 0.11;
      tilt.currentY += (tilt.targetY - tilt.currentY) * 0.11;
      tilt.currentLift += (tilt.targetLift - tilt.currentLift) * 0.09;

      artwork.style.setProperty("--tilt-x", `${tilt.currentX.toFixed(3)}deg`);
      artwork.style.setProperty("--tilt-y", `${tilt.currentY.toFixed(3)}deg`);
      artwork.style.setProperty("--art-lift", `${tilt.currentLift.toFixed(3)}px`);
      artwork.style.setProperty("--reflection-shift", `${(tilt.currentY * 8).toFixed(2)}%`);
      artwork.style.setProperty("--reflection-opacity", `${(0.12 + Math.abs(tilt.currentY) * 0.035).toFixed(3)}`);
      artwork.style.setProperty("--shadow-x", `${(tilt.currentY * -1.15).toFixed(2)}px`);

      const distance = Math.abs(tilt.targetX - tilt.currentX)
        + Math.abs(tilt.targetY - tilt.currentY)
        + Math.abs(tilt.targetLift - tilt.currentLift);

      if (distance > 0.01) {
        frame = window.requestAnimationFrame(renderDepth);
      } else {
        tilt.currentX = tilt.targetX;
        tilt.currentY = tilt.targetY;
        tilt.currentLift = tilt.targetLift;
        frame = null;
      }
    };

    const requestDepthFrame = () => {
      if (frame === null) frame = window.requestAnimationFrame(renderDepth);
    };

    const resetDepth = (immediate = false) => {
      tilt.targetX = 0;
      tilt.targetY = 0;
      tilt.targetLift = 0;
      bounds = null;

      if (immediate) {
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
        tilt.currentX = 0;
        tilt.currentY = 0;
        tilt.currentLift = 0;
        artwork.style.setProperty("--tilt-x", "0deg");
        artwork.style.setProperty("--tilt-y", "0deg");
        artwork.style.setProperty("--art-lift", "0px");
        artwork.style.setProperty("--reflection-shift", "0%");
        artwork.style.setProperty("--shadow-x", "0px");
        return;
      }

      requestDepthFrame();
    };

    const canUseDepth = () => interactive
      && visible
      && finePointer.matches
      && !reducedMotion.matches
      && !document.hidden;

    const onPointerEnter = () => {
      if (!canUseDepth()) return;
      bounds = artStage.getBoundingClientRect();
      tilt.targetLift = mode === "preview" ? -3.5 : -6;
      requestDepthFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!canUseDepth() || !bounds) return;
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
      const maximum = mode === "preview" ? 4.2 : 6.4;
      tilt.targetX = Math.max(-maximum, Math.min(maximum, vertical * maximum * -2));
      tilt.targetY = Math.max(-maximum, Math.min(maximum, horizontal * maximum * 2));
      requestDepthFrame();
    };

    const onPointerLeave = () => resetDepth();

    const syncPointerListeners = () => {
      const shouldListen = interactive && finePointer.matches && !reducedMotion.matches;
      if (pointerListening === shouldListen) return;
      pointerListening = shouldListen;
      if (shouldListen) {
        artStage.addEventListener("pointerenter", onPointerEnter);
        artStage.addEventListener("pointermove", onPointerMove, { passive: true });
        artStage.addEventListener("pointerleave", onPointerLeave);
        artStage.addEventListener("pointercancel", onPointerLeave);
      } else {
        artStage.removeEventListener("pointerenter", onPointerEnter);
        artStage.removeEventListener("pointermove", onPointerMove);
        artStage.removeEventListener("pointerleave", onPointerLeave);
        artStage.removeEventListener("pointercancel", onPointerLeave);
        resetDepth(true);
      }
    };

    const syncMotion = () => {
      const shouldAnimate = visible && !document.hidden && !reducedMotion.matches;
      artStage.dataset.motion = shouldAnimate ? "running" : "paused";
      if (!shouldAnimate) resetDepth(true);
      syncPointerListeners();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.08;
        syncMotion();
      },
      { threshold: [0, 0.08, 0.25] },
    );

    const onVisibilityChange = () => syncMotion();
    const onCapabilityChange = () => syncPointerListeners();
    const onReducedMotionChange = () => syncMotion();

    artStage.dataset.motion = "paused";
    observer.observe(root);
    document.addEventListener("visibilitychange", onVisibilityChange);
    finePointer.addEventListener("change", onCapabilityChange);
    reducedMotion.addEventListener("change", onReducedMotionChange);
    syncPointerListeners();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      finePointer.removeEventListener("change", onCapabilityChange);
      reducedMotion.removeEventListener("change", onReducedMotionChange);
      artStage.removeEventListener("pointerenter", onPointerEnter);
      artStage.removeEventListener("pointermove", onPointerMove);
      artStage.removeEventListener("pointerleave", onPointerLeave);
      artStage.removeEventListener("pointercancel", onPointerLeave);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [interactive, mode]);

  const rootClassName = [
    styles.root,
    mode === "preview" ? styles.preview : styles.full,
    state === "playing" ? styles.playing : styles.paused,
    className,
  ].filter(Boolean).join(" ");
  const currentTrack = ARCHIVE_TRACKS.find((track) => track.artworkSrc === currentArtworkSrc);

  const shuffleArtwork = () => {
    setCurrentArtworkSrc((current) => {
      const currentIndex = ARCHIVE_TRACKS.findIndex((track) => track.artworkSrc === current);
      const offset = 1 + Math.floor(Math.random() * (ARCHIVE_TRACKS.length - 1));
      const nextIndex = currentIndex < 0 ? offset - 1 : (currentIndex + offset) % ARCHIVE_TRACKS.length;
      return ARCHIVE_TRACKS[nextIndex].artworkSrc;
    });
  };

  return (
    <div ref={rootRef} className={rootClassName}>
      <div ref={artStageRef} className={styles.artStage} data-motion="paused">
        <div ref={artworkRef} className={styles.artwork}>
          <Image
            key={currentArtworkSrc}
            className={styles.image}
            src={currentArtworkSrc}
            alt={currentTrack
              ? `${currentTrack.title} by ${currentTrack.artist} album artwork`
              : "Artwork for ambient depth study"}
            fill
            sizes={mode === "preview" ? "(max-width: 560px) 62vw, 13rem" : "(max-width: 720px) 78vw, 30rem"}
            loading={mode === "preview" ? "lazy" : "eager"}
            unoptimized
          />
          <span className={styles.reflection} aria-hidden="true" />
        </div>
      </div>

      {mode === "full" && (
        <div className={styles.controls}>
          <button
            className={styles.stateControl}
            type="button"
            aria-pressed={state === "playing"}
            aria-label={`Artwork motion is ${state}. Toggle motion state`}
            onClick={() => setState((current) => current === "playing" ? "paused" : "playing")}
          >
            {state === "playing" ? "Playing" : "Paused"}
          </button>
          <button
            className={styles.shuffleControl}
            type="button"
            aria-label={`Shuffle artwork${currentTrack ? `. Current artwork: ${currentTrack.title} by ${currentTrack.artist}` : ""}`}
            onClick={shuffleArtwork}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 3h5v5M4 6h3.5c4.8 0 4.8 12 9.5 12h4M18 15l3 3-3 3M4 18h3.5c1.7 0 2.8-1.5 3.8-3.5M14.3 8.9C15.1 7.3 16 6 17 6h4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
