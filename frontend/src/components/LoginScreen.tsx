'use client'

import React, { useState, useEffect, useRef } from 'react'

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void
  isLoading?: boolean
  error?: string
}

export const LoginScreen = ({ onLogin, isLoading = false, error }: LoginScreenProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  // 컴포넌트 마운트 시 초기 설정
  useEffect(() => {
    // 페이지 진입 시 안내 문구를 스크린리더가 읽도록 설정
    const welcomeElement = document.getElementById('welcome-announcement')
    if (welcomeElement) {
      welcomeElement.textContent = '시각장애인을 위한 AI 어시스턴트 사피 브레일입니다.'
      welcomeElement.textContent = ''
    }
    // 페이지 로드 시 강제로 포커스를 이동시키지 않습니다.
    // 스크린리더가 페이지 콘텐츠를 순차적으로 읽도록 합니다.
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    onLogin(username, password)
  }

  // 엔터 키로 다음 필드 이동 처리
  const handleUsernameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username.trim()) {
      e.preventDefault()
      if (passwordRef.current) {
        passwordRef.current.focus()
        // 비밀번호 입력 안내
        const announceElement = document.getElementById('navigation-announcement')
        if (announceElement) {
          announceElement.textContent = '비밀번호를 입력해주세요.'
        }
      }
    }
  }

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim() && username.trim()) {
      e.preventDefault()
      if (submitRef.current) {
        submitRef.current.click()
      }
    }
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" role="main" style={{ backgroundColor: '#FBFBFB' }}>
      {/* 초기 안내 메시지 영역 */}
      <div 
        id="welcome-announcement" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        로그인 화면입니다. 사용자명을 입력해주세요.
      </div>
      
      {/* 네비게이션 안내 메시지 영역 */}
      <div 
        id="navigation-announcement" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      ></div>
      
      <div className="w-full max-w-md">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4" style={{ color: '#252528' }}>
            Sapie-Braille
          </h1>
          <p className="text-lg text-gray-600" style={{ color: '#555' }}>
            시각장애인을 위한 AI 어시스턴트
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="card">
          <form onSubmit={handleSubmit} role="form" aria-label="로그인 폼">
            {/* 에러 메시지 */}
            {error && (
              <div 
                className="mb-6 p-4 bg-red-100 border border-red-400 rounded-xl text-red-700 text-sm"
                role="alert"
                aria-live="polite"
              >
                <span aria-hidden="true">⚠️</span> {error}
              </div>
            )}

            {/* 사용자명 입력 */}
            <div className="mb-6">
              <label 
                htmlFor="username" 
                className="block text-sm font-semibold text-gray-700 mb-2"
                style={{ color: '#252528' }}
              >
                사용자명
              </label>
              <input
                ref={usernameRef}
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleUsernameKeyDown}
                className="input"
                placeholder="사용자명을 입력하세요"
                required
                disabled={isLoading}
                aria-describedby="username-help"
                aria-label="사용자명 입력 후 엔터를 누르면 비밀번호 입력란으로 이동합니다."
                autoComplete="username"
                tabIndex={1}
              />
              <div id="username-help" className="sr-only">
                입력 후 엔터를 누르면 비밀번호 입력란으로 이동합니다.
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div className="mb-6">
              <label 
                htmlFor="password" 
                className="block text-sm font-semibold text-gray-700 mb-2"
                style={{ color: '#252528' }}
              >
                비밀번호
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  className="input pr-12"
                  placeholder="비밀번호를 입력하세요"
                  required
                  disabled={isLoading}
                  aria-describedby="password-help"
                  aria-label="비밀번호 입력 후 엔터를 누르면 로그인됩니다."
                  autoComplete="current-password"
                  tabIndex={2}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors duration-200 p-1"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'}
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div id="password-help" className="sr-only">
                비밀번호를 입력하세요. 입력 후 엔터를 누르면 로그인됩니다.
              </div>
            </div>

            {/* 로그인 버튼 */}
            <button
              ref={submitRef}
              type="submit"
              className="btn w-full relative bg-primary-400 hover:bg-primary-500"
              disabled={isLoading || !username.trim() || !password.trim()}
              aria-describedby="login-button-help"
              aria-label="로그인 버튼. 사용자명과 비밀번호를 입력한 후 클릭하거나 비밀번호 입력 후 엔터를 누르세요."
              tabIndex={3}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" aria-hidden="true"></div>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
            <div id="login-button-help" className="sr-only">
              사용자명과 비밀번호를 입력한 후 이 버튼을 클릭하여 로그인하세요. 또는 비밀번호 입력 후 엔터를 누르세요.
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
