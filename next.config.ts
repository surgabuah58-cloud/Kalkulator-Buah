import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  ...(process.env.VERCEL
    ? { adapterPath: require.resolve("@vercel/next") }
    : {}),
};

export default nextConfig;
