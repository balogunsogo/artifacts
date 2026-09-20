"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { spatialServices } from "./spatial-services.data";
import styles from "./SpatialServicesPreview.module.scss";

const previewServices = spatialServices.slice(0, 3);

export function SpatialServicesPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isVisible = false;
    let pageIsVisible = document.visibilityState === "visible";
    let timer: number | undefined;

    const canRun = () => isVisible && pageIsVisible && !reducedMotion.matches;
    const cycle = () => {
      if (canRun()) setActiveIndex((index) => (index + 1) % previewServices.length);
    };
    const start = () => {
      window.clearInterval(timer);
      if (canRun()) timer = window.setInterval(cycle, 2800);
    };
    const onVisibilityChange = ([entry]: IntersectionObserverEntry[]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else window.clearInterval(timer);
    };
    const onPageVisibilityChange = () => {
      pageIsVisible = document.visibilityState === "visible";
      if (pageIsVisible) start();
      else window.clearInterval(timer);
    };
    const onMotionPreferenceChange = () => {
      if (reducedMotion.matches) setActiveIndex(0);
      start();
    };

    const visibilityObserver = new IntersectionObserver(onVisibilityChange, { threshold: 0.1 });
    visibilityObserver.observe(root);
    document.addEventListener("visibilitychange", onPageVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      window.clearInterval(timer);
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onPageVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.preview} aria-hidden="true">
      <div className={styles.list}>
        {previewServices.map((service, index) => (
          <span key={service.label} className={index === activeIndex ? styles.active : ""}>
            {service.label}
            <i aria-hidden="true" />
          </span>
        ))}
      </div>
      <div className={styles.image}>
        {previewServices.map((service, index) => (
          <Image
            key={service.image}
            src={service.image}
            alt=""
            fill
            sizes="(max-width: 900px) 55vw, 12rem"
            className={index === activeIndex ? styles.visible : ""}
            style={{ objectPosition: service.objectPosition }}
          />
        ))}
      </div>
    </div>
  );
}