"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./BlockOrbitArtifact.module.scss";

const faces = ["front", "right", "back", "left", "top", "bottom"] as const;
const images = ["face-01.png", "face-02.png", "face-03.png"] as const;

export function BlockOrbitPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cube = cubeRef.current;
    if (!root || !cube) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const syncMotion = () => {
      cube.dataset.paused = String(!visible || document.hidden || reducedMotion.matches);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      syncMotion();
    }, { threshold: [0, 0.35, 0.6] });
    const onVisibilityChange = () => syncMotion();

    observer.observe(root);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", syncMotion);
    syncMotion();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.preview}`} role="img" aria-label="Orbiting three-dimensional image cube">
      <div className={styles.tilt}>
        <div ref={cubeRef} className={styles.cube} data-paused="true" aria-hidden="true">
          {faces.map((face, index) => (
            <span key={face} className={`${styles.face} ${styles[face]}`}>
              <Image
                src={`/artifacts/block-orbit/${images[index % images.length]}`}
                alt=""
                fill
                draggable={false}
                sizes="(max-width: 900px) 38vw, 12rem"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
