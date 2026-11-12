import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  images: {
    minimumCacheTTL: 300,
  },
  experimental: {
    agentFeedback: true,
    instantInsights: {
      validationLevel: "manual-warning",
    },
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/vote/overview",
        permanent: false,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
