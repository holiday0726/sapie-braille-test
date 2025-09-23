export default function Header() {
  return (
    <header 
      className="bg-dark-850 border-b border-dark-800 py-4 mb-6"
      role="banner"
    >
      <div className="container">
        <nav 
          className="flex justify-between items-center"
          role="navigation"
          aria-label="주 내비게이션"
        >
          <div 
            className="text-xl font-bold text-dark-100 tracking-tight"
            role="heading"
            aria-level={1}
          >
            <span aria-label="사피 브레일, 시각장애인을 위한 AI 어시스턴트">Sapie Braille</span>
          </div>
          
          <div className="flex gap-2" role="list" aria-label="상단 메뉴">
            <a 
              href="/" 
              className="text-dark-100 no-underline py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900"
              aria-label="홈 페이지로 이동"
              role="listitem"
            >
              <span aria-hidden="true">🏠</span>
              <span className="ml-1">홈</span>
            </a>
            <a 
              href="/about" 
              className="text-dark-400 no-underline py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium hover:bg-dark-800 hover:text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900"
              aria-label="소개 페이지로 이동"
              role="listitem"
            >
              <span aria-hidden="true">ℹ️</span>
              <span className="ml-1">소개</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
