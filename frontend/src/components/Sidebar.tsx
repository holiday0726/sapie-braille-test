'use client';

import React, { useState } from 'react';

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  lastMessage: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onSessionDelete: (sessionId: string) => void;
  onHoverChange?: (isHovered: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  chatSessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onSessionDelete,
  onHoverChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // 실제로 표시되는 열림 상태 (클릭으로 열린 상태 또는 호버 상태)
  const isDisplayOpen = isOpen || isHovered;
  
  // 호버 상태 변경 시 상위 컴포넌트에 알림
  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverChange?.(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverChange?.(false);
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '오늘';
    } else if (days === 1) {
      return '어제';
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <>
      {/* 오버레이 (모바일에서 사이드바가 열릴 때) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
          role="button"
          aria-label="사이드바 닫기"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
        />
      )}

      {/* 사이드바 */}
      <aside
        id="sidebar-content"
        className={`fixed top-0 left-0 h-full bg-dark-850 border-r border-dark-800 z-50 transform transition-transform duration-300 ease-in-out w-80 flex flex-col ${
          isDisplayOpen ? 'translate-x-0' : '-translate-x-[calc(100%-56px)]'
        }`}
        style={{ backgroundColor: '#FBFBFB', borderColor: '#e0e0e0' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="complementary"
        aria-label="대화 기록 사이드바"
        aria-expanded={isDisplayOpen}
        aria-hidden={!isOpen}
      >
        {/* 헤더 */}
        <header className="flex items-center justify-between p-4 h-[65px]" role="banner">
          <h2 
            className={`text-lg font-semibold text-dark-100 transition-opacity duration-200 ${isDisplayOpen ? 'opacity-100' : 'opacity-0'}`}
            style={{ color: '#252528' }}
            role="heading"
            aria-level={2}
            id="sidebar-title"
          >
            대화 기록
          </h2>
          <button
            onClick={onNewChat}
            className={`p-2 rounded-lg text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-all duration-200 ${isDisplayOpen ? 'opacity-100' : 'opacity-0'}`}
            style={{ color: '#252528' }}
            title="새 대화 시작"
            aria-label="새 대화 시작하기"
            tabIndex={isOpen ? 0 : -1}
            role="button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </header>

        {/* 대화 목록 */}
        <nav 
          className="flex-grow overflow-y-auto custom-scrollbar min-h-0"
          style={{
            // Firefox 스크롤바 스타일
            scrollbarWidth: 'thin',
            scrollbarColor: '#bfbfbf #f2f2f2', // thumb track - light theme
          }}
          aria-label="대화 기록"
          tabIndex={isOpen ? 0 : -1}
        >
          {chatSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-dark-500 p-4" style={{ color: '#a6a6a6' }}>
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                role="img"
                aria-label="빈 대화 아이콘"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-7-4c0-4.418 3.582-8 8-8s8 3.582 8 8z"
                />
              </svg>
              <p className="text-sm" role="text">아직 대화가 없습니다</p>
              <p className="text-xs text-gray-400 mt-1" role="text">새 대화를 시작해보세요</p>
            </div>
          ) : (
            <ul className="p-2 space-y-1" role="list" aria-label={`총 ${chatSessions.length}개의 대화 세션`}>
              {chatSessions.map((session, index) => (
                <li key={session.id} role="listitem" className="group relative border-b border-dark-800 last:border-b-0" style={{ borderColor: '#e0e0e0' }}>
                  <button
                    onClick={() => onSessionSelect(session.id)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-dark-800 cursor-default'
                        : 'hover:bg-dark-800/50 cursor-pointer'
                    }`}
                    style={{ backgroundColor: currentSessionId === session.id ? '#f2f2f2' : 'transparent' }}
                    aria-label={`대화 세션 ${index + 1}: ${session.title}, 마지막 메시지: ${session.lastMessage ? truncateText(session.lastMessage, 30) : '없음'}, ${formatDate(session.timestamp)}`}
                    aria-current={currentSessionId === session.id ? 'page' : undefined}
                    tabIndex={isOpen ? 0 : -1}
                    role="button"
                  >
                    <h3 
                      className="font-semibold text-dark-100 text-sm mb-2 truncate"
                      style={{ color: '#252528' }}
                      role="heading"
                      aria-level={3}
                    >
                      {session.title}
                    </h3>
                    <p className="text-xs text-dark-400 mb-3 truncate" role="text" style={{ color: '#a6a6a6' }}>
                      {session.lastMessage && truncateText(session.lastMessage)}
                    </p>
                    <time 
                      className="text-xs text-dark-500"
                      style={{ color: '#a6a6a6' }}
                      dateTime={session.timestamp.toISOString()}
                      aria-label={`대화 시간: ${formatDate(session.timestamp)}`}
                    >
                      {formatDate(session.timestamp)}
                    </time>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`'${session.title}' 대화를 정말 삭제하시겠습니까?`)) {
                        onSessionDelete(session.id);
                      }
                    }}
                    className="absolute top-3 right-3 p-1 rounded-full text-dark-500 hover:bg-dark-700 hover:text-dark-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#a6a6a6' }}
                    aria-label={`'${session.title}' 대화 삭제`}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* 푸터 (설정 등) */}
        <footer 
          className={`p-4 border-t border-dark-800 transition-opacity duration-200 ${isDisplayOpen ? 'opacity-100' : 'opacity-0'}`}
          style={{ borderColor: '#e0e0e0' }}
          role="contentinfo"
        >
          <div 
            className="text-xs text-dark-400 text-center"
            style={{ color: '#a6a6a6' }}
            role="text"
            aria-label="앱 정보: Sapie Braille Assistant"
          >
            Sapie Braille Assistant
          </div>
        </footer>
      </aside>
      
      {/* 사이드바 토글 버튼 */}
      <button
        onClick={onToggle}
        className="fixed top-1/2 -translate-y-1/2 left-[56px] z-[60] p-2 bg-dark-800 text-dark-300 hover:bg-dark-700 rounded-full border border-dark-700 shadow-lg transition-transform duration-300 ease-in-out"
        style={{ backgroundColor: '#FBFBFB', color: '#252528', borderColor: '#e0e0e0', transform: `translateX(${isDisplayOpen ? '264px' : '0px'})` }}
        aria-label={isOpen ? "사이드바 닫기" : "사이드바 열기"}
        aria-expanded={isOpen}
        aria-controls="sidebar-content"
        tabIndex={0}
        role="button"
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isDisplayOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
    </>
  );
};

export default Sidebar;
