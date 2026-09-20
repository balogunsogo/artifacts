"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./BlockOrbitArtifact.module.scss";

gsap.registerPlugin(useGSAP);

export type BlockOrbitArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
  interactive?: boolean;
};

const faces = ["front", "right", "back", "left", "top", "bottom"] as const;
const images = [
  "face-green.svg",
  "face-rust.svg",
  "face-blue.svg",
  "face-cream.svg",
  "face-lilac.svg",
  "face-charcoal.svg",
] as const;

export function BlockOrbitArtifact({
  mode = "full",
  className,
  interactive = true,
}: BlockOrbitArtifactProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    const cube = cubeRef.current;
    if (!stage || !tilt || !cube) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const maxTiltX = mode === "preview" ? 4.5 : 8;
    const maxTiltY = mode === "preview" ? 7 : 12;
    let isVisible = false;
    let pointerListening = false;

    const moveX = gsap.quickTo(tilt, "rotationX", { duration: 1.1, ease: "power3.out" });
    const moveY = gsap.quickTo(tilt, "rotationY", { duration: 1.1, ease: "power3.out" });

    const resetTilt = (immediate = false) => {
      if (immediate) {
        gsap.killTweensOf(tilt);
        gsap.set(tilt, { rotationX: 0, rotationY: 0 });
        return;
      }
      moveX(0);
      moveY(0);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isVisible || document.hidden || reducedMotion.matches) return;
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      moveX(gsap.utils.clamp(-maxTiltX, maxTiltX, y * -maxTiltX));
      moveY(gsap.utils.clamp(-maxTiltY, maxTiltY, x * maxTiltY));
    };

    const onPointerLeave = () => resetTilt();

    const syncPointerListeners = () => {
      const shouldListen = interactive && finePointer.matches && !reducedMotion.matches;
      if (shouldListen === pointerListening) return;
      pointerListening = shouldListen;
      if (shouldListen) {
        stage.addEventListener("pointermove", onPointerMove, { passive: true });
        stage.addEventListener("pointerleave", onPointerLeave);
      } else {
        stage.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerleave", onPointerLeave);
        resetTilt(true);
      }
    };

    const syncMotion = () => {
      const shouldSpin = isVisible && !document.hidden && !reducedMotion.matches;
      cube.dataset.paused = String(!shouldSpin);
      if (!shouldSpin) resetTilt();
      syncPointerListeners();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.08;
        syncMotion();
      },
      { threshold: [0, 0.08, 0.25] },
    );

    const onVisibilityChange = () => syncMotion();
    const onMotionPreferenceChange = () => syncMotion();
    const onPointerCapabilityChange = () => syncPointerListeners();

    cube.dataset.paused = "true";
    observer.observe(stage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    finePointer.addEventListener("change", onPointerCapabilityChange);
    syncPointerListeners();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      finePointer.removeEventListener("change", onPointerCapabilityChange);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      gsap.killTweensOf(tilt);
    };
  }, { scope: stageRef, dependencies: [interactive, mode], revertOnUpdate: true });

  const stageClassName = [
    styles.stage,
    mode === "preview" ? styles.preview : styles.full,
    className,
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={stageRef}
      className={stageClassName}
      role="img"
      aria-label="Rotating three-dimensional b logo cube"
    >
      <div ref={tiltRef} className={styles.tilt}>
        <div ref={cubeRef} className={styles.cube} data-paused="true" aria-hidden="true">
          {faces.map((face, index) => (
            <span key={face} className={`${styles.face} ${styles[face]}`}>
              <Image
                src={`/artifacts/block-orbit/${images[index % images.length]}`}
                alt=""
                fill
                draggable={false}
                sizes={mode === "preview" ? "(max-width: 560px) 42vw, 12rem" : "(max-width: 700px) 52vw, 25rem"}
                loading={mode === "preview" ? "lazy" : "eager"}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
