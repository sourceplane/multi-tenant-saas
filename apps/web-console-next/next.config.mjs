/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Lint runs separately via `pnpm lint`. Skip during `next build` to keep
    // the build deterministic across Node/ESLint flat-config quirks.
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? "",
  },
};

export default nextConfig;
