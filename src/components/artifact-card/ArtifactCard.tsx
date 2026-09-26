import { AmbientArtworkPreview } from "@/artifacts/ambient-artwork/AmbientArtworkPreview";
import type { Artifact } from "@/artifacts/artifact.types";
import { BlockOrbitPreview } from "@/artifacts/block-orbit/BlockOrbitPreview";
import { PaletteShiftArtifact } from "@/artifacts/palette-shift/PaletteShiftArtifact";
import { ScrollCinemaPreview } from "@/artifacts/scroll-cinema/ScrollCinemaPreview";
import { SplitMenuPreview } from "@/artifacts/split-menu/SplitMenuPreview";
import { SpatialServicesPreview } from "@/artifacts/spatial-services/SpatialServicesPreview";
import { TrackTransitionArtifact } from "@/artifacts/track-transition/TrackTransitionArtifact";
import { spatialServices } from "@/artifacts/spatial-services/spatial-services.data";
import { ThreeImageOrbit } from "@/artifacts/three-image-orbit/ThreeImageOrbit";
import { ScrollSequencePreview } from "@/artifacts/scroll-sequence/ScrollSequencePreview";
import { CardFlipPreview } from "@/artifacts/card-flip/CardFlipPreview";
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
          ) : artifact.slug === "three-image-orbit" ? (
            <ThreeImageOrbit
              mode="preview"
              images={[
                { src: spatialServices[1].image, alt: spatialServices[1].imageAlt },
                { src: spatialServices[2].image, alt: spatialServices[2].imageAlt },
                { src: spatialServices[3].image, alt: spatialServices[3].imageAlt },
              ]}
            />
          ) : artifact.slug === "scroll-cinema" ? (
            <ScrollCinemaPreview />
          ) : artifact.slug === "ambient-artwork" ? (
            <AmbientArtworkPreview />
          ) : artifact.slug === "spatial-services" ? (
            <SpatialServicesPreview />
          ) : artifact.slug === "palette-shift" ? (
            <PaletteShiftArtifact mode="preview" initialArtworkIndex={0} />
          ) : artifact.slug === "scroll-sequence" ? (
            <ScrollSequencePreview />
          ) : artifact.slug === "card-flip" ? (
            <CardFlipPreview />
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
