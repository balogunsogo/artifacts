import type { Metadata } from "next";
import { Inter_Tight, Syne } from "next/font/google";
import Script from "next/script";
import {
  siteDescription,
  siteTitle,
  siteUrl,
  socialDescription,
  socialImage,
} from "./site-metadata";
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

const gaId = "G-ZXV390DW0Q";

// Queue is set up right after hydration so early events (sendGAEvent) are kept;
// the 170 KiB gtag.js itself waits until the page has finished loading.
const analyticsInitializationScript = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", "${gaId}");
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
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s — Artifacts" },
  description: siteDescription,
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Artifacts",
    title: siteTitle,
    description: socialDescription,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: socialDescription,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${syne.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script id="ga-init" strategy="afterInteractive">{analyticsInitializationScript}</Script>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
          </>
        )}
      </body>
    </html>
  );
}
