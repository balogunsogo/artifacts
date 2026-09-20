"use client";

import { useEffect, useRef } from "react";
import { scrollCinemaVideoId } from "./youtube-player";
import styles from "./ScrollCinemaPreview.module.scss";

export function ScrollCinemaPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const player = playerRef.current;
    if (!root || !player) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const syncMotion = () => {
      const running = visible && !document.hidden && !reducedMotion.matches;
      root.dataset.motion = running ? "running" : "paused";
      player.contentWindow?.postMessage(JSON.stringify({ event: "command", func: running ? "playVideo" : "pauseVideo", args: [] }), "https://www.youtube.com");
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
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.preview} data-motion="paused" aria-hidden="true">
      <div className={styles.frame}>
        <iframe
          ref={playerRef}
          title="Scroll Cinema video preview"
          src={`https://www.youtube.com/embed/${scrollCinemaVideoId}?autoplay=1&controls=0&disablekb=1&enablejsapi=1&fs=0&iv_load_policy=3&loop=1&modestbranding=1&mute=1&playsinline=1&playlist=${scrollCinemaVideoId}&rel=0`}
          allow="autoplay; encrypted-media"
        />
      </div>
    </div>
  );
}
