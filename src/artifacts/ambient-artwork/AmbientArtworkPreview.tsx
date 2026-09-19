"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { AMBIENT_ARTWORK_TRACK } from "@/artifacts/_shared/music/tracks";
import styles from "./AmbientArtworkPreview.module.scss";

export function AmbientArtworkPreview() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const syncMotion = () => {
      root.dataset.motion = visible && !document.hidden && !reducedMotion.matches ? "running" : "paused";
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

  const track = AMBIENT_ARTWORK_TRACK;
  return (
    <div ref={rootRef} className={styles.preview} data-motion="paused" aria-hidden="true">
      <div className={styles.stage}>
        <div className={styles.artwork}>
          <Image src={track.artworkSrc} alt="" fill sizes="(max-width: 900px) 54vw, 13rem" loading="lazy" unoptimized />
          <span className={styles.reflection} />
        </div>
      </div>
    </div>
  );
}
