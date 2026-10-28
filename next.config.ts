import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard/quests", destination: "/dashboard/habits", permanent: false },
      { source: "/dashboard/proof", destination: "/dashboard/history", permanent: false },
      { source: "/dashboard/stats", destination: "/dashboard/history", permanent: false },
      { source: "/dashboard/identity", destination: "/dashboard/review", permanent: false },
      { source: "/dashboard/story", destination: "/dashboard/review", permanent: false },
    ];
  },
};

export default nextConfig;
