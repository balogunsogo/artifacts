"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { SpatialService } from "@/artifacts/spatial-services/spatial-services.data";
import { initialCardFlipServices, pickRandomCardFlipServices } from "./card-flip.data";
import styles from "./CardFlipPreview.module.scss";

export function CardFlipPreview() {
  const [cards, setCards] = useState<readonly SpatialService[]>(initialCardFlipServices);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const randomizeFrame = window.requestAnimationFrame(() => setCards(pickRandomCardFlipServices()));
    const openingTimer = window.setTimeout(() => setActiveIndex(0), 650);
    const cycleTimer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % 3);
    }, 2100);

    return () => {
      window.cancelAnimationFrame(randomizeFrame);
      window.clearTimeout(openingTimer);
      window.clearInterval(cycleTimer);
    };
  }, []);

  return (
    <div className={styles.preview} aria-hidden="true">
      {cards.map((card, index) => (
        <div key={card.image} className={styles.card} data-open={index === activeIndex}>
          <div className={styles.rotator}>
            <div className={`${styles.face} ${styles.front}`}>
              <Image src={card.image} alt="" fill sizes="8rem" style={{ objectPosition: card.objectPosition }} />
            </div>
            <div className={`${styles.face} ${styles.back}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{card.label}</b>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
