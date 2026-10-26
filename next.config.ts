import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
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
