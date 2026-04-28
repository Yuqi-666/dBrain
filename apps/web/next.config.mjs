/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@workspace/ui", "@workspace/editor"],
}

export default nextConfig