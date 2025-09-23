import React from 'react'

interface SpacebarIndicatorProps {
  isHolding: boolean
  isRecording: boolean
  holdProgress: number
  waitingForSecondClick?: boolean
  mode?: 'hold' | 'double-tap'
}

// 원형 프로그레스바 컴포넌트
const CircularProgress: React.FC<{ progress: number; size: number; color: 'orange' | 'teal' }> = ({ progress, size, color }) => {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const strokeColorUrl = color === 'orange' ? 'url(#orangeGradient)' : 'url(#tealGradient)'
  const bgColor = color === 'orange' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(45, 212, 191, 0.2)'

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        role="img"
        aria-label={`녹음 진행률 ${progress.toFixed(0)}퍼센트`}
        aria-hidden="false"
      >
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* 진행률 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColorUrl}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-150 ease-linear drop-shadow-lg"
        />
        {/* 그라디언트 정의 */}
        <defs>
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5eead4" /> 
            <stop offset="50%" stopColor="#2dd4bf" /> 
            <stop offset="100%" stopColor="#06b6d4" /> 
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export const SpacebarIndicator: React.FC<SpacebarIndicatorProps> = ({
  isHolding,
  isRecording,
  holdProgress,
  waitingForSecondClick = false,
  mode = 'hold'
}) => {
  // 한 번만 눌렀을 때(waitingForSecondClick)는 UI 표시 안 함
  if (!isHolding && !isRecording) {
    return null
  }

  const progress = isRecording ? 100 : (waitingForSecondClick ? 25 : holdProgress)

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="false"
      aria-label="음성 녹음 상태 표시"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-col items-center transition-opacity duration-300">
        {/* 프로그레스바 컨테이너 */}
        <div className="relative w-48 h-48" role="progressbar" aria-label="녹음 진행 상태">
          <CircularProgress 
            progress={progress} 
            size={192} 
            color={'orange'} 
          />
          
          {/* 중앙 콘텐츠 */}
          <div className={`absolute inset-0 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300
            bg-gradient-to-br from-orange-300/20 to-amber-400/20 shadow-2xl shadow-orange-400/20`
          }>
            <div className="flex flex-col items-center">
              
              {isRecording ? (
                <div 
                  className="text-white text-2xl font-bold animate-pulse"
                  role="status"
                  aria-label="현재 음성 녹음 중"
                >
                  녹음 중
                </div>
              ) : waitingForSecondClick ? (
                <div 
                  className="text-white text-lg font-bold animate-pulse"
                  role="status"
                  aria-label="두 번째 클릭 대기 중"
                >
                  한 번 더 클릭
                </div>
              ) : (
                <div 
                  className="text-white text-3xl font-bold"
                >
                  {Math.round(holdProgress)}%
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 하단 안내 텍스트 */}
        <p
          className="text-white text-md mt-6 px-6 py-3 rounded-full border border-white/10 shadow-lg font-semibold transition-all duration-300 bg-black/10 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-label={isRecording ? '음성 녹음 중' : '녹음 준비 중'}
        >
          {isRecording 
            ? '스페이스바를 다시 두 번 눌러 종료하세요'
            : '스페이스바를 두 번 연속 누르세요'
          }
        </p>
      </div>
    </div>
  )
}
