"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ARCHIVE_TRACKS } from "@/artifacts/_shared/music/tracks";
import styles from "./AmbientArtworkPreview.module.scss";

// Survives client-side navigation, so returning to the index never repeats the last cover.
let lastArtworkIndex = -1;

function pickArtworkIndex() {
  let index = Math.floor(Math.random() * ARCHIVE_TRACKS.length);
  if (index === lastArtworkIndex) index = (index + 1) % ARCHIVE_TRACKS.length;
  lastArtworkIndex = index;
  return index;
}

export function AmbientArtworkPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [artworkIndex, setArtworkIndex] = useState<number | null>(null);

  // Picked after mount so server and client markup match; a new cover on every visit.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setArtworkIndex(pickArtworkIndex()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

  const track = artworkIndex === null ? null : ARCHIVE_TRACKS[artworkIndex];
  return (
    <div ref={rootRef} className={styles.preview} data-motion="paused" aria-hidden="true">
      <div className={styles.stage}>
        <div className={styles.artwork}>
          {track && (
            <Image
              key={track.artworkSrc}
              className={styles.image}
              src={track.artworkSrc}
              alt=""
              fill
              sizes="(max-width: 900px) 54vw, 13rem"
              loading="lazy"
            />
          )}
          <span className={styles.reflection} />
        </div>
      </div>
    </div>
  );
}
