import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types';
import { generateUUID } from '@/utils/idUtils';
import { getApiUrl } from '@/utils/env';
import { AudioManager } from '@/utils/audioManager';

interface UseChatProps {
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  loadChatSessionsFromServer: () => void;
  selectedAgentId: number;
}

export const useChat = ({ currentSessionId, setCurrentSessionId, loadChatSessionsFromServer, selectedAgentId }: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async ({ difyFiles = [], text = '', isVoice = false }: { difyFiles?: any[], text?: string, isVoice?: boolean }) => {
    const textToSubmit = text || inputText;

    // 에이전트 5번(문서 변환)인 경우 파일만 있으면 됨
    if (selectedAgentId === 5) {
      if (difyFiles.length === 0) return;
    } else {
      if (!textToSubmit.trim() && difyFiles.length === 0) return;
    }

    if (!hasStartedChat) setHasStartedChat(true);
    setIsProcessing(true);

    let sessionId = currentSessionId;
    if (!currentSessionId) {
      sessionId = generateUUID();
      setCurrentSessionId(sessionId);
    }

    const content = textToSubmit.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date(),
      isVoice: isVoice,
      files: difyFiles.map(file => ({
        id: file.upload_file_id,
        name: file.name || 'unknown file',
        type: file.type,
        mime_type: file.mime_type || 'application/octet-stream'
      }))
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    if (!isVoice) {
      setInputText('');
    }

    // 점역 변환 에이전트(ID: 1)인 경우 3초 지연
    if (selectedAgentId === 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 사용자 입력 텍스트 점자 변환 API 호출
    try {
      const brailleResponse = await fetch(`${getApiUrl()}/convert-to-braille`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });
      if (brailleResponse.ok) {
        const brailleData = await brailleResponse.json();
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, braille: brailleData.braille } : msg
        ));
      }
    } catch (error) {
      console.error("Braille conversion error:", error);
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: "",
      timestamp: new Date()
    };

    try {
      // 에이전트 5번(문서 변환)인 경우 고정 메시지 사용
      const queryText = selectedAgentId === 5 
        ? "시각장애인을 위한 문서 -> BRF 변환입니다. 시각장애인의 편의를 고려하세요."
        : userMessage.content;

      const requestData = {
        query: queryText,
        conversation_id: sessionId || "",
        user: "default-user",
        files: difyFiles,
        agent_id: selectedAgentId,
        is_voice: isVoice ? 1 : 0
      };

      const apiUrl = getApiUrl();

      const response = await fetch(`${apiUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
      }

      let assistantContent = "";
      const messagesWithAssistant = [...updatedMessages, assistantMessage];
      setMessages(messagesWithAssistant);
      setIsStreaming(true);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('스트리밍 응답을 읽을 수 없습니다');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              try {
                const jsonStr = line.trim().substring(6);
                if (jsonStr.trim() === '') continue;

                const data = JSON.parse(jsonStr);

                if (data.event === 'message') {
                  const chunk = data.chunk || '';
                  assistantContent += chunk;

                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  );
                } else if (data.event === 'message_end') {
                  setIsStreaming(false);

                  // 메타데이터에서 점자 텍스트 추출
                  const brailleText = data.metadata?.braille;

                  // 최종 메시지 상태 업데이트 (점자 포함)
                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: assistantContent, braille: brailleText }
                        : msg
                    )
                  );

                  // TTS 미리 변환 (Ctrl+R 누를 때 즉시 재생하기 위해)
                  if (assistantContent.trim()) {
                    try {
                      // TTS 음성 파일 수신 후 대화 목록 새로고침
                      console.log('어시스턴트 응답 완료, 대화 목록을 새로고침합니다.');
                      loadChatSessionsFromServer();

                      // 응답 완료 시 미리 TTS 변환 (백그라운드에서 실행)
                      AudioManager.preConvertTextToSpeech(assistantContent);
                      console.log('TTS 미리 변환 요청 완료 - Ctrl+R로 즉시 재생 가능');
                    } catch (ttsError) {
                      console.error('TTS 처리 오류:', ttsError);
                    }
                  }
                } else if (data.event === 'error') {
                  throw new Error(`서버 오류: ${data.message || '알 수 없는 오류'}`);
                }
              } catch (parseError) {
                console.warn('JSON 파싱 오류:', parseError);
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        setIsStreaming(false);
      }

      if (!assistantContent) {
        assistantContent = "응답을 받지 못했습니다.";
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: assistantContent }
              : msg
          )
        );
      }

      return { userMessage, assistantMessage: { ...assistantMessage, content: assistantContent } };

    } catch (error) {
      console.error("API 호출 오류:", error);

      const errorContent = `죄송합니다. 서버와 통신 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;

      if (messages.some(msg => msg.id === assistantMessage?.id)) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: errorContent }
              : msg
          )
        );
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: errorContent,
          timestamp: new Date()
        };
        setMessages([...updatedMessages, errorMessage]);
      }

      return null;
    } finally {
      setIsProcessing(false);
    }
  };


  const resetChat = () => {
    setMessages([]);
    setHasStartedChat(false);
    setInputText('');
  };

  return {
    messages,
    setMessages,
    inputText,
    setInputText,
    isProcessing,
    isStreaming,
    hasStartedChat,
    setHasStartedChat,
    messagesEndRef,
    handleSubmit,
    resetChat
  };
};