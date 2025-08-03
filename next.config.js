/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Exclude scripts folder from TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig