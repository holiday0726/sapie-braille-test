/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14에서는 app directory가 기본적으로 활성화됨
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@headlessui/react']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  optimizeFonts: true,
  swcMinify: true,
  images: {
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig
