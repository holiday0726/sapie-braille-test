/**
 * 인증 관련 유틸리티 함수들
 */

export const getLoggedInUser = (): string => {
  if (typeof window === 'undefined') return 'default-user'
  
  const username = localStorage.getItem('username')
  return username || 'default-user'
}

export const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  
  const token = localStorage.getItem('accessToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return localStorage.getItem('isLoggedIn') === 'true' && !!localStorage.getItem('accessToken')
}
