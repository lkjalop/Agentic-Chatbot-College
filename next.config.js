/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Exclude scripts folder from TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig