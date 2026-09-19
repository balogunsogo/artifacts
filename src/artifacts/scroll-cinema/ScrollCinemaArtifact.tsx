"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./ScrollCinemaArtifact.module.scss";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ScrollCinemaArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
};

type CinemaState = "closed" | "opening" | "open" | "closing";

export function ScrollCinemaArtifact({ mode = "full", className }: ScrollCinemaArtifactProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const ambientVideoRef = useRef<HTMLVideoElement>(null);
  const instructionRef = useRef<HTMLParagraphElement>(null);
  const cinemaTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cinemaVideoRef = useRef<HTMLVideoElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openCinemaRef = useRef<() => void>(() => undefined);
  const closeCinemaRef = useRef<() => void>(() => undefined);
  const toggleCinemaPlaybackRef = useRef<() => void>(() => undefined);
  const [cinemaPlaying, setCinemaPlaying] = useState(false);

  useGSAP(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const media = mediaRef.current;
    const ambientVideo = ambientVideoRef.current;
    if (!root || !stage || !media || !ambientVideo) return;

    const instruction = instructionRef.current;
    const triggerButton = cinemaTriggerRef.current;
    const dialog = dialogRef.current;
    const cinemaVideo = cinemaVideoRef.current;
    const closeButton = closeButtonRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchPointer = window.matchMedia("(hover: none), (pointer: coarse)");
    const nativeTouch = touchPointer.matches || navigator.maxTouchPoints > 0;
    let mounted = true;
    let visible = false;
    let cinemaState: CinemaState = "closed";
    let scrollTrigger: ScrollTrigger | null = null;
    let scrollTimeline: gsap.core.Timeline | null = null;
    let refreshTimer: number | null = null;
    let transitionTimer: number | null = null;
    let focusFrame: number | null = null;
    let restoreScroll: (() => void) | null = null;
    let stableViewportHeight = stage.getBoundingClientRect().height || window.innerHeight;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    ambientVideo.defaultMuted = true;
    ambientVideo.muted = true;

    const safePlay = (video: HTMLVideoElement) => {
      void video.play().catch(() => undefined);
    };

    const syncAmbientPlayback = () => {
      ambientVideo.muted = true;
      const shouldPlay = visible
        && !document.hidden
        && cinemaState === "closed"
        && !reducedMotion.matches;
      if (shouldPlay) safePlay(ambientVideo);
      else ambientVideo.pause();
    };

    const lockScroll = () => {
      const scrollY = window.scrollY;
      const previous = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      if (scrollbarWidth) document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.position = previous.position;
        document.body.style.top = previous.top;
        document.body.style.width = previous.width;
        document.body.style.overflow = previous.overflow;
        document.body.style.paddingRight = previous.paddingRight;
        window.scrollTo(0, scrollY);
      };
    };

    const setCinemaState = (state: CinemaState) => {
      cinemaState = state;
      if (dialog) dialog.dataset.state = state;
    };

    const finishClose = (restoreFocus: boolean, resumeAmbient = true) => {
      if (transitionTimer !== null) window.clearTimeout(transitionTimer);
      transitionTimer = null;
      cinemaVideo?.pause();
      if (cinemaVideo) {
        cinemaVideo.muted = true;
        try { cinemaVideo.currentTime = 0; } catch { /* Metadata may not be ready. */ }
      }
      if (dialog?.open) dialog.close();
      setCinemaState("closed");
      if (mounted) setCinemaPlaying(false);
      restoreScroll?.();
      restoreScroll = null;
      if (resumeAmbient) syncAmbientPlayback();
      if (restoreFocus) triggerButton?.focus();
    };

    const closeCinema = () => {
      if (!dialog || cinemaState !== "open") return;
      setCinemaState("closing");
      dialog.inert = true;
      cinemaVideo?.pause();
      transitionTimer = window.setTimeout(
        () => finishClose(true),
        reducedMotion.matches ? 0 : 220,
      );
    };

    const openCinema = () => {
      if (mode !== "full" || !dialog || !cinemaVideo || cinemaState !== "closed") return;
      setCinemaState("opening");
      ambientVideo.pause();
      const savedTime = Number.isFinite(ambientVideo.currentTime) ? ambientVideo.currentTime : 0;
      restoreScroll = lockScroll();
      dialog.showModal();
      dialog.inert = true;
      cinemaVideo.muted = false;
      cinemaVideo.volume = 1;
      try { cinemaVideo.currentTime = savedTime; } catch { /* Metadata may not be ready. */ }
      void cinemaVideo.play().catch(() => {
        if (mounted) setCinemaPlaying(false);
      });

      transitionTimer = window.setTimeout(() => {
        transitionTimer = null;
        if (!mounted || cinemaState !== "opening") return;
        setCinemaState("open");
        dialog.inert = false;
        focusFrame = window.requestAnimationFrame(() => {
          focusFrame = null;
          closeButton?.focus();
        });
      }, reducedMotion.matches ? 0 : 220);
    };

    const toggleCinemaPlayback = () => {
      if (!cinemaVideo || cinemaState !== "open") return;
      if (cinemaVideo.paused || cinemaVideo.ended) {
        cinemaVideo.muted = false;
        cinemaVideo.volume = 1;
        safePlay(cinemaVideo);
      } else {
        cinemaVideo.pause();
      }
    };

    openCinemaRef.current = openCinema;
    closeCinemaRef.current = closeCinema;
    toggleCinemaPlaybackRef.current = toggleCinemaPlayback;

    const onDialogCancel = (event: Event) => {
      event.preventDefault();
      closeCinema();
    };
    const onCinemaPlay = () => setCinemaPlaying(true);
    const onCinemaPause = () => setCinemaPlaying(false);
    const onCinemaEnded = () => setCinemaPlaying(false);

    dialog?.addEventListener("cancel", onDialogCancel);
    cinemaVideo?.addEventListener("play", onCinemaPlay);
    cinemaVideo?.addEventListener("pause", onCinemaPause);
    cinemaVideo?.addEventListener("ended", onCinemaEnded);

    const targetScale = () => {
      const bounds = media.getBoundingClientRect();
      const currentScale = Number(gsap.getProperty(media, "scale")) || 1;
      const baseWidth = bounds.width / currentScale;
      const baseHeight = bounds.height / currentScale;
      const availableWidth = stage.getBoundingClientRect().width || window.innerWidth;
      const availableHeight = nativeTouch ? stableViewportHeight : window.innerHeight;
      return Math.max(availableWidth / baseWidth, availableHeight / baseHeight) * 1.015;
    };

    const buildScrollScene = () => {
      scrollTrigger?.kill(true);
      scrollTimeline?.kill();
      scrollTrigger = null;
      scrollTimeline = null;
      gsap.set(media, { clearProps: "transform,borderRadius" });
      if (instruction) gsap.set(instruction, { clearProps: "opacity,transform" });
      root.dataset.reduced = String(reducedMotion.matches);
      if (mode !== "full" || reducedMotion.matches) return;

      const mobile = window.matchMedia("(max-width: 700px)").matches;
      scrollTimeline = gsap.timeline()
        .to({}, { duration: 0.1 })
        .to(media, { scale: targetScale, borderRadius: 0, duration: 0.65, ease: "none" });
      if (instruction) {
        scrollTimeline.to(instruction, { opacity: 0, y: -10, duration: 0.28, ease: "none" }, 0.08);
      }
      scrollTimeline.to({}, { duration: 0.25 });

      scrollTrigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: () => `+=${(nativeTouch ? stableViewportHeight : window.innerHeight) * (mobile ? 1.15 : 1.8)}`,
        pin: stage,
        pinSpacing: true,
        scrub: 0.6,
        animation: scrollTimeline,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });
    };

    const refreshScene = () => {
      stableViewportHeight = nativeTouch ? stage.getBoundingClientRect().height : window.innerHeight;
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
      buildScrollScene();
      scrollTrigger?.refresh();
    };

    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        if (mounted) refreshScene();
      }, 220);
    };

    const onResize = () => {
      const widthChanged = Math.abs(window.innerWidth - lastWidth) > 8;
      const desktopHeightChanged = !nativeTouch && Math.abs(window.innerHeight - lastHeight) > 90;
      if (widthChanged || desktopHeightChanged) scheduleRefresh();
    };
    const onOrientationChange = () => scheduleRefresh();
    const onReducedMotionChange = () => {
      refreshScene();
      syncAmbientPlayback();
    };
    const onVisibilityChange = () => syncAmbientPlayback();
    const onLoadedMetadata = () => scheduleRefresh();

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.04;
      syncAmbientPlayback();
    }, { threshold: [0, 0.04, 0.2] });

    visibilityObserver.observe(stage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onReducedMotionChange);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange);
    ambientVideo.addEventListener("loadedmetadata", onLoadedMetadata);
    buildScrollScene();
    void document.fonts?.ready.then(() => {
      if (mounted) scheduleRefresh();
    });

    return () => {
      mounted = false;
      openCinemaRef.current = () => undefined;
      closeCinemaRef.current = () => undefined;
      toggleCinemaPlaybackRef.current = () => undefined;
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onReducedMotionChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      ambientVideo.removeEventListener("loadedmetadata", onLoadedMetadata);
      dialog?.removeEventListener("cancel", onDialogCancel);
      cinemaVideo?.removeEventListener("play", onCinemaPlay);
      cinemaVideo?.removeEventListener("pause", onCinemaPause);
      cinemaVideo?.removeEventListener("ended", onCinemaEnded);
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      if (transitionTimer !== null) window.clearTimeout(transitionTimer);
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      scrollTrigger?.kill(true);
      scrollTimeline?.kill();
      gsap.killTweensOf([media, instruction].filter(Boolean));
      ambientVideo.pause();
      cinemaVideo?.pause();
      finishClose(false, false);
    };
  }, { scope: rootRef, dependencies: [mode], revertOnUpdate: true });

  const rootClassName = [styles.root, mode === "preview" ? styles.preview : styles.full, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClassName} data-reduced="false">
      <div ref={stageRef} className={styles.stage}>
        <div ref={mediaRef} className={styles.media}>
          <video
            ref={ambientVideoRef}
            className={styles.video}
            autoPlay
            muted
            loop
            playsInline
            preload={mode === "preview" ? "metadata" : "auto"}
            disablePictureInPicture
            aria-label={mode === "preview" ? "Scroll Cinema video preview" : "Muted ambient cinema study"}
          >
            <source src="/artifacts/scroll-cinema/video-mobile.mp4" media="(max-width: 700px)" type="video/mp4" />
            <source src="/artifacts/scroll-cinema/video-desktop.mp4" type="video/mp4" />
          </video>
          <span className={styles.shade} aria-hidden="true" />
          {mode === "full" && (
            <button
              ref={cinemaTriggerRef}
              className={styles.cinemaTrigger}
              type="button"
              aria-label="View in cinema"
              onClick={() => openCinemaRef.current()}
            >
              <span aria-hidden="true" />
            </button>
          )}
        </div>

        {mode === "full" && (
          <p ref={instructionRef} className={styles.instruction}>Scroll to expand</p>
        )}
      </div>

      {mode === "full" && (
        <dialog ref={dialogRef} className={styles.dialog} data-state="closed" aria-label="Scroll Cinema video player">
          <div className={styles.cinemaFrame}>
            <video
              ref={cinemaVideoRef}
              className={styles.cinemaVideo}
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
            >
              <source src="/artifacts/scroll-cinema/video-mobile.mp4" media="(max-width: 700px)" type="video/mp4" />
              <source src="/artifacts/scroll-cinema/video-desktop.mp4" type="video/mp4" />
            </video>
          </div>
          <div className={styles.cinemaControls}>
            <button
              className={styles.playButton}
              type="button"
              aria-label={cinemaPlaying ? "Pause video" : "Play video"}
              data-playing={cinemaPlaying}
              onClick={() => toggleCinemaPlaybackRef.current()}
            >
              <span aria-hidden="true" />
              {cinemaPlaying ? "Pause" : "Play"}
            </button>
            <button ref={closeButtonRef} className={styles.closeButton} type="button" onClick={() => closeCinemaRef.current()}>
              Close <span aria-hidden="true">×</span>
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
