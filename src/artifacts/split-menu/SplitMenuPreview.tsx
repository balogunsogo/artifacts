import Image from "next/image";
import styles from "./SplitMenuPreview.module.scss";

const panels = [
  { label: "About", image: "/artifacts/split-menu/panel-01.png" },
  { label: "Process", image: "/artifacts/split-menu/panel-02.png" },
  { label: "Work", image: "/artifacts/split-menu/panel-03.png" },
  { label: "Contact", image: "/artifacts/split-menu/panel-04.png" },
] as const;

export function SplitMenuPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.panels}>
        {panels.map((panel, index) => (
          <span key={panel.label} className={index === 2 ? styles.active : styles.panel}>
            <Image src={panel.image} alt="" fill sizes={index === 2 ? "18rem" : "5rem"} loading="lazy" />
            <i>{String(index + 1).padStart(2, "0")} / {panel.label}</i>
          </span>
        ))}
      </div>
    </div>
  );
}
