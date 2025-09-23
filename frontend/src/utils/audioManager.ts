import { getApiUrl } from './env';

// 전역 오디오 재생 상태 관리
let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;

// TTS 캐시 관리
interface TTSCache {
  [key: string]: {
    audioUrl: string;
    timestamp: number;
  }
}

let ttsCache: TTSCache = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5분 캐시 유지

export const AudioManager = {
  // 현재 재생 상태 확인
  isPlaying: () => isPlaying,
  
  // 현재 오디오 중단
  stop: () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    isPlaying = false;
  },

  // 캐시 정리
  clearExpiredCache: () => {
    const now = Date.now();
    Object.keys(ttsCache).forEach(key => {
      if (now - ttsCache[key].timestamp > CACHE_EXPIRY_MS) {
        URL.revokeObjectURL(ttsCache[key].audioUrl);
        delete ttsCache[key];
      }
    });
  },

  // TTS 미리 변환 (캐싱용)
  preConvertTextToSpeech: async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const cacheKey = text.trim();
    
    // 이미 캐시에 있고 만료되지 않았으면 건너뛰기
    if (ttsCache[cacheKey] && (Date.now() - ttsCache[cacheKey].timestamp < CACHE_EXPIRY_MS)) {
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: 'alloy',
          speed: 1.0,
          format: 'mp3'
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 기존 캐시 항목이 있으면 정리
        if (ttsCache[cacheKey]) {
          URL.revokeObjectURL(ttsCache[cacheKey].audioUrl);
        }
        
        // 새로 캐시 저장
        ttsCache[cacheKey] = {
          audioUrl,
          timestamp: Date.now()
        };

        console.log(`TTS 미리 변환 완료: ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('TTS 미리 변환 오류:', error);
    }
  },

  // TTS 재생 (캐시 우선 사용)
  playTextToSpeech: async (text: string, forcePlay: boolean = false): Promise<boolean> => {
    try {
      if (!text.trim()) {
        console.log('재생할 텍스트가 없습니다.');
        const announceElement = document.getElementById('live-announcements');
        if (announceElement) {
          announceElement.textContent = '재생할 텍스트가 없습니다.';
        }
        return false;
      }

      // 이미 재생 중인 오디오가 있으면 중단 (forcePlay가 true가 아닌 경우)
      if (isPlaying && currentAudio && !forcePlay) {
        console.log('이미 오디오가 재생 중입니다.');
        const announceElement = document.getElementById('live-announcements');
        if (announceElement) {
          announceElement.textContent = '이미 음성이 재생 중입니다. 잠시만 기다려 주세요.';
        }
        return false;
      }

      // 기존 재생 중인 오디오 중단
      AudioManager.stop();
      isPlaying = true;

      const cacheKey = text.trim();
      let audioUrl: string;

      // 캐시에서 먼저 확인
      if (ttsCache[cacheKey] && (Date.now() - ttsCache[cacheKey].timestamp < CACHE_EXPIRY_MS)) {
        audioUrl = ttsCache[cacheKey].audioUrl;
        console.log('캐시된 TTS 사용 중...');
      } else {
        // 캐시에 없으면 새로 변환
        console.log('새 TTS 변환 중...');
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            voice: 'alloy',
            speed: 1.0,
            format: 'mp3'
          })
        });

        if (!response.ok) {
          console.error('TTS 요청 실패:', response.status);
          isPlaying = false;
          const announceElement = document.getElementById('live-announcements');
          if (announceElement) {
            announceElement.textContent = '음성 재생에 실패했습니다.';
          }
          return false;
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);

        // 새로 변환한 것을 캐시에 저장
        if (ttsCache[cacheKey]) {
          URL.revokeObjectURL(ttsCache[cacheKey].audioUrl);
        }
        ttsCache[cacheKey] = {
          audioUrl,
          timestamp: Date.now()
        };
      }

      // 오디오 재생
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      
      // 재생 완료 후 상태 정리 (캐시는 유지)
      audio.addEventListener('ended', () => {
        currentAudio = null;
        isPlaying = false;
        // 주의: audioUrl은 revokeObjectURL하지 않음 (캐시 유지)
      });

      // 오류 처리
      audio.addEventListener('error', (e) => {
        console.error('오디오 재생 오류:', e);
        currentAudio = null;
        isPlaying = false;
      });

      // 음성 재생
      await audio.play();
      
      // 접근성을 위한 라이브 영역 안내
      const announceElement = document.getElementById('live-announcements');
      if (announceElement) {
        announceElement.textContent = '텍스트 음성 재생을 시작합니다.';
      }
      
      return true;

    } catch (error) {
      console.error('TTS 처리 중 오류:', error);
      isPlaying = false;
      const announceElement = document.getElementById('live-announcements');
      if (announceElement) {
        announceElement.textContent = '음성 재생 중 오류가 발생했습니다.';
      }
      return false;
    }
  }
};