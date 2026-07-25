/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source (main → src/index.ts), so Next must transpile them.
  transpilePackages: [
    "@doctorsnotes/domain",
    "@doctorsnotes/ai",
    "@doctorsnotes/supabase",
  ],
};

export default nextConfig;
