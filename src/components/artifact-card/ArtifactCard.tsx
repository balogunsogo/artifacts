import { AmbientArtworkPreview } from "@/artifacts/ambient-artwork/AmbientArtworkPreview";
import type { Artifact } from "@/artifacts/artifact.types";
import { BlockOrbitPreview } from "@/artifacts/block-orbit/BlockOrbitPreview";
import { PaletteShiftArtifact } from "@/artifacts/palette-shift/PaletteShiftArtifact";
import { ScrollCinemaPreview } from "@/artifacts/scroll-cinema/ScrollCinemaPreview";
import { SplitMenuPreview } from "@/artifacts/split-menu/SplitMenuPreview";
import { TrackTransitionArtifact } from "@/artifacts/track-transition/TrackTransitionArtifact";
import { TrackedArtifactLink } from "@/components/analytics/TrackedArtifactLink";
import styles from "./ArtifactCard.module.scss";

export function ArtifactCard({ artifact }: { artifact: Artifact }) {
  return (
    <article className={styles.card}>
      <TrackedArtifactLink artifactId={artifact.id} artifactSlug={artifact.slug} artifactTitle={artifact.title}>
        <div className={styles.preview}>
          {artifact.slug === "block-orbit" ? (
            <BlockOrbitPreview />
          ) : artifact.slug === "split-menu" ? (
            <SplitMenuPreview />
          ) : artifact.slug === "scroll-cinema" ? (
            <ScrollCinemaPreview />
          ) : artifact.slug === "ambient-artwork" ? (
            <AmbientArtworkPreview />
          ) : artifact.slug === "palette-shift" ? (
            <PaletteShiftArtifact mode="preview" initialArtworkIndex={0} />
          ) : (
            <TrackTransitionArtifact mode="preview" initialTrackIndex={0} />
          )}
        </div>
        <div className={styles.heading}>
          <span className={styles.number}>{artifact.id}</span>
          <h2>{artifact.title}</h2>
        </div>
        <p className={styles.category}>{artifact.category}</p>
        <p className={styles.description}>{artifact.description}</p>
      </TrackedArtifactLink>
    </article>
  );
}
