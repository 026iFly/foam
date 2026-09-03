import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public objects (gallery images)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
