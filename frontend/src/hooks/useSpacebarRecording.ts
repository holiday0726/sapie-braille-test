import { useEffect, useRef, useState, useCallback } from 'react'

type RecordingMode = 'hold' | 'double-tap'

interface UseSpacebarRecordingProps {
  onStartRecording: () => void
  onStopRecording: () => void
  holdDuration?: number // milliseconds
  mode?: RecordingMode // 'hold' | 'double-tap'
  doubleClickThreshold?: number // milliseconds for double-tap mode
}

export const useSpacebarRecording = ({
  onStartRecording,
  onStopRecording,
  holdDuration = 2000, // 기본 2초
  mode = 'hold', // 기본값은 기존 hold 모드
  doubleClickThreshold = 450 // 더블 클릭 감지 임계값 (ms)
}: UseSpacebarRecordingProps) => {
  const [isHolding, setIsHolding] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [waitingForSecondClick, setWaitingForSecondClick] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // 더블 클릭 감지를 위한 ref
  const lastSpaceTimeRef = useRef<number>(0)
  
  // 콜백과 상태를 ref에 저장하여 stale closure 방지
  const callbacksRef = useRef({ onStartRecording, onStopRecording })
  const stateRef = useRef({ isHolding, isRecording, waitingForSecondClick })

  useEffect(() => {
    callbacksRef.current = { onStartRecording, onStopRecording }
  }, [onStartRecording, onStopRecording])

  useEffect(() => {
    stateRef.current = { isHolding, isRecording, waitingForSecondClick }
  }, [isHolding, isRecording, waitingForSecondClick])

  // 음성 피드백 함수 - 더 긴 띠링 소리
  const playAudioFeedback = useCallback((isStart: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // 녹음 시작: 높은 톤 (2톤 상승), 녹음 종료: 낮은 톤 (2톤 하강) - 더 긴 지속시간
      const startFreq = isStart ? 1000 : 400
      const endFreq = isStart ? 1000 : 400
      const duration = 0.7

      oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + duration)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      oscillator.type = 'sine'
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      
      // AudioContext 정리
      setTimeout(() => {
        audioContext.close()
      }, duration * 1000 + 100)
    } catch (error) {
      console.warn('Audio feedback not available:', error)
    }
  }, [])

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (doubleClickTimerRef.current) {
      clearTimeout(doubleClickTimerRef.current)
      doubleClickTimerRef.current = null
    }
  }, [])

  // 더블 클릭 모드 헬퍼 함수
  const handleDoubleClick = useCallback(() => {
    const { isRecording } = stateRef.current
    
    if (isRecording) {
      // 녹음 중이면 종료
      setIsRecording(false)
      playAudioFeedback(false) // 종료 소리
      callbacksRef.current.onStopRecording()
    } else {
      // 녹음 시작
      setIsRecording(true)
      playAudioFeedback(true) // 시작 소리
      callbacksRef.current.onStartRecording()
    }
    setWaitingForSecondClick(false)
  }, [playAudioFeedback])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return

      const activeElement = document.activeElement as HTMLElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        return
      }
      
      event.preventDefault()

      if (mode === 'double-tap') {
        // 더블 탭 모드 로직
        const now = Date.now()
        const timeSinceLastSpace = now - lastSpaceTimeRef.current
        
        if (timeSinceLastSpace < doubleClickThreshold && stateRef.current.waitingForSecondClick) {
          // 더블 클릭 감지됨
          clearTimeout(doubleClickTimerRef.current!)
          handleDoubleClick()
        } else {
          // 첫 번째 클릭
          setWaitingForSecondClick(true)
          lastSpaceTimeRef.current = now
          
          // 대기 타이머 설정
          doubleClickTimerRef.current = setTimeout(() => {
            setWaitingForSecondClick(false)
          }, doubleClickThreshold)
        }
      } else {
        // 기존 Hold 모드 로직 - 주석 처리 (더블클릭과 공존 불가능)
        /*
        // ref를 사용하여 최신 상태 값으로 확인
        if (stateRef.current.isRecording || stateRef.current.isHolding) return

        const startTime = Date.now()
        setIsHolding(true)
        setHoldProgress(0)

        progressIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const progress = Math.min((elapsed / holdDuration) * 100, 100)
          setHoldProgress(progress)
        }, 50)

        timerRef.current = setTimeout(() => {
          clearAllTimers()
          setIsHolding(false)
          setIsRecording(true)
          callbacksRef.current.onStartRecording()
        }, holdDuration)
        */
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      
      // 더블 탭 모드에서는 keyUp 이벤트 무시
      if (mode === 'double-tap') return
      
      event.preventDefault()
      
      // Hold 모드 로직 주석 처리
      /*
      clearAllTimers()

      if (stateRef.current.isRecording) {
        setIsRecording(false)
        callbacksRef.current.onStopRecording()
      }
      
      if (stateRef.current.isHolding) {
        setIsHolding(false)
        setHoldProgress(0)
      }
      */
    }

    const handleBlur = () => {
      clearAllTimers()
      if (stateRef.current.isRecording) {
        setIsRecording(false)
        callbacksRef.current.onStopRecording()
      }
      if (stateRef.current.isHolding) {
        setIsHolding(false)
        setHoldProgress(0)
      }
      if (stateRef.current.waitingForSecondClick) {
        setWaitingForSecondClick(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      clearAllTimers()
    }
  }, [holdDuration, mode, doubleClickThreshold, clearAllTimers, handleDoubleClick])

  return {
    isHolding,
    isRecording,
    holdProgress,
    waitingForSecondClick,
    mode
  }
}
