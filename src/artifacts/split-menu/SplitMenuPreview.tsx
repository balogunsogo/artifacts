"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
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

        <div className={styles.cards}>
          {panels.map((panel, index) => (
            <span
              key={panel.label}
              className={styles.slot}
              data-active={active === index}
              data-muted={active !== null && active !== index}
              style={{ "--i": index } as CSSProperties}
            >
              <span className={styles.rise}>
                <span className={styles.label}>{panel.label}</span>
                <span className={styles.image}>
                  <Image src={panel.image} alt="" fill sizes="8rem" loading="lazy" style={{ objectPosition: panel.objectPosition }} />
                </span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
