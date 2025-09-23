/**
 * 접근성 유틸리티 함수들
 * WCAG 2.1 AA 표준을 준수하여 스크린 리더 사용자를 위한 기능들을 제공
 */

// Live Region 타입 정의
export type LiveRegionType = 'polite' | 'assertive';

/**
 * 스크린 리더에게 메시지를 실시간으로 알리는 함수
 * @param message - 알릴 메시지
 * @param type - 알림 중요도 ('polite' | 'assertive')
 * @param delay - 알림 지연시간 (ms, 기본값: 100)
 */
export const announceToScreenReader = (
  message: string, 
  type: LiveRegionType = 'polite',
  delay: number = 100
): void => {
  if (!message.trim()) return;

  setTimeout(() => {
    const regionId = type === 'assertive' 
      ? 'live-announcements-assertive' 
      : 'live-announcements';
    
    const announceElement = document.getElementById(regionId);
    if (announceElement) {
      // 기존 내용을 지우고 새 메시지 설정
      announceElement.textContent = '';
      setTimeout(() => {
        announceElement.textContent = message;
      }, 50);
    }
  }, delay);
};

/**
 * 파일 업로드 상태를 스크린 리더에게 알리는 함수
 * @param fileName - 파일명
 * @param status - 업로드 상태
 * @param progress - 진행률 (0-100)
 */
export const announceFileUploadStatus = (
  fileName: string,
  status: 'uploading' | 'success' | 'error',
  progress?: number
): void => {
  let message = '';
  
  switch (status) {
    case 'uploading':
      message = progress !== undefined 
        ? `${fileName} 파일 업로드 진행 중: ${progress}%`
        : `${fileName} 파일 업로드를 시작합니다`;
      announceToScreenReader(message, 'polite');
      break;
    case 'success':
      message = `${fileName} 파일이 성공적으로 업로드되었습니다`;
      announceToScreenReader(message, 'polite');
      break;
    case 'error':
      message = `${fileName} 파일 업로드에 실패했습니다. 다시 시도해주세요`;
      announceToScreenReader(message, 'assertive');
      break;
  }
};

/**
 * 에이전트 선택 상태를 스크린 리더에게 알리는 함수
 * @param agentName - 에이전트 이름
 * @param description - 에이전트 설명
 * @param isSelected - 선택 여부
 */
export const announceAgentSelection = (
  agentName: string,
  description: string,
  isSelected: boolean
): void => {
  const message = isSelected 
    ? `${agentName} 모드가 선택되었습니다. ${description}`
    : `${agentName} 모드 선택이 해제되었습니다`;
  
  announceToScreenReader(message, 'polite');
};

/**
 * 음성 녹음 상태를 스크린 리더에게 알리는 함수
 * @param status - 녹음 상태
 * @param additionalInfo - 추가 정보
 */
export const announceRecordingStatus = (
  status: 'start' | 'stop' | 'error' | 'permission_denied',
  additionalInfo?: string
): void => {
  let message = '';
  let type: LiveRegionType = 'polite';
  
  switch (status) {
    case 'start':
      message = '음성 녹음이 시작되었습니다. 말씀해주세요';
      break;
    case 'stop':
      message = '음성 녹음이 중지되었습니다. 텍스트로 변환 중입니다';
      break;
    case 'error':
      message = `음성 녹음 중 오류가 발생했습니다. ${additionalInfo || '다시 시도해주세요'}`;
      type = 'assertive';
      break;
    case 'permission_denied':
      message = '마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요';
      type = 'assertive';
      break;
  }
  
  announceToScreenReader(message, type);
};

/**
 * 메시지 처리 상태를 스크린 리더에게 알리는 함수
 * @param status - 처리 상태
 * @param additionalInfo - 추가 정보
 */
export const announceMessageStatus = (
  status: 'processing' | 'completed' | 'error',
  additionalInfo?: string
): void => {
  let message = '';
  let type: LiveRegionType = 'polite';
  
  switch (status) {
    case 'processing':
      message = 'AI가 응답을 생성하고 있습니다. 잠시만 기다려주세요';
      break;
    case 'completed':
      message = 'AI 응답이 완료되었습니다';
      break;
    case 'error':
      message = `메시지 처리 중 오류가 발생했습니다. ${additionalInfo || '다시 시도해주세요'}`;
      type = 'assertive';
      break;
  }
  
  announceToScreenReader(message, type);
};

/**
 * 키보드 단축키 도움말을 스크린 리더에게 알리는 함수
 */
export const announceKeyboardShortcuts = (): void => {
  const shortcuts = [
    '스페이스바 두 번: 음성 녹음 시작/중지',
    '컨트롤 플러스 O: 파일 선택',
    '컨트롤 플러스 R: 텍스트 음성 재생',
    '탭 키: 다음 요소로 이동',
    '시프트 플러스 탭: 이전 요소로 이동'
  ];
  
  const message = `사용 가능한 키보드 단축키: ${shortcuts.join(', ')}`;
  announceToScreenReader(message, 'polite', 500);
};

/**
 * 에러 메시지를 접근성에 맞게 포맷하는 함수
 * @param error - 에러 객체 또는 메시지
 * @param context - 에러가 발생한 컨텍스트
 * @returns 접근성에 맞게 포맷된 에러 메시지
 */
export const formatAccessibleErrorMessage = (
  error: Error | string,
  context?: string
): string => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const contextPrefix = context ? `${context} 중 ` : '';
  
  return `오류 발생: ${contextPrefix}${errorMessage}. 문제가 지속되면 페이지를 새로고침하거나 관리자에게 문의하세요.`;
};

/**
 * 진행률을 접근성에 맞게 포맷하는 함수
 * @param current - 현재 값
 * @param total - 전체 값
 * @param unit - 단위 (기본값: '개')
 * @returns 접근성에 맞게 포맷된 진행률 메시지
 */
export const formatProgressMessage = (
  current: number,
  total: number,
  unit: string = '개'
): string => {
  const percentage = Math.round((current / total) * 100);
  return `진행률: 전체 ${total}${unit} 중 ${current}${unit} 완료, 백분율 ${percentage}퍼센트`;
};

/**
 * 시간을 접근성에 맞게 포맷하는 함수
 * @param date - 날짜 객체
 * @returns 접근성에 맞게 포맷된 시간 문자열
 */
export const formatAccessibleDateTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return '방금 전';
  } else if (minutes < 60) {
    return `${minutes}분 전`;
  } else if (hours < 24) {
    return `${hours}시간 전`;
  } else if (days < 7) {
    return `${days}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * 포커스를 안전하게 설정하는 함수
 * @param elementId - 포커스할 요소의 ID
 * @param delay - 포커스 지연시간 (ms, 기본값: 100)
 */
export const focusElement = (elementId: string, delay: number = 100): void => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          if (typeof element.focus === 'function') {
            element.focus({ preventScroll: true });
            
            const elementLabel = element.getAttribute('aria-label') || 
                                element.getAttribute('title') || 
                                element.textContent?.substring(0, 50) || 
                                '요소';
            announceToScreenReader(`${elementLabel}로 포커스가 이동되었습니다`, 'polite', 50);
          }
        }, delay);
        observer.unobserve(element); // 포커스 후 관찰 중지
      }
    });
  }, {
    root: null, // 뷰포트를 기준으로
    threshold: 0.1 // 10% 이상 보일 때
  });

  observer.observe(element);
};

/**
 * 동적으로 생성된 콘텐츠를 스크린 리더에게 알리는 함수
 * @param type - 콘텐츠 타입
 * @param count - 개수
 * @param description - 설명
 */
export const announceDynamicContent = (
  type: 'messages' | 'files' | 'results' | 'options',
  count: number,
  description?: string
): void => {
  let message = '';
  
  switch (type) {
    case 'messages':
      message = `새로운 메시지 ${count}개가 추가되었습니다`;
      break;
    case 'files':
      message = `파일 ${count}개가 ${description || '처리되었습니다'}`;
      break;
    case 'results':
      message = `검색 결과 ${count}개를 찾았습니다`;
      break;
    case 'options':
      message = `선택 가능한 옵션 ${count}개가 있습니다`;
      break;
  }
  
  if (description && type !== 'files') {
    message += `. ${description}`;
  }
  
  announceToScreenReader(message, 'polite');
};