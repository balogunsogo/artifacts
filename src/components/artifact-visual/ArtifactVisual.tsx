import styles from "./ArtifactVisual.module.scss";

type ArtifactVisualProps = { slug: string; large?: boolean };

export function ArtifactVisual({ slug, large = false }: ArtifactVisualProps) {
  return (
    <div className={`${styles.visual} ${large ? styles.large : ""}`} data-visual={slug} aria-hidden="true">
      {slug === "block-orbit" && (
        <div className={styles.orbit}>
          <i /><i /><i />
        </div>
      )}
      {slug === "split-menu" && (
        <div className={styles.split}>
          <i /><i /><i />
        </div>
      )}
      {slug === "scroll-cinema" && (
        <div className={styles.cinema}>
          <i /><span>16 : 9</span>
        </div>
      )}
      {slug === "ambient-artwork" && (
        <div className={styles.ambient}>
          <i><span /></i>
        </div>
      )}
      {slug === "palette-shift" && (
        <div className={styles.palette}>
          <i /><i /><i /><i /><i />
        </div>
      )}
      {slug === "track-transition" && (
        <div className={styles.tracks}>
          <i /><i /><i />
          <span><b /><b /></span>
        </div>
      )}
    </div>
  );
}
