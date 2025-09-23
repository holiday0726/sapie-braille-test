'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginScreen } from '@/components/LoginScreen'
import { getApiUrl } from '@/utils/env'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true)
    setError('')

    try {
      const apiUrl = getApiUrl()
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        })
      })

      const data = await response.json()

      if (response.ok) {
        // 로그인 성공
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('username', data.username)
        localStorage.setItem('accessToken', data.access_token)
        sessionStorage.setItem('justLoggedIn', 'true'); // sessionStorage에 로그인 상태 기록
        
        // 메인 페이지에서 통합 안내를 하므로 여기서는 알림을 제거합니다.
        
        // 페이지 이동 지연시간을 줄여 더 빠른 화면 전환을 제공합니다.
        setTimeout(() => {
          router.push('/')
        }, 200)
      } else {
        // 로그인 실패
        setError(data.detail || '로그인에 실패했습니다.')
        
        // 라이브 영역에 오류 메시지 알림
        const announceElement = document.getElementById('login-announcements')
        if (announceElement) {
          announceElement.textContent = `로그인 실패: ${data.detail || '로그인에 실패했습니다.'}`
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = '서버 연결에 실패했습니다. 네트워크를 확인해 주세요.'
      setError(errorMessage)
      
      // 라이브 영역에 오류 메시지 알림
      const announceElement = document.getElementById('login-announcements')
      if (announceElement) {
        announceElement.textContent = `오류: ${errorMessage}`
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <LoginScreen 
        onLogin={handleLogin}
        isLoading={isLoading}
        error={error}
      />
      
      {/* 라이브 영역 - 로그인 상태 알림 */}
      <div 
        id="login-announcements" 
        aria-live="assertive" 
        aria-atomic="true" 
        className="sr-only"
      ></div>
    </>
  )
}
