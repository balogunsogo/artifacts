"use client";

import Image from "next/image";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { spatialServices } from "@/artifacts/spatial-services/spatial-services.data";
import styles from "./SplitMenuPreview.module.scss";

const panels = spatialServices.slice(0, 4);

type Frame = { open: boolean; active: number | null };

// Each step holds for `hold` ms before advancing; the last step loops back to the first.
const sequence: Array<Frame & { hold: number }> = [
  { open: false, active: null, hold: 900 },
  { open: true, active: null, hold: 1300 },
  { open: true, active: 0, hold: 1000 },
  { open: true, active: 1, hold: 1000 },
  { open: true, active: 2, hold: 1000 },
  { open: true, active: 3, hold: 1000 },
  { open: true, active: null, hold: 650 },
  { open: false, active: null, hold: 700 },
];

const reducedFrame: Frame = { open: true, active: 1 };

// Box geometry in units of one resting box width. The row holds 4 boxes plus 3 gaps of
// GAP, so each box is 100% / ROW_UNITS of the row. The hovered box grows to 1.5 and the
// others shrink to 2.5 / 3, keeping the row width. Applied as translate + scale so the
// motion stays on the compositor (no layout per frame).
const GAP = 0.1;
const ROW_UNITS = panels.length + GAP * (panels.length - 1);

function rowGeometry(active: number | null) {
  let offset = 0;
  return panels.map((_, index) => {
    const scale = active === null ? 1 : index === active ? 1.5 : 2.5 / 3;
    const geometry = { offset, scale };
    offset += scale + GAP;
    return geometry;
  });
}

export function SplitMenuPreview() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(() => setStep((current) => (current + 1) % sequence.length), sequence[step].hold);
    return () => window.clearTimeout(timer);
  }, [step, reduced]);

  const { open, active } = reduced ? reducedFrame : sequence[step];
  const geometry = rowGeometry(active);

  return (
    <div className={styles.preview} data-open={open} aria-hidden="true">
      <div className={styles.closedStage}>
        <span className={styles.mark} />
        <span className={styles.frame} />
        <span className={styles.trigger}>
          <span className={styles.lines}><i /><i /></span>
          Menu
        </span>
      </div>

      <span className={styles.panel} />

      <div className={styles.dialog}>
        <div className={styles.header}>
          <span>Split Menu</span>
          <span className={styles.close}>Close ×</span>
        </div>

        <div className={styles.cards} style={{ "--row-units": ROW_UNITS } as CSSProperties}>
          {panels.map((panel, index) => {
            const { offset, scale } = geometry[index];
            return (
              <Fragment key={panel.label}>
                <span
                  className={styles.slot}
                  data-active={active === index}
                  data-muted={active !== null && active !== index}
                  style={{ "--i": index, transform: `translateX(${offset * 100}%) scale(${scale})` } as CSSProperties}
                >
                  <span className={styles.rise}>
                    <span className={styles.image}>
                      <Image src={panel.image} alt="" fill sizes="8rem" loading="lazy" style={{ objectPosition: panel.objectPosition }} />
                    </span>
                  </span>
                </span>
                {/* Unscaled layer that tracks the top-centre of its box, so label text keeps its size. */}
                <span
                  className={styles.labelAnchor}
                  data-active={active === index}
                  style={{ transform: `translate(${(offset + scale / 2) * 100}%, calc(${-scale} * 100cqw / var(--row-units)))` }}
                >
                  <span className={styles.label}>{panel.label}</span>
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
