import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { artifacts } from "@/artifacts/artifact.data";
import { getArtifactBySlug } from "@/artifacts/artifact.utils";
import { ArtifactStage } from "@/components/artifact-stage/ArtifactStage";
import { socialImage, socialImageAlt } from "@/app/site-metadata";
import styles from "./page.module.scss";

type ArtifactPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return artifacts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ArtifactPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artifact = getArtifactBySlug(slug);
  if (!artifact) return { title: "Artifact not found" };
  return {
    title: `${artifact.id} — ${artifact.title}`,
    description: artifact.description,
    alternates: { canonical: `/artifacts/${slug}` },
    openGraph: {
      title: `${artifact.id} — ${artifact.title}`,
      description: artifact.description,
      url: `/artifacts/${slug}`,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artifact.id} — ${artifact.title}`,
      description: artifact.description,
      images: [{ url: socialImage.url, alt: socialImageAlt }],
    },
  };
}

export default async function ArtifactPage({ params }: ArtifactPageProps) {
  const artifact = getArtifactBySlug((await params).slug);
  if (!artifact) notFound();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} href="/">
          <span>Back to Index</span>
        </Link>
        <div><span>{artifact.id}</span><h1 id="artifact-title">{artifact.title}</h1></div>
        <span>{artifact.category}</span>
      </header>
      <ArtifactStage artifact={artifact} />
    </main>
  );
}
