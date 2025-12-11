// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // Next.js 14에서는 app directory가 기본적으로 활성화됨
//   experimental: {
//     optimizeCss: true,
//     optimizePackageImports: ['lucide-react', '@headlessui/react']
//   },
//   compiler: {
//     removeConsole: process.env.NODE_ENV === 'production'
//   },
//   optimizeFonts: true,
//   swcMinify: true,
//   images: {
//     formats: ['image/webp', 'image/avif']
//   }
// }

// module.exports = nextConfig
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 기존 설정 유지
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
  },

  // 2. 👇 [핵심] Proxy(Rewrites) 설정 추가
  // 프론트엔드가 '/api/...'로 요청을 보내면 -> Vercel이 받아서 -> 'EC2'로 대신 보내줍니다.
  async rewrites() {
    return [
      {
        source: '/api/:path*', // 브라우저가 '/api/auth/login' 같은 주소로 요청하면
        destination: 'http://13.209.139.144:8080/:path*', // Vercel이 'http://13.209.../auth/login'으로 토스합니다.
      },
    ];
  },
}

module.exports = nextConfig