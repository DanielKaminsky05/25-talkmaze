import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image requires external hostnames to be allowlisted
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zfnmverkmybrasrwhjyg.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
