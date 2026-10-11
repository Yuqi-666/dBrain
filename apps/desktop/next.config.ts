import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: false,
  // Limit parallel prerender workers on development/build machines.
  experimental: { cpus: 2 },
  transpilePackages: [
    "@workspace/ui",
    "@workspace/editor",
    "@workspace/dataview",
  ],
  env: { NEXT_PUBLIC_DBRAIN_PLATFORM: "desktop" },
};

export default nextConfig;
