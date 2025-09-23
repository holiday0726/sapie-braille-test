import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial', 'sans-serif']
})

import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Sapie Braille - 시각장애인을 위한 AI 어시스턴트',
  description: '시각장애인 지원 텍스트 및 문서 처리 후 음성 변환 시스템. 스크린 리더 지원, 음성 인식, 키보드 내비게이션 지원',
  keywords: '시각장애인, 접근성, 음성변환, 스크린리더, 텍스트투스피치, 웹접근성, ARIA, WCAG',
  robots: 'index, follow',
  authors: [{ name: 'Sapie Braille Team' }],
  category: 'accessibility',
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3b82f6',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" dir="ltr">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        {/* 스킵 링크 - 키보드 사용자가 주요 콘텐츠로 바로 이동할 수 있음 */}
        {/* <a 
          href="#main-content" 
          className="skip-link"
          tabIndex={0}
        >
          주요 콘텐츠로 바로가기
        </a>
        <a 
          href="#chat-input" 
          className="skip-link"
          tabIndex={0}
        >
          메시지 입력창으로 바로가기
        </a> */}
        
        {/* 스크린 리더를 위한 랜드마크 안내 - 로그인 페이지와의 중복을 막기 위해 주석 처리 */}
        {/* <div className="sr-only" role="banner">
          Sapie Braille 시각장애인을 위한 AI 어시스턴트에 오신 것을 환영합니다. 
        </div> */}
        
        <main id="main-content" role="main">
          {children}
        </main>
        
        {/* 라이브 영역 - 동적 콘텐츠 변화를 스크린 리더에 알림 */}
        <div 
          id="live-announcements" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        ></div>
        <div 
          id="live-announcements-assertive" 
          aria-live="assertive" 
          aria-atomic="true" 
          className="sr-only"
        ></div>
      </body>
    </html>
  )
}
