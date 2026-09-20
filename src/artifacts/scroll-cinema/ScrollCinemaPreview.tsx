"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollCinemaPreview.module.scss";

const VIDEO_SRC =
  "/artifacts/scroll-cinema/sound-producer-trimmed.mp4";

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

    const syncMotion = () => {
      const running =
        visible &&
        !document.hidden &&
        !reducedMotion.matches;

      root.dataset.motion = running
        ? "running"
        : "paused";

      if (running) {
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
          src={VIDEO_SRC}
          muted
          loop
          playsInline
          preload="metadata"
          controls={false}
        />
      </div>
    </div>
  );
}