"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type HorizontalArchiveProps = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  labelledBy: string;
};

const STORAGE_KEY =
  "artifacts-archive-position";

type SavedArchivePosition = {
  desktopX: number;
  mobileY: number;
  returning: boolean;
};

export function HorizontalArchive({
  children,
  className,
  trackClassName,
  labelledBy,
}: HorizontalArchiveProps) {
  const scrollerRef =
    useRef<HTMLElement>(null);

  useEffect(() => {
    const scroller =
      scrollerRef.current;

    if (!scroller) return;

    const desktop =
      window.matchMedia(
        "(min-width: 901px)"
      );

    let rafOne: number | null = null;
    let rafTwo: number | null = null;

    /*
     * Save the current archive position before
     * navigating into an artifact.
     */
    const savePosition = () => {
      const state: SavedArchivePosition = {
        desktopX: scroller.scrollLeft,
        mobileY: window.scrollY,
        returning: true,
      };

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    };

    /*
     * Capture clicks on artifact links inside
     * the archive.
     */
    const onClickCapture = (
      event: MouseEvent
    ) => {
      const target =
        event.target as HTMLElement | null;

      const link =
        target?.closest<HTMLAnchorElement>(
          'a[href^="/artifacts/"]'
        );

      if (!link) return;

      savePosition();
    };

    /*
     * Restore only when returning from an artifact.
     *
     * Double RAF waits until the archive has been
     * laid out before applying the scroll position.
     */
    const restorePosition = () => {
      const raw =
        sessionStorage.getItem(
          STORAGE_KEY
        );

      if (!raw) return;

      try {
        const saved =
          JSON.parse(
            raw
          ) as SavedArchivePosition;

        if (!saved.returning) return;

        rafOne =
          requestAnimationFrame(() => {
            rafTwo =
              requestAnimationFrame(() => {
                if (desktop.matches) {
                  scroller.scrollLeft =
                    saved.desktopX;
                } else {
                  window.scrollTo({
                    top: saved.mobileY,
                    left: 0,
                    behavior: "instant",
                  });
                }

                /*
                 * Position has now been consumed.
                 * A later intentional visit to "/"
                 * should start normally.
                 */
                sessionStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({
                    ...saved,
                    returning: false,
                  })
                );
              });
          });
      } catch {
        sessionStorage.removeItem(
          STORAGE_KEY
        );
      }
    };

    /*
     * Desktop wheel -> horizontal scrolling.
     */
    const onWheel = (
      event: WheelEvent
    ) => {
      if (
        !desktop.matches ||
        event.shiftKey ||
        Math.abs(event.deltaX) >=
        Math.abs(event.deltaY)
      ) {
        return;
      }

      const maximum =
        scroller.scrollWidth -
        scroller.clientWidth;

      if (maximum <= 0) return;

      const direction =
        Math.sign(event.deltaY);

      const canMove =
        direction > 0
          ? scroller.scrollLeft <
          maximum - 1
          : scroller.scrollLeft > 1;

      if (!canMove) return;

      event.preventDefault();

      scroller.scrollBy({
        left: event.deltaY,
        behavior: "auto",
      });
    };

    scroller.addEventListener(
      "click",
      onClickCapture,
      true
    );

    scroller.addEventListener(
      "wheel",
      onWheel,
      {
        passive: false,
      }
    );

    restorePosition();

    return () => {
      scroller.removeEventListener(
        "click",
        onClickCapture,
        true
      );

      scroller.removeEventListener(
        "wheel",
        onWheel
      );

      if (rafOne !== null) {
        cancelAnimationFrame(rafOne);
      }

      if (rafTwo !== null) {
        cancelAnimationFrame(rafTwo);
      }
    };
  }, []);

  return (
    <section
      ref={scrollerRef}
      className={className}
      aria-labelledby={labelledBy}
      tabIndex={0}
    >
      <div className={trackClassName}>
        {children}
      </div>
    </section>
  );
}