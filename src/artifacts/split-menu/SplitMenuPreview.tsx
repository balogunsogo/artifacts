import Image from "next/image";
import { spatialServices } from "@/artifacts/spatial-services/spatial-services.data";
import styles from "./SplitMenuPreview.module.scss";

const panels = spatialServices.slice(0, 4);

export function SplitMenuPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.panels}>
        {panels.map((panel, index) => (
          <span key={panel.label} className={index === 2 ? styles.active : styles.panel}>
            <Image src={panel.image} alt="" fill sizes={index === 2 ? "18rem" : "5rem"} loading="lazy" style={{ objectPosition: panel.objectPosition }} />
            <i>{panel.label}</i>
          </span>
        ))}
      </div>
    </div>
  );
}
