import { useState, useCallback, useEffect, useMemo } from 'react';
import { ChatSession, Message } from '@/types';
import { generateChatTitle } from '@/utils/chatUtils';
import { getApiUrl } from '@/utils/env';

export const useChatSessions = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const loadChatSessionsFromServer = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/conversations?user=default-user&limit=50`);
      if (response.ok) {
        const data = await response.json();
        const serverSessions = data.data.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          timestamp: new Date(conv.timestamp * 1000),
          lastMessage: '',
          messages: []
        }));
        
        serverSessions.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
        setChatSessions(serverSessions);
        console.log(`서버에서 ${serverSessions.length}개의 대화 세션을 불러왔습니다.`);
      } else {
        console.warn('서버에서 대화 목록을 불러오는데 실패했습니다. 로컬 저장소를 사용합니다.');
        loadChatSessionsFromLocalStorage();
      }
    } catch (error) {
      console.error('서버 대화 목록 로드 오류:', error);
      loadChatSessionsFromLocalStorage();
    }
  }, []);

  const loadChatSessionsFromLocalStorage = useCallback(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      const parsedSessions = sessions.map((session: any) => ({
        ...session,
        timestamp: new Date(session.timestamp),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      
      parsedSessions.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
      setChatSessions(parsedSessions);
      console.log(`로컬 저장소에서 ${parsedSessions.length}개의 대화 세션을 불러왔습니다.`);
    }
  }, []);

  useEffect(() => {
    loadChatSessionsFromServer();
  }, [loadChatSessionsFromServer]);

  const saveChatSessions = useCallback((sessions: ChatSession[]) => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
    setChatSessions(sessions);
  }, []);

  const loadMessagesFromServer = useCallback(async (sessionId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/conversations/${sessionId}/messages?user=default-user&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const serverMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.timestamp * 1000),
          isVoice: msg.isVoice || false,
          files: msg.files || []
        }));
        console.log(`서버에서 ${serverMessages.length}개의 메시지를 불러왔습니다.`);
        return serverMessages;
      } else {
        console.warn(`대화 ${sessionId}의 메시지를 서버에서 불러오는데 실패했습니다.`);
        return [];
      }
    } catch (error) {
      console.error('서버 메시지 로드 오류:', error);
      return [];
    }
  }, []);

  const selectChatSession = useCallback(async (sessionId: string, currentMessages: Message[]) => {
    if (currentSessionId === sessionId) {
      console.log('이미 선택된 대화입니다. 동작하지 않습니다.');
      return null;
    }

    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      // 현재 대화 저장
      if (currentSessionId && currentMessages.length > 0) {
        const currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (currentSession) {
          const updatedSession = {
            ...currentSession,
            messages: currentMessages,
            lastMessage: currentMessages[currentMessages.length - 1]?.content || ''
          };
          const updatedSessions = chatSessions.map(s =>
            s.id === currentSessionId ? updatedSession : s
          );
          localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
          setChatSessions(updatedSessions);
        }
      }

      setCurrentSessionId(sessionId);

      // 로컬에 저장된 메시지가 있는지 확인
      if (session.messages && session.messages.length > 0) {
        console.log('로컬에 저장된 메시지를 사용합니다.');
        return session.messages;
      } else {
        // 서버에서 메시지 로드
        console.log('서버에서 메시지를 불러옵니다...');
        const serverMessages = await loadMessagesFromServer(sessionId);
        
        if (serverMessages.length > 0) {
          const updatedSession = {
            ...session,
            messages: serverMessages,
            lastMessage: serverMessages[serverMessages.length - 1]?.content || ''
          };
          const updatedSessions = chatSessions.map(s =>
            s.id === sessionId ? updatedSession : s
          );
          setChatSessions(updatedSessions);
        }
        
        return serverMessages;
      }
    }
    return null;
  }, [currentSessionId, chatSessions, loadMessagesFromServer]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: "default-user" })
      });

      if (response.ok) {
        console.log(`대화 ${sessionId}가 성공적으로 삭제되었습니다.`);

        const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
        setChatSessions(updatedSessions);
        localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));

        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          return true; // 현재 세션이 삭제됨을 알림
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `대화 삭제 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('대화 삭제 오류:', error);
      alert(`대화 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
    return false;
  }, [currentSessionId, chatSessions]);

  const saveOrUpdateSession = useCallback(async (sessionId: string, messages: Message[]) => {
    if (!sessionId || messages.length === 0) return;

    const existingSession = chatSessions.find(s => s.id === sessionId);
    const sessionTitle = existingSession?.title || generateChatTitle(messages[0]?.content || '새 대화');

    const sessionData: ChatSession = {
      id: sessionId,
      title: sessionTitle,
      timestamp: new Date(),
      lastMessage: messages[messages.length - 1]?.content || '',
      messages: messages
    };

    const updatedSessions = existingSession
      ? chatSessions.map(s => s.id === sessionId ? sessionData : s)
      : [sessionData, ...chatSessions]; // 새 세션을 맨 앞에 추가

    // 즉시 UI 업데이트
    setChatSessions(updatedSessions);
    saveChatSessions(updatedSessions);
    
    // Dify가 대화를 처리할 시간을 주기 위해 약간의 딜레이 후 목록 새로고침
    setTimeout(() => {
      loadChatSessionsFromServer();
    }, 500);
  }, [chatSessions, saveChatSessions, loadChatSessionsFromServer]);

  const addNewSession = useCallback((sessionId: string, firstMessage: Message) => {
    const sessionTitle = generateChatTitle(firstMessage.content || '새 대화');
    
    const newSessionData: ChatSession = {
      id: sessionId,
      title: sessionTitle,
      timestamp: new Date(),
      lastMessage: firstMessage.content || '',
      messages: [firstMessage]
    };

    const updatedSessions = [newSessionData, ...chatSessions];
    setChatSessions(updatedSessions);
    saveChatSessions(updatedSessions);
    
    console.log(`새 세션 ${sessionId}가 대화목록에 추가되었습니다.`);
  }, [chatSessions, saveChatSessions]);

  const startNewChat = useCallback(() => {
    setCurrentSessionId(null);
  }, []);

  const sortedChatSessions = useMemo(() =>
    [...chatSessions].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ), [chatSessions]
  );

  return {
    chatSessions: sortedChatSessions,
    currentSessionId,
    setCurrentSessionId,
    selectChatSession,
    handleDeleteSession,
    saveOrUpdateSession,
    addNewSession,
    startNewChat,
    loadChatSessionsFromServer
  };
};