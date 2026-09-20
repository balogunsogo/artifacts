"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { getOrbitMetrics, getOrbitPoint } from "./three-image-orbit.config";
import styles from "./ThreeImageOrbit.module.scss";

gsap.registerPlugin(useGSAP);

type OrbitImage = { src: string; alt: string };

export type ThreeImageOrbitProps = {
  images: [OrbitImage, OrbitImage, OrbitImage];
  mode?: "full" | "preview";
  label?: string;
};

const duration = 10;

export function ThreeImageOrbit({ images, mode = "full", label = "Three images moving through shared depth" }: ThreeImageOrbitProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useGSAP(() => {
    const root = rootRef.current;
    const cards = cardRefs.current.filter((card): card is HTMLDivElement => card !== null);
    if (!root || cards.length !== 3) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let orbitProgress = 0;
    let lastTick = performance.now();
    let lastWidth = root.clientWidth;
    let isVisible = false;
    let pageIsVisible = document.visibilityState === "visible";
    let assembled = false;
    let assemblyTimeline: gsap.core.Timeline | null = null;
    let tickerRunning = false;

    const getMetrics = () => getOrbitMetrics(root.clientWidth, mode, window.innerWidth);

    const renderOrbit = (progress: number) => {
      const metrics = getMetrics();
      cards.forEach((card, index) => {
        const position = getOrbitPoint(progress, index, metrics);
        card.style.transform = `translate3d(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px), ${position.z}px) scale(${position.scale})`;
        card.style.opacity = String(position.opacity);
        card.style.zIndex = String(1000 + Math.round(position.z));
      });
    };

    const stopTicker = () => {
      if (!tickerRunning) return;
      gsap.ticker.remove(onTick);
      tickerRunning = false;
    };

    const onTick = () => {
      if (!isVisible || !pageIsVisible || reducedMotion.matches || !assembled) return;
      const now = performance.now();
      const elapsed = Math.min(64, now - lastTick);
      lastTick = now;
      orbitProgress = (orbitProgress + elapsed / (duration * 1000)) % 1;
      renderOrbit(orbitProgress);
    };

    const startTicker = () => {
      if (tickerRunning || !isVisible || !pageIsVisible || reducedMotion.matches || !assembled) return;
      lastTick = performance.now();
      gsap.ticker.add(onTick);
      tickerRunning = true;
    };

    const assemble = () => {
      if (assembled || !isVisible || !pageIsVisible) return;
      assembled = true;
      assemblyTimeline?.kill();
      const metrics = getMetrics();
      const targets = cards.map((_, index) => getOrbitPoint(0, index, metrics));
      gsap.set(cards, { x: 0, y: 0, z: 0, scale: 0.84, opacity: 1 });
      if (reducedMotion.matches) {
        orbitProgress = 0;
        renderOrbit(orbitProgress);
        return;
      }
      assemblyTimeline = gsap.timeline({
        onComplete: () => {
          orbitProgress = 0;
          renderOrbit(orbitProgress);
          startTicker();
        },
      }).to(cards, {
        x: (index: number) => targets[index].x,
        y: (index: number) => targets[index].y,
        z: (index: number) => targets[index].z,
        scale: (index: number) => targets[index].scale,
        opacity: (index: number) => targets[index].opacity,
        duration: 1.05,
        stagger: 0.07,
        ease: "power3.inOut",
      });
    };

    const syncVisibility = () => {
      if (isVisible && pageIsVisible) {
        if (assembled && !assemblyTimeline?.isActive()) startTicker();
        else assemble();
      }
      else {
        stopTicker();
        assemblyTimeline?.pause();
      }
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.08;
      if (isVisible) assemblyTimeline?.resume();
      syncVisibility();
    }, { threshold: [0, 0.08, 0.25] });
    const onPageVisibilityChange = () => {
      pageIsVisible = document.visibilityState === "visible";
      if (pageIsVisible) assemblyTimeline?.resume();
      syncVisibility();
    };
    const onMotionPreferenceChange = () => {
      assemblyTimeline?.kill();
      assemblyTimeline = null;
      stopTicker();
      assembled = reducedMotion.matches;
      orbitProgress = 0;
      renderOrbit(orbitProgress);
      if (!reducedMotion.matches) {
        assembled = false;
        assemble();
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - lastWidth) < 8) return;
      lastWidth = root.clientWidth;
      renderOrbit(orbitProgress);
    });

    root.dataset.ready = "true";
    root.setAttribute("aria-label", label);
    renderOrbit(0);
    visibilityObserver.observe(root);
    resizeObserver.observe(root);
    document.addEventListener("visibilitychange", onPageVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onPageVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      stopTicker();
      assemblyTimeline?.kill();
      gsap.killTweensOf(cards);
      cards.forEach((card) => { card.style.willChange = ""; });
    };
  }, { scope: rootRef, dependencies: [mode], revertOnUpdate: true });

  return (
    <div ref={rootRef} className={`${styles.stage} ${mode === "preview" ? styles.preview : styles.full}`} role="img">
      {images.map((image, index) => (
        <div key={image.src} ref={(element) => { cardRefs.current[index] = element; }} className={styles.image}>
          <Image src={image.src} alt="" fill sizes={mode === "preview" ? "(max-width: 900px) 28vw, 8rem" : "(max-width: 700px) 48vw, 19rem"} priority={mode === "full" || index === 0} />
        </div>
      ))}
    </div>
  );
}
