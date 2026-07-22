import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Mock imagery placeholders (real data would be Sentinel-2 / sensor tiles).
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
