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

const handleSubmit = async (
  { difyFiles = [], text = '', isVoice = false }: { difyFiles?: any[], text?: string, isVoice?: boolean }
) => {
  const textToSubmit = text || inputText;

  // 에이전트 5번(문서 변환)인 경우 파일만 있으면 됨
  if (selectedAgentId === 5) {
    if (difyFiles.length === 0) return;
  } else {
    if (!textToSubmit.trim() && difyFiles.length === 0) return;
  }

  if (!hasStartedChat) setHasStartedChat(true);
  setIsProcessing(true);

  // 웰컴 화면에서 시작하거나 현재 세션이 없으면 항상 새 세션 생성
  let sessionId = currentSessionId;

  // 명시적으로 웰컴 화면에서 시작하는 경우 새 세션 강제 생성
  if (!currentSessionId) {
    sessionId = generateUUID();
    setCurrentSessionId(sessionId);
    console.log(`새 세션 생성 (세션 없음): ${sessionId}`);
  } else if (!hasStartedChat && currentSessionId) {
    // 웰컴 화면인데 이전 세션 ID가 남아있는 경우 - 새 세션으로 교체
    sessionId = generateUUID();
    setCurrentSessionId(sessionId);
    console.log(`새 세션 생성 (웰컴 화면에서 시작): ${sessionId}, 이전 세션: ${currentSessionId}`);
  }

  const content = textToSubmit.trim();

  // ⭐ 1) Dify에 보낼 agent_id / queryText 결정 로직 추가
  let agentIdToSend = selectedAgentId;
  let queryText = '';

  if (!content && difyFiles.length > 0) {
    // 👉 텍스트는 없고 파일만 있으면 “문서 변환 모드”로 간주
    agentIdToSend = 5;
    queryText = '시각장애인을 위한 문서 -> BRF 변환입니다. 시각장애인의 편의를 고려하세요.';
  } else {
    // 일반 채팅 / 음성인 경우
    queryText = content;
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    type: 'user',
    content: content,        // 화면에는 사용자가 입력한 텍스트만 보여주면 됨 (없으면 빈 문자열)
    timestamp: new Date(),
    isVoice: isVoice,
    files: difyFiles.map(file => ({
      id: file.upload_file_id,
      name: file.name || 'unknown file',
      type: file.type,
      mime_type: file.mime_type || 'application/octet-stream',
    })),
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

  // ⭐ 2) 텍스트가 있고, 문서 변환이 아닐 때만 /convert-to-braille 호출
  try {
    if (content && content.trim().length > 0 && agentIdToSend !== 5) {
      const brailleResponse = await fetch(`${getApiUrl()}/convert-to-braille`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });

      if (brailleResponse.ok) {
        const brailleData = await brailleResponse.json();
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessage.id
              ? { ...msg, braille: brailleData.braille }
              : msg,
          ),
        );
      }
    }
  } catch (error) {
    console.error('Braille conversion error:', error);
  }

  const assistantMessage: Message = {
    id: (Date.now() + 1).toString(),
    type: 'assistant',
    content: '',
    timestamp: new Date(),
  };

  try {
    // ⭐ 3) Dify에 보낼 files 형태를 Dify 스펙에 맞게 변환
    const filesForDify = difyFiles.map(file => ({
      type: 'document',                // ← HWP도 포함해서 문서로 간주
      transfer_method: 'local_file',
      upload_file_id: file.upload_file_id,
      name: file.name,
      mime_type: file.mime_type || 'application/octet-stream',
    }));

    const requestData = {
      query: queryText,                // ← 위에서 결정한 queryText
      conversation_id: sessionId || '',
      user: 'default-user',
      files: filesForDify,
      agent_id: agentIdToSend,         // ← 위에서 결정한 agentIdToSend
      is_voice: isVoice ? 1 : 0,
    };

    const apiUrl = getApiUrl();

    const response = await fetch(`${apiUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    let assistantContent = '';
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
                      : msg,
                  ),
                );
              } else if (data.event === 'message_end') {
                setIsStreaming(false);

                const brailleText = data.metadata?.braille;

                setMessages(prevMessages =>
                  prevMessages.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: assistantContent, braille: brailleText }
                      : msg,
                  ),
                );

                if (assistantContent.trim()) {
                  try {
                    console.log('어시스턴트 응답 완료, 대화 목록을 새로고침합니다.');
                    loadChatSessionsFromServer();

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
      assistantContent = '응답을 받지 못했습니다.';
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: assistantContent }
            : msg,
        ),
      );
    }

    return { userMessage, assistantMessage: { ...assistantMessage, content: assistantContent } };
  } catch (error) {
    console.error('API 호출 오류:', error);

    const errorContent = `죄송합니다. 서버와 통신 중 오류가 발생했습니다: ${
      error instanceof Error ? error.message : '알 수 없는 오류'
    }`;

    if (messages.some(msg => msg.id === assistantMessage?.id)) {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: errorContent }
            : msg,
        ),
      );
    } else {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorContent,
        timestamp: new Date(),
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