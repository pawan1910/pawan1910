/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hex-territory/shared'],
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
}

module.exports = nextConfig
