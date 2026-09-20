"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { Artifact } from "@/artifacts/artifact.types";
import { event } from "@/lib/analytics";
import styles from "./InformationPanel.module.scss";

export function InformationPanel({
  artifact,
}: {
  artifact: Artifact;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const panelId = useId();

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const usesAlbumArtwork = [
    "ambient-artwork",
    "palette-shift",
    "track-transition",
  ].includes(artifact.slug);

  /*
   * Only needed so createPortal runs client-side.
   * After this, the portal stays mounted permanently.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Modal behaviour + lightweight scroll locking.
   */
  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;

    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    const previousBodyOverflow =
      document.body.style.overflow;

    /*
     * Do NOT use:
     * position: fixed
     * top
     * width
     * window.scrollTo()
     *
     * Those caused document-wide re-layout/compositing.
     */
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const focusFrame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true });
    });

    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        setOpen(false);
        return;
      }

      if (
        keyboardEvent.key !== "Tab" ||
        !panelRef.current
      ) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );

      const first = focusable[0];
      const last = focusable.at(-1);

      if (
        keyboardEvent.shiftKey &&
        document.activeElement === first
      ) {
        keyboardEvent.preventDefault();
        last?.focus();
      }

      if (
        !keyboardEvent.shiftKey &&
        document.activeElement === last
      ) {
        keyboardEvent.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);

      document.documentElement.style.overflow =
        previousHtmlOverflow;

      document.body.style.overflow =
        previousBodyOverflow;

      window.removeEventListener(
        "keydown",
        onKeyDown
      );

      requestAnimationFrame(() => {
        trigger?.focus({ preventScroll: true });
      });
    };
  }, [open]);

  const closePanel = () => {
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          event("information_open", {
            artifact_id: artifact.id,
            artifact_slug: artifact.slug,
          });

          setOpen(true);
        }}
      >
        Information
        <span aria-hidden="true">+</span>
      </button>

      {mounted &&
        createPortal(
          <div
            className={styles.overlay}
            data-open={open}
            aria-hidden={!open}
            style={
              {
                "--color-accent": artifact.theme.accent,
              } as CSSProperties
            }
            onMouseDown={(mouseEvent) => {
              if (
                open &&
                mouseEvent.target ===
                mouseEvent.currentTarget
              ) {
                closePanel();
              }
            }}
          >
            <div
              ref={panelRef}
              id={panelId}
              className={styles.panel}
              data-open={open}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${panelId}-title`}
              inert={!open}
            >
              <div className={styles.panelHeader}>
                <span>Artifact information</span>

                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close information panel"
                >
                  Close ×
                </button>
              </div>

              <div className={styles.panelBody}>
                <p className={styles.number}>
                  {artifact.id}
                </p>

                <div className={styles.details}>
                  <h2 id={`${panelId}-title`}>
                    {artifact.title}
                  </h2>

                  <p className={styles.description}>
                    {artifact.description}
                  </p>

                  <dl>
                    <div>
                      <dt>Category</dt>
                      <dd>{artifact.category}</dd>
                    </div>

                    <div>
                      <dt>Origin project</dt>
                      <dd>{artifact.origin}</dd>
                    </div>

                    <div>
                      <dt>Year</dt>
                      <dd>{artifact.year}</dd>
                    </div>
                  </dl>

                  {usesAlbumArtwork && (
                    <p className={styles.attribution}>
                      Album artwork belongs to the
                      respective artists and rights holders
                      and is presented here as contextual
                      interface content.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}