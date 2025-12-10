/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',  // ← Esta línea es CRÍTICA
};

module.exports = nextConfig;
