'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useSpacebarRecording } from '@/hooks/useSpacebarRecording'
import { SpacebarIndicator } from '@/components/SpacebarIndicator'
import { ChatInput, ChatInputHandles } from '@/components/ChatInput'
import { useChat } from '@/hooks/useChat'
import { useChatSessions } from '@/hooks/useChatSessions'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAgentSelection } from '@/hooks/useAgentSelection'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getApiUrl } from '@/utils/env'
import { focusElement, announceToScreenReader } from '@/utils/accessibilityUtils'

const WelcomeScreen = dynamic(() => import('@/components/WelcomeScreen').then(mod => mod.WelcomeScreen), { 
  ssr: false,
  loading: () => (
    <div className="welcome-screen" role="main" aria-label="시각장애인을 위한 AI 어시스턴트 홈">
      <div className="welcome-title-skeleton bg-dark-800 animate-pulse rounded-lg h-24 w-3/4 mx-auto mb-10" role="presentation"></div>
      <div className="welcome-subtitle-skeleton bg-dark-700 animate-pulse rounded h-8 w-2/3 mx-auto mb-6" role="presentation"></div>
      <div className="quick-actions" role="group" aria-label="AI 어시스턴트 모드 선택">
        <div className="bg-dark-800 animate-pulse rounded-2xl h-12 w-32 mx-2" role="presentation"></div>
        <div className="bg-dark-800 animate-pulse rounded-2xl h-12 w-32 mx-2" role="presentation"></div>
        <div className="bg-dark-800 animate-pulse rounded-2xl h-12 w-32 mx-2" role="presentation"></div>
      </div>
    </div>
  )
})
const ChatMessages = dynamic(() => import('@/components/ChatMessages').then(mod => mod.ChatMessages), { ssr: false })


export default function Home() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [isReady, setIsReady] = useState(false)
  const chatInputRef = React.useRef<ChatInputHandles>(null)

  // 로그인 상태 확인 및 토큰 검증 (병렬 처리 최적화)
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('accessToken')
      const storedUsername = localStorage.getItem('username') || ''
      
      if (!token) {
        router.push('/login')
        return
      }

      // UI 렌더링을 위해 즉시 준비 상태로 설정
      setIsReady(true)
      setIsLoggedIn(true)
      setUsername(storedUsername)
      
      // 백그라운드에서 토큰 검증 (비동기)
      try {
        const apiUrl = getApiUrl()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3초 타임아웃
        
        const response = await fetch(`${apiUrl}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          setUsername(data.username || storedUsername)
        } else {
          // 토큰이 유효하지 않음 - 로그아웃 처리
          localStorage.removeItem('accessToken')
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('username')
          router.push('/login')
          return
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Auth check failed:', error)
        }
        // 네트워크 오류시에도 로컬 데이터로 계속 진행
        // (오프라인 상황에서도 앱 사용 가능)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [router])

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    localStorage.removeItem('accessToken')
    
    // 라이브 영역에 로그아웃 안내
    const announceElement = document.getElementById('live-announcements')
    if (announceElement) {
      announceElement.textContent = '로그아웃되었습니다. 로그인 페이지로 이동합니다.'
    }
    
    router.push('/login')
  }

  // 사이드바 관련 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)

  // 채팅 세션 관리
  const {
    chatSessions,
    currentSessionId,
    setCurrentSessionId,
    selectChatSession,
    handleDeleteSession,
    saveOrUpdateSession,
    addNewSession,
    startNewChat,
    loadChatSessionsFromServer
  } = useChatSessions()

  // Agent 선택 관리
  const {
    selectedAgentId,
    isAgentSelected,
    selectedAgent,
    selectAgent,
    clearSelection,
    isAgentSelectedById,
    agents
  } = useAgentSelection()

  // 채팅 메시지 관리
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    isProcessing,
    isStreaming,
    hasStartedChat,
    setHasStartedChat,
    messagesEndRef,
    handleSubmit: chatHandleSubmit,
    resetChat
  } = useChat({ currentSessionId, setCurrentSessionId, loadChatSessionsFromServer, selectedAgentId })

  // 파일 업로드 관리
  const {
    selectedFile,
    fileInputRef,
    handleFileChange,
    handleRemoveFile,
    processSelectedFile
  } = useFileUpload()

  // 음성 입력 자동 전송 처리
  const handleVoiceSubmit = async (text: string) => {
    if (!text.trim()) {
      const message = "인식된 음성이 없습니다. 다시 시도해주세요."
      alert(message)
      announceToScreenReader(message, 'assertive')
      return
    }

    // 웰컴 화면에서 시작하는 경우 명시적으로 새 세션 처리
    const wasWelcomeScreen = !hasStartedChat || !currentSessionId
    if (wasWelcomeScreen) {
      console.log('웰컴 화면에서 음성 입력 - 새 세션 시작')
    }

    // 음성 텍스트로 바로 메시지 전송
    const result = await chatHandleSubmit({ text, isVoice: true })

    // handleSubmit에서 currentSessionId가 설정되므로 직접 사용
    if (result && currentSessionId) {
      const isNewSession = wasWelcomeScreen || !chatSessions.find(s => s.id === currentSessionId)
      if (isNewSession) {
        addNewSession(currentSessionId, result.userMessage)
      }
      const finalMessages = [...messages, result.userMessage, result.assistantMessage]
      await saveOrUpdateSession(currentSessionId, finalMessages)
    }
  }

  // 음성 녹음 관리
  const {
    isRecording,
    micPermissionGranted,
    startRecording,
    stopRecording,
    handleVoiceClick
  } = useVoiceRecording({
    onTranscriptionReceived: (text: string) => {
      handleVoiceSubmit(text)
    }
  })

  // 스페이스바 녹음 기능 통합 (기본값: double-tap 모드)
  const {
    isHolding,
    isRecording: isSpacebarRecording,
    holdProgress,
    waitingForSecondClick,
    mode
  } = useSpacebarRecording({
    onStartRecording: startRecording,
    onStopRecording: stopRecording,
    holdDuration: 2000,
    mode: 'double-tap', // Phase 1: 기본값을 double-tap으로 설정
    doubleClickThreshold: 450
  })

  // 키보드 단축키 기능 (Ctrl+R로 TTS 재생)
  const {
    playTextToSpeech,
    getTextToRead,
    handleCtrlR
  } = useKeyboardShortcuts({
    messages,
    inputText
  })

  // 로그인 직후 환영 메시지 안내
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn) {
      const welcomeMessage = `로그인에 성공했습니다. 안녕하세요 ${username}, 음성으로 말씀하시거나 텍스트로 입력하세요. 
      스페이스바를 두 번 누르면 음성 녹음이 시작되고 종료됩니다. 
      컨트롤 더하기 o 를 누르면 파일 탐색기가 실행됩니다. 
      컨트롤 더하기 r을 누르면 텍스트 음성을 재생합니다.`
      
      announceToScreenReader(welcomeMessage, 'assertive', 500);
      sessionStorage.removeItem('justLoggedIn');
    }
  }, [username]); // username이 설정된 후에 실행

  // 접근성: WelcomeScreen이 보일 때 메인 영역에 포커스
  useEffect(() => {
    if (!hasStartedChat) {
      // WelcomeScreen의 role="main" 요소에 id 추가 필요
      focusElement('welcome-main', 200)
    }
    // hasStartedChat이 true가 되면 ChatInput으로 포커스 이동 (ChatInput 내부 로직 활용)
  }, [hasStartedChat])

  // TTS 캐시 정리 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      const { AudioManager } = require('@/utils/audioManager');
      AudioManager.clearExpiredCache();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, []);

  // 성능 측정 (개발환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // LCP 측정
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`🎯 LCP: ${Math.round(lastEntry.startTime)}ms`);
        
        if (lastEntry.startTime < 1500) {
          console.log('✅ LCP 목표 달성! (<1.5s)');
        } else {
          console.log('⚠️ LCP 목표 미달성 (>1.5s)');
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FCP 측정
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          console.log(`🚀 FCP: ${Math.round(fcpEntry.startTime)}ms`);
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      return () => {
        lcpObserver.disconnect();
        fcpObserver.disconnect();
      };
    }
  }, []);

  // 메시지 전송 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 문서 변환 에이전트(ID: 5)일 때는 파일만 있으면 됨
    const isDocumentConversionAgent = selectedAgentId === 5
    if (isDocumentConversionAgent) {
      if (!selectedFile) return // 문서 변환은 파일 필수
    } else {
      if (!inputText.trim() && !selectedFile) return // 일반 모드는 텍스트 또는 파일 필요
    }

    // 웰컴 화면에서 시작하는 경우 체크
    const wasWelcomeScreen = !hasStartedChat || !currentSessionId
    if (wasWelcomeScreen) {
      console.log('웰컴 화면에서 텍스트 입력 - 새 세션 시작')
    }

    let difyFiles: any[] = []
    if (selectedFile) {
      const files = await processSelectedFile()
      if (!files) return // 파일 업로드 실패 시 중단
      difyFiles = files
    }

    const result = await chatHandleSubmit({ difyFiles, text: inputText })
    if (result && currentSessionId) {
      // 새 세션인지 확인 (웰컴 화면이었거나 기존 대화목록에 없는 경우)
      const isNewSession = wasWelcomeScreen || !chatSessions.find(s => s.id === currentSessionId)

      if (isNewSession) {
        // 새 세션이면 즉시 대화목록에 추가
        addNewSession(currentSessionId, result.userMessage)
      }

      // 세션 저장
      const finalMessages = [...messages, result.userMessage, result.assistantMessage]
      await saveOrUpdateSession(currentSessionId, finalMessages)
    }

    // 파일 선택 해제
    handleRemoveFile()
  }

  // 세션 선택 처리
  const handleSelectChatSession = async (sessionId: string) => {
    const sessionMessages = await selectChatSession(sessionId, messages)
    if (sessionMessages) {
      setMessages(sessionMessages)
      setHasStartedChat(sessionMessages.length > 0)
      setIsSidebarOpen(false)
    }
  }

  // 새 대화 시작 처리
  const handleStartNewChat = () => {
    // 세션 완전 초기화
    setCurrentSessionId(null)
    startNewChat()
    resetChat()
    setMessages([])
    setHasStartedChat(false)
    setIsSidebarOpen(false)
    console.log('새 대화 시작 - 세션 완전 초기화')
  }

  // 세션 삭제 처리
  const handleSessionDelete = async (sessionId: string) => {
    const shouldStartNewChat = await handleDeleteSession(sessionId)
    if (shouldStartNewChat) {
      handleStartNewChat()
    }
  }

  // 로딩 중이거나 로그인되지 않은 경우
  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-800">{!isReady ? '앱을 준비 중입니다...' : '인증 확인 중...'}</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null // 리다이렉트 진행 중
  }

  return (
    // <div className="flex h-screen" role="application" aria-label="Sapie-Braille 시각장애인 AI 어시스턴트">
    <div className="flex h-screen" role="application" aria-label=" ">
      {/* 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSelectChatSession}
        onNewChat={handleStartNewChat}
        onSessionDelete={handleSessionDelete}
        onHoverChange={setIsSidebarHovered}
      />

      {/* 홈 버튼 (로고) */}
      <button
        onClick={handleStartNewChat}
        className={`fixed top-6 z-50 text-xl font-bold text-dark-800 hover:text-primary-400 transition-all duration-300 ease-in-out ${
          (isSidebarOpen || isSidebarHovered) ? 'md:left-[336px]' : 'md:left-[80px]'
        } left-6`}
        role="button"
        aria-label="새 대화 시작 - Sapie-Braille 홈으로 이동"
        tabIndex={0}
      >
        Sapie-Braille
      </button>

      {/* 로그아웃 버튼 */}
      {/* <button
        onClick={handleLogout}
        className={`fixed top-6 right-6 z-50 text-sm px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-300 rounded-lg transition-all duration-200`}
        role="button"
        aria-label={`${username}님, 로그아웃하기`}
        tabIndex={0}
      >
        {username} 로그아웃
      </button> */}

      {/* 메인 컨테이너 */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out md:pl-[56px] ${
        (isSidebarOpen || isSidebarHovered) ? 'md:pl-80' : ''
      }`}>
        {/* 메인 콘텐츠 영역 */}
        {/* <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          {!hasStartedChat ? (
            <WelcomeScreen 
              micPermissionGranted={micPermissionGranted}
              username={username}
              selectedAgentId={selectedAgentId}
              isAgentSelected={isAgentSelected}
              onAgentSelect={selectAgent}
              agents={agents}
            />
          ) : (
            <ChatMessages
              messages={messages}
              isProcessing={isProcessing}
              isStreaming={isStreaming}
              messagesEndRef={messagesEndRef}
              selectedAgentId={selectedAgentId}
            />
          )}
        </div> */}
        {/* <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          {!hasStartedChat ? (
            <WelcomeScreen 
              micPermissionGranted={micPermissionGranted}
              username={username}
              selectedAgentId={selectedAgentId}
              isAgentSelected={isAgentSelected}
              onAgentSelect={selectAgent}
              agents={agents}
            />
          ) : (
            <ChatMessages
              messages={messages}
              isProcessing={isProcessing}
              isStreaming={isStreaming}
              messagesEndRef={messagesEndRef}
              selectedAgentId={selectedAgentId}
            />
          )}
        </div> */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
        {!hasStartedChat ? (
          <WelcomeScreen 
            micPermissionGranted={micPermissionGranted}
            username={username}
            selectedAgentId={selectedAgentId}
            isAgentSelected={isAgentSelected}
            onAgentSelect={selectAgent}
            agents={agents}
          />
        ) : (
          <ChatMessages
            messages={messages}
            isProcessing={isProcessing}
            isStreaming={isStreaming}
            messagesEndRef={messagesEndRef}
            selectedAgentId={selectedAgentId}
          />
        )}
      </div>
        {/* 하단 고정 입력창 */}
        <ChatInput
          ref={chatInputRef}
          inputText={inputText}
          setInputText={setInputText}
          selectedFile={selectedFile}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          isRecording={isRecording}
          onVoiceClick={handleVoiceClick}
          isProcessing={isProcessing}
          onSubmit={handleSubmit}
          selectedAgentId={selectedAgentId}
        />
      </div>

      {/* 스페이스바 녹음 인디케이터 */}
      <SpacebarIndicator
        isHolding={isHolding}
        isRecording={isSpacebarRecording}
        holdProgress={holdProgress}
        waitingForSecondClick={waitingForSecondClick}
        mode={mode}
      />
    </div>
  )
}