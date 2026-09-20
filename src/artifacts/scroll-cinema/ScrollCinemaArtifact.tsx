"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { loadYouTubeApi, scrollCinemaVideoId, type YouTubePlayer, youtubePlayerVars } from "./youtube-player";
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
  const scaleRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const ambientPlayerHostRef = useRef<HTMLDivElement>(null);
  const instructionRef = useRef<HTMLParagraphElement>(null);
  const cinemaTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cinemaPlayerHostRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openCinemaRef = useRef<() => void>(() => undefined);
  const closeCinemaRef = useRef<() => void>(() => undefined);
  const toggleCinemaPlaybackRef = useRef<() => void>(() => undefined);
  const [cinemaPlaying, setCinemaPlaying] = useState(false);

  useGSAP(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const scaleWrapper = scaleRef.current;
    const media = mediaRef.current;
    const ambientPlayerHost = ambientPlayerHostRef.current;
    if (!root || !stage || !scaleWrapper || !media || !ambientPlayerHost) return;

    const instruction = instructionRef.current;
    const triggerButton = cinemaTriggerRef.current;
    const dialog = dialogRef.current;
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
    let ambientPlayer: YouTubePlayer | null = null;
    let cinemaPlayer: YouTubePlayer | null = null;
    let pendingOpen = false;
    let stableViewportHeight = stage.getBoundingClientRect().height || window.innerHeight;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const syncAmbientPlayback = () => {
      if (!ambientPlayer) return;
      const shouldPlay = visible
        && !document.hidden
        && cinemaState === "closed"
        && !reducedMotion.matches;
      ambientPlayer.mute();
      if (shouldPlay) ambientPlayer.playVideo();
      else ambientPlayer.pauseVideo();
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
      cinemaPlayer?.pauseVideo();
      if (cinemaPlayer) {
        cinemaPlayer.mute();
        cinemaPlayer.seekTo(0, true);
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
      cinemaPlayer?.pauseVideo();
      transitionTimer = window.setTimeout(
        () => finishClose(true),
        reducedMotion.matches ? 0 : 220,
      );
    };

    const openCinema = () => {
      if (mode !== "full" || !dialog || cinemaState !== "closed") return;
      if (!cinemaPlayer) {
        pendingOpen = true;
        return;
      }
      setCinemaState("opening");
      ambientPlayer?.pauseVideo();
      const savedTime = ambientPlayer ? ambientPlayer.getCurrentTime() : 0;
      restoreScroll = lockScroll();
      dialog.showModal();
      dialog.inert = true;
      cinemaPlayer.unMute();
      cinemaPlayer.setVolume(100);
      cinemaPlayer.seekTo(savedTime, true);
      cinemaPlayer.playVideo();

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
      if (!cinemaPlayer || cinemaState !== "open") return;
      if (cinemaPlayer.getPlayerState() !== 1) {
        cinemaPlayer.unMute();
        cinemaPlayer.setVolume(100);
        cinemaPlayer.playVideo();
      } else {
        cinemaPlayer.pauseVideo();
      }
    };

    openCinemaRef.current = openCinema;
    closeCinemaRef.current = closeCinema;
    toggleCinemaPlaybackRef.current = toggleCinemaPlayback;

    const onDialogCancel = (event: Event) => {
      event.preventDefault();
      closeCinema();
    };
    dialog?.addEventListener("cancel", onDialogCancel);

    const targetScale = () => {
      const bounds = scaleWrapper.getBoundingClientRect();
      const currentScale = Number(gsap.getProperty(scaleWrapper, "scale")) || 1;
      const baseWidth = bounds.width / currentScale;
      const baseHeight = bounds.height / currentScale;
      const stageBounds = stage.getBoundingClientRect();
      const availableWidth = stageBounds.width || window.innerWidth;
      const availableHeight = nativeTouch ? stableViewportHeight : stageBounds.height || window.innerHeight;
      const widthScale = availableWidth / baseWidth;
      const heightScale = availableHeight / baseHeight;

      return Math.max(widthScale, heightScale) * 1.015;
    };

    const buildScrollScene = () => {
      scrollTrigger?.kill(true);
      scrollTimeline?.kill();
      scrollTrigger = null;
      scrollTimeline = null;
      gsap.set(scaleWrapper, { clearProps: "transform" });
      gsap.set(media, { clearProps: "borderRadius" });
      if (instruction) gsap.set(instruction, { clearProps: "opacity,transform" });
      root.dataset.reduced = String(reducedMotion.matches);
      if (mode !== "full" || reducedMotion.matches) return;

      const mobile = window.matchMedia("(max-width: 700px)").matches;
      scrollTimeline = gsap.timeline()
        .to({}, { duration: 0.1 })
        .to(scaleWrapper, { scale: targetScale, duration: 0.65, ease: "none" })
        .to(media, { borderRadius: 0, duration: 0.65, ease: "none" }, "<");
      if (instruction) {
        scrollTimeline.to(instruction, { opacity: 0, y: mobile ? -6 : -10, duration: 0.28, ease: "none" }, 0.08);
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
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.04;
      syncAmbientPlayback();
    }, { threshold: [0, 0.04, 0.2] });

    visibilityObserver.observe(stage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onReducedMotionChange);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange);
    buildScrollScene();
    void loadYouTubeApi().then((YouTube) => {
      if (!mounted || !ambientPlayerHost) return;
      const createPlayer = (host: HTMLElement, muted: boolean, onStateChange?: (state: number) => void) => new YouTube.Player(host, {
        height: "100%",
        width: "100%",
        videoId: scrollCinemaVideoId,
        playerVars: youtubePlayerVars(muted),
        events: {
          onReady: ({ target }) => {
            if (muted) {
              target.mute();
              syncAmbientPlayback();
            }
          },
          onStateChange: (event) => onStateChange?.(event.data),
        },
      });
      ambientPlayer = createPlayer(ambientPlayerHost, true);
      if (cinemaPlayerHostRef.current) {
        cinemaPlayer = createPlayer(cinemaPlayerHostRef.current, false, (state) => {
          if (mounted) setCinemaPlaying(state === 1);
        });
      }
      syncAmbientPlayback();
      if (pendingOpen) {
        pendingOpen = false;
        openCinema();
      }
    }).catch(() => undefined);
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
      dialog?.removeEventListener("cancel", onDialogCancel);
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      if (transitionTimer !== null) window.clearTimeout(transitionTimer);
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      scrollTrigger?.kill(true);
      scrollTimeline?.kill();
      gsap.killTweensOf([scaleWrapper, media, instruction].filter(Boolean));
      ambientPlayer?.pauseVideo();
      cinemaPlayer?.pauseVideo();
      finishClose(false, false);
      ambientPlayer?.destroy();
      cinemaPlayer?.destroy();
    };
  }, { scope: rootRef, dependencies: [mode], revertOnUpdate: true });

  const rootClassName = [styles.root, mode === "preview" ? styles.preview : styles.full, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClassName} data-reduced="false">
      <div ref={stageRef} className={styles.stage}>
        <div ref={scaleRef} className={styles.scaleWrapper}>
          <div ref={mediaRef} className={styles.media}>
            <div ref={ambientPlayerHostRef} className={styles.video} aria-label={mode === "preview" ? "Scroll Cinema video preview" : "Muted ambient cinema study"} />
            <span className={styles.shade} aria-hidden="true" />
          </div>
        </div>

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

        {mode === "full" && (
          <p ref={instructionRef} className={styles.instruction}>Scroll to expand</p>
        )}
      </div>

      {mode === "full" && (
        <dialog ref={dialogRef} className={styles.dialog} data-state="closed" aria-label="Scroll Cinema video player">
          <div className={styles.cinemaFrame}>
            <div ref={cinemaPlayerHostRef} className={styles.cinemaVideo} />
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
