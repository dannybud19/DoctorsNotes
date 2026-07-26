/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source (main → src/index.ts), so Next must transpile them.
  transpilePackages: [
    "@medthread/domain",
    "@medthread/ai",
    "@medthread/supabase",
  ],
};

export default nextConfig;
