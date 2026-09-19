import type { Metadata } from "next";
import { Inter_Tight, Syne } from "next/font/google";
import "./globals.scss";

const themeInitializationScript = `
  (() => {
    try {
      const savedTheme = localStorage.getItem("artifacts-theme");
      const theme = savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }
  })();
`;

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://artifacts.oluwasogo.dev"),
  title: { default: "Artifacts — Interaction Archive", template: "%s — Artifacts" },
  description:
    "A growing archive of reusable interactions, motion studies and digital experiments by Oluwasogo Balogun.",
  openGraph: {
    type: "website",
    siteName: "Artifacts",
    title: "Artifacts — Interaction Archive by Oluwasogo Balogun",
    description: "Reusable interactions, motion studies and digital experiments.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${syne.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
