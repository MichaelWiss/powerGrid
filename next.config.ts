import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN for production build.");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
