import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  images: {
    // AVIF first (smaller), WebP fallback for browsers without AVIF support.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
