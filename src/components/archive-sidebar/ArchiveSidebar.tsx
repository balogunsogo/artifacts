import { artifacts } from "@/artifacts/artifact.data";
import { formatArtifactCount } from "@/artifacts/artifact.utils";
import { ThemeToggle } from "@/components/theme-toggle/ThemeToggle";
import styles from "./ArchiveSidebar.module.scss";

export function ArchiveSidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Archive introduction">
      <div className={styles.topline}>
        <span>Artifacts</span>
        <span>{formatArtifactCount(artifacts.length)}</span>
        <ThemeToggle />
      </div>
      <div className={styles.intro}>
        <h1 className="sr-only">Artifacts interaction archive</h1>
        <p>Artifacts is a growing collection of reusable interactions, motion studies and interface behaviours.</p>
        <p>Some began inside larger projects. Others started as prototypes, unfinished ideas or small technical questions. Each one is isolated, documented and rebuilt so it can be studied, reused and developed further.</p>
      </div>
      <div className={styles.footer}>
        <nav aria-label="Social links">
          <a href="https://www.linkedin.com/in/sogobalogun/" target="_blank" rel="noreferrer">LinkedIn</a>
          <a href="https://x.com/b_oluwasogo" target="_blank" rel="noreferrer">X</a>
          <a href="https://github.com/balogunsogo" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </div>
    </aside>
  );
}
