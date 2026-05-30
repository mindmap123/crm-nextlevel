/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint via `npm run lint` séparément ; ne bloque pas le build.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
