/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@workspace/ui", "@workspace/editor", "@workspace/dataview"],
  output: "standalone",
}

export default nextConfig