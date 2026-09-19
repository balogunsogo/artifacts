import { artifacts } from "@/artifacts/artifact.data";
import { ArchiveSidebar } from "@/components/archive-sidebar/ArchiveSidebar";
import { ArtifactCard } from "@/components/artifact-card/ArtifactCard";
import { HorizontalArchive } from "@/components/horizontal-archive/HorizontalArchive";
import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.archive}>
      <ArchiveSidebar />
      <h2 id="collection-heading" className="sr-only">Artifact collection</h2>
      <HorizontalArchive className={styles.collection} trackClassName={styles.track} labelledBy="collection-heading">
        {artifacts.map((artifact) => <ArtifactCard key={artifact.slug} artifact={artifact} />)}
      </HorizontalArchive>
    </main>
  );
}
