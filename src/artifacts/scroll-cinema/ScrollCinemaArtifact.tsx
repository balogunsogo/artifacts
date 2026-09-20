"use client";

import {
  useRef,
  useState,
} from "react";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import styles from "./ScrollCinemaArtifact.module.scss";

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger
);

export type ScrollCinemaArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
};

type CinemaState =
  | "closed"
  | "opening"
  | "open"
  | "closing";

const VIDEO_SRC =
  "/artifacts/scroll-cinema/sound-producer-trimmed.mp4";

export function ScrollCinemaArtifact({
  mode = "full",
  className,
}: ScrollCinemaArtifactProps) {
  const rootRef =
    useRef<HTMLDivElement>(null);

  const stageRef =
    useRef<HTMLDivElement>(null);

  const scaleRef =
    useRef<HTMLDivElement>(null);

  const mediaRef =
    useRef<HTMLDivElement>(null);

  const ambientVideoRef =
    useRef<HTMLVideoElement>(null);

  const instructionRef =
    useRef<HTMLParagraphElement>(null);

  const cinemaTriggerRef =
    useRef<HTMLButtonElement>(null);

  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const cinemaVideoRef =
    useRef<HTMLVideoElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const openCinemaRef =
    useRef<() => void>(
      () => undefined
    );

  const closeCinemaRef =
    useRef<() => void>(
      () => undefined
    );

  const toggleCinemaPlaybackRef =
    useRef<() => void>(
      () => undefined
    );

  const [
    cinemaPlaying,
    setCinemaPlaying,
  ] = useState(false);

  useGSAP(
    () => {
      const root =
        rootRef.current;

      const stage =
        stageRef.current;

      const scaleWrapper =
        scaleRef.current;

      const media =
        mediaRef.current;

      const ambientVideo =
        ambientVideoRef.current;

      const cinemaVideo =
        cinemaVideoRef.current;
        

      if (
        !root ||
        !stage ||
        !scaleWrapper ||
        !media ||
        !ambientVideo
      ) {
        return;
      }

      const instruction =
        instructionRef.current;

      const triggerButton =
        cinemaTriggerRef.current;

      const dialog =
        dialogRef.current;

      const closeButton =
        closeButtonRef.current;

      const reducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        );

      const touchPointer =
        window.matchMedia(
          "(hover: none), (pointer: coarse)"
        );

      const nativeTouch =
        touchPointer.matches ||
        navigator.maxTouchPoints > 0;

      let mounted = true;

      let visible = false;

      let cinemaState: CinemaState =
        "closed";

      let scrollTrigger:
        | ScrollTrigger
        | null = null;

      let scrollTimeline:
        | gsap.core.Timeline
        | null = null;

      let refreshTimer:
        | number
        | null = null;

      let transitionTimer:
        | number
        | null = null;

      let focusFrame:
        | number
        | null = null;

      let restoreScroll:
        | (() => void)
        | null = null;

      let stableViewportHeight =
        stage.getBoundingClientRect()
          .height ||
        window.innerHeight;

      let lastWidth =
        window.innerWidth;

      let lastHeight =
        window.innerHeight;

      const syncAmbientPlayback =
        () => {
          const shouldPlay =
            visible &&
            !document.hidden &&
            cinemaState ===
            "closed" &&
            !reducedMotion.matches;

          ambientVideo.muted = true;

          if (shouldPlay) {
            ambientVideo
              .play()
              .catch(
                () => undefined
              );
          } else {
            ambientVideo.pause();
          }
        };

      const lockScroll = () => {
        const previousBodyOverflow =
          document.body.style
            .overflow;

        const previousHtmlOverflow =
          document.documentElement
            .style.overflow;

        document.body.style.overflow =
          "hidden";

        document.documentElement.style.overflow =
          "hidden";

        return () => {
          document.body.style.overflow =
            previousBodyOverflow;

          document.documentElement.style.overflow =
            previousHtmlOverflow;
        };
      };

      const setCinemaState = (
        state: CinemaState
      ) => {
        cinemaState = state;

        if (dialog) {
          dialog.dataset.state =
            state;
        }
      };

      const finishClose = (
        restoreFocus: boolean,
        resumeAmbient = true
      ) => {
        if (
          transitionTimer !== null
        ) {
          window.clearTimeout(
            transitionTimer
          );
        }

        transitionTimer = null;

        if (cinemaVideo) {
          cinemaVideo.pause();
          cinemaVideo.currentTime = 0;
        }

        if (dialog?.open) {
          dialog.close();
        }

        setCinemaState("closed");

        if (mounted) {
          setCinemaPlaying(false);
        }

        restoreScroll?.();
        restoreScroll = null;

        if (resumeAmbient) {
          syncAmbientPlayback();
        }

        if (restoreFocus) {
          triggerButton?.focus();
        }
      };

      const closeCinema = () => {
        if (
          !dialog ||
          cinemaState !== "open"
        ) {
          return;
        }

        setCinemaState("closing");

        dialog.inert = true;

        cinemaVideo?.pause();

        transitionTimer =
          window.setTimeout(
            () =>
              finishClose(true),
            reducedMotion.matches
              ? 0
              : 220
          );
      };

      const openCinema = () => {
        if (
          mode !== "full" ||
          !dialog ||
          !cinemaVideo ||
          cinemaState !==
          "closed"
        ) {
          return;
        }

        setCinemaState("opening");

        ambientVideo.pause();

        const savedTime =
          ambientVideo.currentTime || 0;

        restoreScroll =
          lockScroll();

        dialog.showModal();

        dialog.inert = true;

        cinemaVideo.muted = false;
        cinemaVideo.volume = 1;

        if (
          Number.isFinite(
            savedTime
          )
        ) {
          cinemaVideo.currentTime =
            Math.min(
              savedTime,
              Number.isFinite(
                cinemaVideo.duration
              )
                ? cinemaVideo.duration
                : savedTime
            );
        }

        cinemaVideo
          .play()
          .catch(
            () => undefined
          );

        transitionTimer =
          window.setTimeout(
            () => {
              transitionTimer =
                null;

              if (
                !mounted ||
                cinemaState !==
                "opening"
              ) {
                return;
              }

              setCinemaState(
                "open"
              );

              dialog.inert =
                false;

              focusFrame =
                window.requestAnimationFrame(
                  () => {
                    focusFrame =
                      null;

                    closeButton?.focus();
                  }
                );
            },
            reducedMotion.matches
              ? 0
              : 220
          );
      };

      const toggleCinemaPlayback =
        () => {
          if (
            !cinemaVideo ||
            cinemaState !==
            "open"
          ) {
            return;
          }

          if (
            cinemaVideo.paused
          ) {
            cinemaVideo.muted =
              false;

            cinemaVideo
              .play()
              .catch(
                () => undefined
              );
          } else {
            cinemaVideo.pause();
          }
        };

      openCinemaRef.current =
        openCinema;

      closeCinemaRef.current =
        closeCinema;

      toggleCinemaPlaybackRef.current =
        toggleCinemaPlayback;

      const onDialogCancel = (
        event: Event
      ) => {
        event.preventDefault();
        closeCinema();
      };

      dialog?.addEventListener(
        "cancel",
        onDialogCancel
      );

      const onCinemaPlay = () => {
        if (mounted) {
          setCinemaPlaying(true);
        }
      };

      const onCinemaPause = () => {
        if (mounted) {
          setCinemaPlaying(false);
        }
      };

      cinemaVideo?.addEventListener(
        "play",
        onCinemaPlay
      );

      cinemaVideo?.addEventListener(
        "pause",
        onCinemaPause
      );

      cinemaVideo?.addEventListener(
        "ended",
        onCinemaPause
      );

      const targetScale = () => {
        const bounds =
          scaleWrapper.getBoundingClientRect();

        const currentScale =
          Number(
            gsap.getProperty(
              scaleWrapper,
              "scale"
            )
          ) || 1;

        const baseWidth =
          bounds.width /
          currentScale;

        const baseHeight =
          bounds.height /
          currentScale;

        const stageBounds =
          stage.getBoundingClientRect();

        const availableWidth =
          stageBounds.width ||
          window.innerWidth;

        const availableHeight =
          nativeTouch
            ? stableViewportHeight
            : stageBounds.height ||
            window.innerHeight;

        const widthScale =
          availableWidth /
          baseWidth;

        const heightScale =
          availableHeight /
          baseHeight;

        return (
          Math.max(
            widthScale,
            heightScale
          ) * 1.015
        );
      };

      const buildScrollScene =
        () => {
          scrollTrigger?.kill(true);
          scrollTimeline?.kill();

          scrollTrigger = null;
          scrollTimeline = null;

          gsap.set(
            scaleWrapper,
            {
              clearProps:
                "transform",
            }
          );

          gsap.set(media, {
            clearProps:
              "borderRadius",
          });

          if (instruction) {
            gsap.set(instruction, {
              clearProps:
                "opacity,transform",
            });
          }

          root.dataset.reduced =
            String(
              reducedMotion.matches
            );

          if (
            mode !== "full" ||
            reducedMotion.matches
          ) {
            return;
          }

          const mobile =
            window.matchMedia(
              "(max-width: 700px)"
            ).matches;

          scrollTimeline =
            gsap
              .timeline()
              .to(
                {},
                {
                  duration: 0.1,
                }
              )
              .to(
                scaleWrapper,
                {
                  scale:
                    targetScale,
                  duration: 0.65,
                  ease: "none",
                }
              )
              .to(
                media,
                {
                  borderRadius: 0,
                  duration: 0.65,
                  ease: "none",
                },
                "<"
              );

          if (instruction) {
            scrollTimeline.to(
              instruction,
              {
                opacity: 0,
                y: mobile
                  ? -6
                  : -10,
                duration: 0.28,
                ease: "none",
              },
              0.08
            );
          }

          scrollTimeline.to(
            {},
            {
              duration: 0.25,
            }
          );

          scrollTrigger =
            ScrollTrigger.create({
              trigger: root,
              start: "top top",

              end: () =>
                `+=${(nativeTouch
                  ? stableViewportHeight
                  : window.innerHeight) *
                (mobile
                  ? 1.15
                  : 1.8)
                }`,

              pin: stage,
              pinSpacing: true,
              scrub: 0.6,

              animation:
                scrollTimeline,

              anticipatePin: 1,

              invalidateOnRefresh:
                true,
            });
        };

      const refreshScene = () => {
        stableViewportHeight =
          nativeTouch
            ? stage.getBoundingClientRect()
              .height
            : window.innerHeight;

        lastWidth =
          window.innerWidth;

        lastHeight =
          window.innerHeight;

        buildScrollScene();

        scrollTrigger?.refresh();
      };

      const scheduleRefresh =
        () => {
          if (
            refreshTimer !== null
          ) {
            window.clearTimeout(
              refreshTimer
            );
          }

          refreshTimer =
            window.setTimeout(
              () => {
                refreshTimer =
                  null;

                if (mounted) {
                  refreshScene();
                }
              },
              220
            );
        };

      const onResize = () => {
        const widthChanged =
          Math.abs(
            window.innerWidth -
            lastWidth
          ) > 8;

        const desktopHeightChanged =
          !nativeTouch &&
          Math.abs(
            window.innerHeight -
            lastHeight
          ) > 90;

        if (
          widthChanged ||
          desktopHeightChanged
        ) {
          scheduleRefresh();
        }
      };

      const onOrientationChange =
        () =>
          scheduleRefresh();

      const onReducedMotionChange =
        () => {
          refreshScene();
          syncAmbientPlayback();
        };

      const onVisibilityChange =
        () => {
          syncAmbientPlayback();
        };

      const visibilityObserver =
        new IntersectionObserver(
          ([entry]) => {
            visible =
              entry.isIntersecting &&
              entry.intersectionRatio >=
              0.04;

            syncAmbientPlayback();
          },
          {
            threshold: [
              0,
              0.04,
              0.2,
            ],
          }
        );

      visibilityObserver.observe(
        stage
      );

      document.addEventListener(
        "visibilitychange",
        onVisibilityChange
      );

      reducedMotion.addEventListener(
        "change",
        onReducedMotionChange
      );

      window.addEventListener(
        "resize",
        onResize,
        {
          passive: true,
        }
      );

      window.addEventListener(
        "orientationchange",
        onOrientationChange
      );

      buildScrollScene();

      void document.fonts?.ready.then(
        () => {
          if (mounted) {
            scheduleRefresh();
          }
        }
      );

      return () => {
        mounted = false;

        openCinemaRef.current =
          () => undefined;

        closeCinemaRef.current =
          () => undefined;

        toggleCinemaPlaybackRef.current =
          () => undefined;

        visibilityObserver.disconnect();

        document.removeEventListener(
          "visibilitychange",
          onVisibilityChange
        );

        reducedMotion.removeEventListener(
          "change",
          onReducedMotionChange
        );

        window.removeEventListener(
          "resize",
          onResize
        );

        window.removeEventListener(
          "orientationchange",
          onOrientationChange
        );

        dialog?.removeEventListener(
          "cancel",
          onDialogCancel
        );

        cinemaVideo?.removeEventListener(
          "play",
          onCinemaPlay
        );

        cinemaVideo?.removeEventListener(
          "pause",
          onCinemaPause
        );

        cinemaVideo?.removeEventListener(
          "ended",
          onCinemaPause
        );

        if (
          refreshTimer !== null
        ) {
          window.clearTimeout(
            refreshTimer
          );
        }

        if (
          transitionTimer !== null
        ) {
          window.clearTimeout(
            transitionTimer
          );
        }

        if (
          focusFrame !== null
        ) {
          window.cancelAnimationFrame(
            focusFrame
          );
        }

        scrollTrigger?.kill(true);
        scrollTimeline?.kill();

        gsap.killTweensOf(
          [
            scaleWrapper,
            media,
            instruction,
          ].filter(Boolean)
        );

        ambientVideo.pause();
        cinemaVideo?.pause();

        restoreScroll?.();
        restoreScroll = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [mode],
      revertOnUpdate: true,
    }
  );

  const rootClassName = [
    styles.root,
    mode === "preview"
      ? styles.preview
      : styles.full,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      className={
        rootClassName
      }
      data-reduced="false"
    >
      <div
        ref={stageRef}
        className={
          styles.stage
        }
      >
        <div
          ref={scaleRef}
          className={
            styles.scaleWrapper
          }
        >
          <div
            ref={mediaRef}
            className={
              styles.media
            }
          >
            <video
              ref={
                ambientVideoRef
              }
              className={
                styles.video
              }
              src={VIDEO_SRC}
              muted
              loop
              playsInline
              preload="metadata"
              controls={false}
              aria-label={
                mode ===
                  "preview"
                  ? "Scroll Cinema video preview"
                  : "Muted ambient cinema study"
              }
            />

            <span
              className={
                styles.shade
              }
              aria-hidden="true"
            />
          </div>
        </div>

        {mode === "full" && (
          <button
            ref={
              cinemaTriggerRef
            }
            className={
              styles.cinemaTrigger
            }
            type="button"
            aria-label="View in cinema"
            onClick={() =>
              openCinemaRef.current()
            }
          >
            <span
              aria-hidden="true"
            />
          </button>
        )}

        {mode === "full" && (
          <p
            ref={
              instructionRef
            }
            className={
              styles.instruction
            }
          >
            Scroll to expand
          </p>
        )}
      </div>

      {mode === "full" && (
        <dialog
          ref={dialogRef}
          className={
            styles.dialog
          }
          data-state="closed"
          aria-label="Scroll Cinema video player"
        >
          <div
            className={
              styles.cinemaFrame
            }
          >
            <video
              ref={
                cinemaVideoRef
              }
              className={
                styles.cinemaVideo
              }
              src={VIDEO_SRC}
              playsInline
              preload="metadata"
              controls={false}
            />
          </div>

          <div
            className={
              styles.cinemaControls
            }
          >
            <button
              className={
                styles.playButton
              }
              type="button"
              aria-label={
                cinemaPlaying
                  ? "Pause video"
                  : "Play video"
              }
              data-playing={
                cinemaPlaying
              }
              onClick={() =>
                toggleCinemaPlaybackRef.current()
              }
            >
              <span
                aria-hidden="true"
              />

              {cinemaPlaying
                ? "Pause"
                : "Play"}
            </button>

            <button
              ref={
                closeButtonRef
              }
              className={
                styles.closeButton
              }
              type="button"
              onClick={() =>
                closeCinemaRef.current()
              }
            >
              Close{" "}
              <span
                aria-hidden="true"
              >
                ×
              </span>
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}