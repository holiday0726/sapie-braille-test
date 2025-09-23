import { useEffect, useCallback } from 'react';
import { AudioManager } from '@/utils/audioManager';

interface UseKeyboardShortcutsProps {
  messages?: any[];
  inputText?: string;
}

export const useKeyboardShortcuts = ({ messages = [], inputText = '' }: UseKeyboardShortcutsProps) => {
  
  const playTextToSpeech = useCallback(async (text: string, forcePlay: boolean = false) => {
    return await AudioManager.playTextToSpeech(text, forcePlay);
  }, []);

  const getTextToRead = useCallback(() => {
    // 1. 현재 입력 중인 텍스트가 있으면 우선 읽기
    if (inputText.trim()) {
      return inputText;
    }

    // 2. 메시지 배열이 비어있는 경우
    if (!messages || messages.length === 0) {
      return '';
    }

    // 3. 가장 최근 어시스턴트 메시지 읽기 (type 또는 role 둘 다 확인)
    const lastAssistantMessage = messages
      .filter(msg => (msg.role === 'assistant' || msg.type === 'assistant') && msg.content?.trim())
      .pop();
    
    if (lastAssistantMessage) {
      return lastAssistantMessage.content;
    }

    // 4. 가장 최근 사용자 메시지 읽기 (type 또는 role 둘 다 확인)
    const lastUserMessage = messages
      .filter(msg => (msg.role === 'user' || msg.type === 'user') && msg.content?.trim())
      .pop();
    
    if (lastUserMessage) {
      return lastUserMessage.content;
    }

    // 5. 읽을 내용이 없는 경우
    return '';
  }, [messages, inputText]);

  const handleCtrlR = useCallback(() => {
    const textToRead = getTextToRead();
    if (textToRead.trim()) {
      // Ctrl+R은 강제 재생 모드 - 현재 재생 중인 오디오 중단하고 새로 재생
      playTextToSpeech(textToRead, true);
    } else {
      // 읽을 텍스트가 없는 경우 안내 메시지
      const announceElement = document.getElementById('live-announcements');
      if (announceElement) {
        announceElement.textContent = '읽을 텍스트가 없습니다. 먼저 대화를 시작해주세요.';
      }
    }
  }, [getTextToRead, playTextToSpeech]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+R 키 조합 처리
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault(); // 브라우저 새로고침 방지
        
        // 중복 실행 방지를 위한 디바운싱
        const textToRead = messages && inputText !== undefined ? 
          (inputText.trim() || 
           messages.filter(msg => (msg.role === 'assistant' || msg.type === 'assistant') && msg.content?.trim()).pop()?.content ||
           messages.filter(msg => (msg.role === 'user' || msg.type === 'user') && msg.content?.trim()).pop()?.content ||
           '') : '';
           
        if (textToRead.trim()) {
          playTextToSpeech(textToRead, true);
        } else {
          const announceElement = document.getElementById('live-announcements');
          if (announceElement) {
            announceElement.textContent = '읽을 텍스트가 없습니다. 먼저 대화를 시작해주세요.';
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [messages, inputText, playTextToSpeech]); // 의존성을 직접적인 값들로 변경

  return {
    playTextToSpeech,
    getTextToRead,
    handleCtrlR
  };
};