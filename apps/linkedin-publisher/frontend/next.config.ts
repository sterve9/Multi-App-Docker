import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.linkedin.sterveshop.cloud/api/:path*",
      },
    ];
  },
};

export default nextConfig;
