export type ArtifactStatus = "Extraction pending" | "In progress" | "Published";

export type ArtifactTheme = {
  background: string;
  foreground: string;
  accent: string;
};

export type Artifact = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  origin: string;
  year: number;
  status: ArtifactStatus;
  featured: boolean;
  theme: ArtifactTheme;
};
