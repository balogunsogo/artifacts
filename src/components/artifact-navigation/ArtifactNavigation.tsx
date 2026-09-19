import Link from "next/link";
import type { Artifact } from "@/artifacts/artifact.types";
import styles from "./ArtifactNavigation.module.scss";

export function ArtifactNavigation({ previous, next, position, total }: { previous: Artifact; next: Artifact; position: string; total: string }) {
  return (
    <nav className={styles.navigation} aria-label="Artifact navigation">
      <Link href={`/artifacts/${previous.slug}`}><span>Previous</span><strong>← {previous.title}</strong></Link>
      <span className={styles.position} aria-label={`Artifact ${position} of ${total}`}>{position} / {total}</span>
      <Link href={`/artifacts/${next.slug}`}><span>Next</span><strong>{next.title} →</strong></Link>
    </nav>
  );
}
