"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollCinemaPreview.module.scss";

export function ScrollCinemaPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const syncMotion = () => {
      const running = visible && !document.hidden && !reducedMotion.matches;
      root.dataset.motion = running ? "running" : "paused";
      if (running) void video.play().catch(() => undefined);
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      syncMotion();
    }, { threshold: [0, 0.35, 0.6] });

    observer.observe(root);
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);
    syncMotion();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
      video.pause();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.preview} data-motion="paused" aria-hidden="true">
      <div className={styles.frame}>
        <video ref={videoRef} muted loop playsInline preload="metadata" disablePictureInPicture>
          <source src="/artifacts/scroll-cinema/video-mobile.mp4" media="(max-width: 700px)" type="video/mp4" />
          <source src="/artifacts/scroll-cinema/video-desktop.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
