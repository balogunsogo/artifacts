"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollCinemaPreview.module.scss";

// 6 s, 960×540, silent loop cut from the full 4K clip (~290 KB vs ~10 MB).
// The full clip is only loaded on the artifact page.
const VIDEO_SRC =
  "/artifacts/scroll-cinema/sound-producer-preview.mp4";

export function ScrollCinemaPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;

    if (!root || !video) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let visible = false;
    let sourceAttached = false;

    // The clip stays off the critical path: it is attached once the card
    // nears the viewport, or when the browser is idle after load — whichever is first.
    const attachSource = () => {
      if (sourceAttached) return;
      sourceAttached = true;
      video.preload = "metadata";
      video.src = VIDEO_SRC;
      syncMotion();
    };

    const syncMotion = () => {
      const running =
        visible &&
        !document.hidden &&
        !reducedMotion.matches;

      root.dataset.motion = running
        ? "running"
        : "paused";

      if (running && sourceAttached) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible =
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.35;

        syncMotion();
      },
      {
        threshold: [0, 0.35, 0.6],
      }
    );

    observer.observe(root);

    const loader = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) attachSource();
      },
      {
        rootMargin: "50%",
      }
    );

    loader.observe(root);

    let idleHandle: number | null = null;
    const scheduleIdleAttach = () => {
      idleHandle = typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(attachSource, { timeout: 4000 })
        : window.setTimeout(attachSource, 2000);
    };

    if (document.readyState === "complete") scheduleIdleAttach();
    else window.addEventListener("load", scheduleIdleAttach, { once: true });

    document.addEventListener(
      "visibilitychange",
      syncMotion
    );

    reducedMotion.addEventListener(
      "change",
      syncMotion
    );

    syncMotion();

    return () => {
      observer.disconnect();
      loader.disconnect();
      window.removeEventListener("load", scheduleIdleAttach);
      if (idleHandle !== null) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
        else window.clearTimeout(idleHandle);
      }

      document.removeEventListener(
        "visibilitychange",
        syncMotion
      );

      reducedMotion.removeEventListener(
        "change",
        syncMotion
      );

      video.pause();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.preview}
      data-motion="paused"
      aria-hidden="true"
    >
      <div className={styles.frame}>
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          controls={false}
        />
      </div>
    </div>
  );
}