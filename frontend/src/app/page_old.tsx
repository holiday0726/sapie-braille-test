'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { useSpacebarRecording } from '@/hooks/useSpacebarRecording'
import { SpacebarIndicator } from '@/components/SpacebarIndicator'
// 🔒 보안 개선: AWS SDK 제거 (Asset Service 사용)
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { getApiUrl } from '@/utils/env'

interface DifyFile {
  id: string;
  name: string;
  type: string;
  mime_type: string;
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isVoice?: boolean
  files?: DifyFile[]
}

interface ChatSession {
  id: string
  title: string
  timestamp: Date
  lastMessage: string
  messages: Message[]
}

// 파일 아이콘을 반환하는 헬퍼 함수
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (fileType.startsWith('audio/')) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    );
  }
  if (fileType === 'application/pdf' || fileType.startsWith('text/')) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
};

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // 사이드바 관련 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 🔒 보안 개선: AWS 설정을 백엔드 Asset Service로 이전
  // AWS 자격 증명은 클라이언트에 노출되지 않도록 백엔드에서 처리합니다.

  // 마이크 권한 확인 로직
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        // 권한을 요청하거나, 이미 있다면 스트림을 가져옴
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 스트림을 즉시 중지하여 실제로 사용하지 않도록 함 (권한 확인 목적)
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
      } catch (error) {
        console.error("마이크 권한이 거부되었습니다.", error);
        setMicPermissionGranted(false);
      }
    };

    checkMicPermission();
  }, []); // 빈 배열로 마운트 시 한 번만 실행

  // Ctrl+O 파일 열기 단축키
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'o') {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 서버에서 대화 세션 불러오기 (Dify API 통해)
  const loadChatSessionsFromServer = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/conversations?user=default-user&limit=50`)
      if (response.ok) {
        const data = await response.json()
        const serverSessions = data.data.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          timestamp: new Date(conv.timestamp * 1000), // unix timestamp를 Date로 변환
          lastMessage: '', // 서버에서는 lastMessage를 별도로 제공하지 않음
          messages: [] // 메시지는 별도 API로 로드
        }))
        // 추가 안전 정렬: 최신 순으로 정렬 (내림차순)
        serverSessions.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())
        setChatSessions(serverSessions)
        console.log(`서버에서 ${serverSessions.length}개의 대화 세션을 불러왔습니다.`)
      } else {
        console.warn('서버에서 대화 목록을 불러오는데 실패했습니다. 로컬 저장소를 사용합니다.')
        loadChatSessionsFromLocalStorage()
      }
    } catch (error) {
      console.error('서버 대화 목록 로드 오류:', error)
      // 서버 연결 실패 시 로컬 저장소 사용
      loadChatSessionsFromLocalStorage()
    }
  }, [])

  // 로컬스토리지에서 대화 세션 불러오기 (폴백용)
  const loadChatSessionsFromLocalStorage = useCallback(() => {
    const savedSessions = localStorage.getItem('chatSessions')
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions)
      // Date 객체로 변환
      const parsedSessions = sessions.map((session: any) => ({
        ...session,
        timestamp: new Date(session.timestamp),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }))
      // 로컬 저장소에서도 최신 순으로 정렬 (내림차순)
      parsedSessions.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())
      setChatSessions(parsedSessions)
      console.log(`로컬 저장소에서 ${parsedSessions.length}개의 대화 세션을 불러왔습니다.`)
    }
  }, [])

  // 컴포넌트 마운트 시 서버에서 대화 목록 로드
  useEffect(() => {
    loadChatSessionsFromServer()
  }, [loadChatSessionsFromServer])

  // 대화 세션 저장
  const saveChatSessions = useCallback((sessions: ChatSession[]) => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions))
    setChatSessions(sessions)
  }, [])

  // 대화 제목 자동 생성
  const generateChatTitle = (firstMessage: string): string => {
    if (firstMessage.length <= 30) {
      return firstMessage
    }
    return firstMessage.substring(0, 30) + '...'
  }

  // 새 대화 시작
  const startNewChat = useCallback(() => {
    console.log('=== START NEW CHAT ===')
    console.log('Previous currentSessionId:', currentSessionId)
    console.log('Previous messages count:', messages.length)

    // 현재 대화가 있다면 저장
    if (currentSessionId && messages.length > 0) {
      console.log('Saving current session before starting new chat')
      const currentSession = chatSessions.find(s => s.id === currentSessionId)
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages,
          lastMessage: messages[messages.length - 1]?.content || '',
          timestamp: new Date()
        }
        const updatedSessions = chatSessions.map(s =>
          s.id === currentSessionId ? updatedSession : s
        )
        saveChatSessions(updatedSessions)
      }
    }

    // 새 대화 초기화
    console.log('Initializing new chat state')
    setMessages([])
    setHasStartedChat(false)
    setCurrentSessionId(null) // 세션 ID 초기화
    setInputText('')
    setSelectedFile(null)
    setIsSidebarOpen(false)

    console.log('=== NEW CHAT INITIALIZED ===')
  }, [currentSessionId, messages, chatSessions, saveChatSessions])

  // 서버에서 특정 대화의 메시지 내역 불러오기
  const loadMessagesFromServer = useCallback(async (sessionId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/conversations/${sessionId}/messages?user=default-user&limit=100`)
      if (response.ok) {
        const data = await response.json()
        const serverMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.timestamp * 1000), // unix timestamp를 Date로 변환
          isVoice: msg.isVoice || false,
          files: msg.files || [] // 파일 정보 추가
        }))
        console.log(`서버에서 ${serverMessages.length}개의 메시지를 불러왔습니다.`)
        return serverMessages
      } else {
        console.warn(`대화 ${sessionId}의 메시지를 서버에서 불러오는데 실패했습니다.`)
        return []
      }
    } catch (error) {
      console.error('서버 메시지 로드 오류:', error)
      return []
    }
  }, [])

  // 대화 선택
  const selectChatSession = useCallback(async (sessionId: string) => {
    // 이미 선택된 대화와 같은 대화라면 아무것도 하지 않음
    if (currentSessionId === sessionId) {
      console.log('이미 선택된 대화입니다. 동작하지 않습니다.')
      return
    }

    const session = chatSessions.find(s => s.id === sessionId)
    if (session) {
      // 현재 대화 저장 (순서 유지를 위해 로컬에만 저장)
      if (currentSessionId && messages.length > 0) {
        const currentSession = chatSessions.find(s => s.id === currentSessionId)
        if (currentSession) {
          const updatedSession = {
            ...currentSession,
            messages,
            lastMessage: messages[messages.length - 1]?.content || ''
            // timestamp 제거로 순서 변경 방지
          }
          const updatedSessions = chatSessions.map(s =>
            s.id === currentSessionId ? updatedSession : s
          )
          // 로컬에만 저장, 서버 새로고침 호출 제거
          localStorage.setItem('chatSessions', JSON.stringify(updatedSessions))
          setChatSessions(updatedSessions)
        }
      }

      // 선택한 대화의 메시지 불러오기
      setCurrentSessionId(sessionId)
      setIsSidebarOpen(false)

      // 먼저 로컬에 저장된 메시지가 있는지 확인
      if (session.messages && session.messages.length > 0) {
        setMessages(session.messages)
        setHasStartedChat(true)
        console.log('로컬에 저장된 메시지를 사용합니다.')
      } else {
        // 로컬에 메시지가 없으면 서버에서 로드
        console.log('서버에서 메시지를 불러옵니다...')
        const serverMessages = await loadMessagesFromServer(sessionId)
        setMessages(serverMessages)
        setHasStartedChat(serverMessages.length > 0)

        // 불러온 메시지를 세션에 저장 (순서 유지)
        if (serverMessages.length > 0) {
          const updatedSession = {
            ...session,
            messages: serverMessages,
            lastMessage: serverMessages[serverMessages.length - 1]?.content || ''
            // timestamp 업데이트 제거
          }
          const updatedSessions = chatSessions.map(s =>
            s.id === sessionId ? updatedSession : s
          )
          setChatSessions(updatedSessions)
        }
      }
    }
  }, [currentSessionId, messages, chatSessions, loadMessagesFromServer])

  // 대화 삭제
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

        // 상태에서 해당 세션 제거
        const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
        setChatSessions(updatedSessions);

        // 로컬스토리지에서도 제거
        localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));

        // 현재 보고 있던 대화가 삭제된 경우, 새 대화 시작
        if (currentSessionId === sessionId) {
          startNewChat();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `대화 삭제 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('대화 삭제 오류:', error);
      alert(`대화 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [currentSessionId, startNewChat, chatSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 파일을 선택하면 텍스트 입력창은 비워줍니다.
      setInputText('');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // UUID 생성 함수
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // 폴백: 간단한 UUID 생성
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Dify 파일 타입 추론 함수
  const getDifyFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    // 문서 타입 추가
    const docMimeTypes = [
      'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.ms-powerpoint', // ppt
      'text/html', 'application/xml', 'application/epub+zip', 'message/rfc822'
    ];
    if (docMimeTypes.includes(mimeType)) return 'document';

    return 'custom'; // 기타
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() && !selectedFile) return

    if (!hasStartedChat) setHasStartedChat(true)
    setIsProcessing(true)

    // 새 대화 세션 생성 (메시지 전송 시점에 UUID 생성)
    let sessionId = currentSessionId
    console.log('=== HANDLE SUBMIT ===')
    console.log('Current sessionId:', currentSessionId)

    if (!currentSessionId) {
      sessionId = generateUUID()
      console.log('Generated new sessionId:', sessionId)
      setCurrentSessionId(sessionId)
    } else {
      console.log('Using existing sessionId:', sessionId)
    }

    const content = inputText.trim();
    const isVoice = false;
    let difyFiles: any[] = [];

    // Dify 파일 업로드 로직
    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('user', 'default-user'); // Dify API 요구사항

        console.log('Uploading file to Dify proxy...');
        const apiUrl = getApiUrl();
        const uploadResponse = await fetch(`${apiUrl}/dify-files-upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          console.log('Dify file upload successful:', uploadResult);

          difyFiles.push({
            type: getDifyFileType(selectedFile.type),
            transfer_method: 'local_file',
            upload_file_id: uploadResult.id,
          });

        } else {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.detail || 'Dify 파일 업로드 실패');
        }

      } catch (error) {
        console.error("Dify 파일 업로드 오류:", error);
        alert(`파일 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        setIsProcessing(false);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date(),
      isVoice: isVoice,
      files: difyFiles.map(file => ({ // 파일 정보를 메시지에 포함
        id: file.upload_file_id,
        name: selectedFile?.name || 'unknown file',
        type: file.type,
        mime_type: selectedFile?.type || 'application/octet-stream'
      }))
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputText('')
    handleRemoveFile() // 메시지 전송 후 파일 선택 해제

    // 실시간 assistant 메시지 미리 생성
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: "",
      timestamp: new Date()
    }

    // API Gateway /process 엔드포인트 호출
    try {
      const requestData = {
        query: userMessage.content,
        conversation_id: sessionId || "",
        user: "default-user",
        files: difyFiles // Dify 파일 정보 포함
      }

      console.log('=== API REQUEST ===')
      console.log('Request data:', requestData)
      console.log('Session ID being sent:', sessionId)

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`)
      }

      // 스트리밍 응답 처리
      let assistantContent = ""
      let conversationId = ""

      // assistant 메시지를 즉시 추가 (빈 내용으로 시작)
      const messagesWithAssistant = [...updatedMessages, assistantMessage]
      setMessages(messagesWithAssistant)

      // 스트리밍 시작
      setIsStreaming(true)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('스트리밍 응답을 읽을 수 없습니다')
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              try {
                const jsonStr = line.trim().substring(6) // "data: " 제거
                if (jsonStr.trim() === '') continue

                const data = JSON.parse(jsonStr)

                if (data.event === 'message') {
                  // 실시간으로 텍스트 청크 추가
                  const chunk = data.chunk || ''
                  assistantContent += chunk

                  // 실시간으로 메시지 업데이트
                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  )
                } else if (data.event === 'message_end') {
                  // 스트리밍 완료
                  conversationId = data.conversation_id || ''
                  console.log('스트리밍 완료:', { assistantContent, conversationId })
                  setIsStreaming(false)

                  // TTS 호출 - 스트리밍 완료 후 음성 생성
                  if (assistantContent.trim()) {
                    try {
                      console.log('TTS 호출 시작:', assistantContent)
                      const apiUrl = getApiUrl();
                      const ttsResponse = await fetch(`${apiUrl}/synthesize`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          text: assistantContent,
                          voice: 'alloy',
                          speed: 1.0,
                          format: 'mp3'
                        })
                      })

                      if (ttsResponse.ok) {
                        // 오디오 블롭을 받아서 자동 재생
                        const audioBlob = await ttsResponse.blob()
                        const audioUrl = URL.createObjectURL(audioBlob)
                        const audio = new Audio(audioUrl)

                        console.log('TTS 오디오 생성 완료, 자동 재생 비활성화')
                        // 자동 재생 기능 비활성화
                        // audio.play().catch(error => {
                        //   console.warn('자동 재생 실패 (브라우저 정책):', error)
                        //   // 자동 재생이 차단된 경우에 대한 처리는 향후 추가
                        // })

                        // 메모리 정리
                        audio.onended = () => {
                          URL.revokeObjectURL(audioUrl)
                        }
                      } else {
                        console.error('TTS 호출 실패:', ttsResponse.status)
                      }
                    } catch (ttsError) {
                      console.error('TTS 처리 오류:', ttsError)
                      // TTS 실패는 치명적이지 않으므로 사용자 경험을 방해하지 않음
                    }
                  }
                } else if (data.event === 'error') {
                  // 에러 처리
                  const errorMsg = data.message || '알 수 없는 오류'
                  throw new Error(`서버 오류: ${errorMsg}`)
                }
              } catch (parseError) {
                console.warn('JSON 파싱 오류:', parseError, 'Line:', line)
                continue
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
        setIsStreaming(false)
      }

      // 최종 메시지 상태 확인
      if (!assistantContent) {
        assistantContent = "응답을 받지 못했습니다."
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: assistantContent }
              : msg
          )
        )
      }

      const finalMessages = messagesWithAssistant.map(msg =>
        msg.id === assistantMessage.id
          ? { ...msg, content: assistantContent }
          : msg
      )

      // 대화 세션 저장/업데이트
      if (sessionId) {
        const existingSession = chatSessions.find(s => s.id === sessionId)
        const sessionTitle = existingSession?.title || generateChatTitle(userMessage.content)

        const sessionData: ChatSession = {
          id: sessionId,
          title: sessionTitle,
          timestamp: new Date(),
          lastMessage: assistantContent,
          messages: finalMessages
        }

        const updatedSessions = existingSession
          ? chatSessions.map(s => s.id === sessionId ? sessionData : s)
          : [...chatSessions, sessionData]

        saveChatSessions(updatedSessions)

        // 새 대화가 생성되었으므로 서버에서 대화 목록 새로고침
        await loadChatSessionsFromServer()
      }

    } catch (error) {
      console.error("API 호출 오류:", error)

      // 오류 발생 시 assistant 메시지 업데이트 또는 새 에러 메시지 추가
      const errorContent = `죄송합니다. 서버와 통신 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`

      // 이미 추가된 assistant 메시지가 있다면 업데이트, 없다면 새로 추가
      if (messages.some(msg => msg.id === assistantMessage?.id)) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: errorContent }
              : msg
          )
        )
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: errorContent,
          timestamp: new Date()
        }
        setMessages([...updatedMessages, errorMessage])
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = useCallback(async () => {
    // 화면 전환 로직을 이곳에서 제거
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

        const formData = new FormData()
        formData.append('file', audioBlob, 'recording.webm')
        formData.append('model', 'whisper-1')
        formData.append('language', 'ko')

        // '처리 중' 상태 변경 로직을 일시적으로 비활성화하여 부작용을 방지합니다.
        // setIsProcessing(true); 

        let transcribedText = "";
        try {
          // 🔒 보안 개선: API Gateway를 통한 안전한 STT 호출
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/transcribe`, {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (response.ok) {
            transcribedText = result.transcription || result.text;

            const hallucinationFilter = [
              "MBC 뉴스 이덕영입니다",
              "시청해주셔서 감사합니다",
              "Thanks for watching",
              "자막",
            ];

            const isHallucination = hallucinationFilter.some(filterText => transcribedText.includes(filterText));
            if (isHallucination) {
              transcribedText = "";
              console.log("Hallucination detected:", transcribedText);
            }

          } else {
            throw new Error(result.error?.message || "알 수 없는 API 오류")
          }

        } catch (error) {
          console.error("음성 변환 API 호출 오류:", error)
          const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류"
          alert(`음성 변환 중 오류가 발생했습니다: ${errorMessage}`)
        }

        // 변환된 텍스트를 입력창에 추가하는 핵심 로직만 남깁니다.
        if (transcribedText.trim()) {
          setInputText(prevText => {
            const separator = prevText.trim() ? ' ' : '';
            return prevText + separator + transcribedText;
          });

          // 음성 입력 후 입력창에 포커스 이동
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              // 커서를 텍스트 끝으로 이동
              const length = textareaRef.current.value.length;
              textareaRef.current.setSelectionRange(length, length);
            }
          }, 100); // 약간의 딜레이를 주어 상태 업데이트 완료 후 포커스
        }

        // '처리 중' 상태 변경 로직 비활성화
        // setIsProcessing(false);

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true) // 페이지의 isRecording 상태 업데이트
    } catch (error) {
      console.error('음성 녹음 오류:', error)
      alert('마이크 권한이 필요합니다.')
    }
  }, []) // hasStartedChat 의존성 제거

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false) // 페이지의 isRecording 상태 업데이트
  }, [])

  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // 스페이스바 녹음 기능 통합
  const {
    isHolding,
    isRecording: isSpacebarRecording,
    holdProgress
  } = useSpacebarRecording({
    onStartRecording: startRecording,
    onStopRecording: stopRecording,
    holdDuration: 2000
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleQuickAction = (text: string) => {
    setInputText(text)
    if (!hasStartedChat) setHasStartedChat(true)
  }

  // 최신순으로 정렬된 대화 세션 (useMemo로 최적화)
  const sortedChatSessions = useMemo(() =>
    [...chatSessions].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ), [chatSessions]
  );

  return (
    <div className="flex h-screen" role="application" aria-label="Sapie-Braille 시각장애인 AI 어시스턴트">
      {/* 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chatSessions={sortedChatSessions}
        currentSessionId={currentSessionId}
        onSessionSelect={selectChatSession}
        onNewChat={startNewChat}
        onSessionDelete={handleDeleteSession}
        onHoverChange={(h) => setIsSidebarHovered(h)}
      />

      {/* 홈 버튼 (로고) - 사이드바 상태에 따라 위치 조정 */}
      <button
        onClick={startNewChat}
        className={`fixed top-6 z-50 text-xl font-bold text-dark-100 hover:text-primary-400 transition-all duration-300 ease-in-out ${(isSidebarOpen || isSidebarHovered) ? 'md:left-[336px]' : 'md:left-[80px]'
          } left-6`}
        role="button"
        aria-label="새 대화 시작 - Sapie-Braille 홈으로 이동"
        tabIndex={0}
      >
        Sapie-Braille
      </button>

      {/* 메인 컨테이너 */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out md:pl-[56px] ${(isSidebarOpen || isSidebarHovered) ? 'md:pl-80' : ''}`}>
        {/* 메인 콘텐츠 영역 - 스크롤 가능 */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          {!hasStartedChat ? (
            <div className="welcome-screen" role="main" aria-label="시각장애인을 위한 AI 어시스턴트 홈">
              <p className="welcome-title text-6xl font-bold mb-10" role="heading" aria-level={1}>
                안녕하세요, Hyeonchan
              </p>
              <p className="welcome-subtitle text-2xl" role="text">
                시각장애인을 위한 Sapie-Braille입니다.<br />
                음성으로 말씀하시거나 텍스트로 입력하세요.
              </p>
              <p className="mt-1, mb-10">
                <span className="text-primary-400 text-lg font-semibold">스페이스바를 2초간 누르면 음성 녹음이 시작됩니다.</span>
                <br />
                <span className="text-primary-400 text-lg font-semibold">CTRL + O를 누르면 파일 탐색기가 실행됩니다.</span>
              </p>

              {/* 마이크 권한 상태 표시
            <div className="mt-6 text-center">
              {micPermissionGranted === null && (
                <p className="text-sm text-gray-400 animate-pulse">마이크 권한을 확인 중입니다...</p>
              )}
              {micPermissionGranted === true && (
                <p className="text-sm text-green-400">✅ 마이크가 준비되었습니다.</p>
              )}
              {micPermissionGranted === false && (
                <p className="text-sm text-red-400">⚠️ 마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.</p>
              )}
            </div> */}

              <div className="quick-actions" role="group" aria-label="빠른 실행 버튼들" aria-describedby="quick-actions-help">
                <div id="quick-actions-help" className="sr-only">
                  다음 버튼들 중 하나를 선택하여 빠르게 대화를 시작할 수 있습니다. 키보드의 Tab 키로 이동하고 Enter 키로 선택하세요.
                </div>
                <button
                  className="quick-action-btn hover:bg-dark-800 hover:border-gray-100"
                  onClick={() => handleQuickAction('오늘 날씨는 어때?')}
                  aria-label="점역 요청하기 - 점역 변환을 요청합니다"
                  role="button"
                  tabIndex={0}
                >
                  <span aria-hidden="true">○</span> 점역 변환
                </button>
                <button
                  className="quick-action-btn hover:bg-dark-800 hover:border-gray-100"
                  onClick={() => handleQuickAction('뉴스 읽어줘')}
                  aria-label="뉴스 읽어달라고 요청하기 - 뉴스 읽어줘 라고 질문합니다"
                  role="button"
                  tabIndex={0}
                >
                  <span aria-hidden="true">◇</span> 뉴스 읽기
                </button>
                <button
                  className="quick-action-btn hover:bg-dark-800 hover:border-gray-100"
                  onClick={() => handleQuickAction('일정 확인해줘')}
                  aria-label="복지 확인 요청하기 - 복지 확인해줘 라고 질문합니다"
                  role="button"
                  tabIndex={0}
                >
                  <span aria-hidden="true">□</span> 복지 정보
                </button>
                <button
                  className="quick-action-btn hover:bg-dark-800 hover:border-gray-100"
                  onClick={() => handleQuickAction('도움말')}
                  aria-label="도움말 보기 - 도움말을 요청합니다"
                  role="button"
                  tabIndex={0}
                >
                  <span aria-hidden="true">△</span> 도움말
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto" role="main" aria-label="대화 영역">
              <div
                className="flex-1 overflow-y-auto mb-5 flex flex-col py-5"
                role="log"
                aria-live="polite"
                aria-label="대화 내용"
              >
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex flex-col mb-4 w-full ${message.type === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {/* 파일 첨부 표시 (말풍선 밖으로 이동 및 스타일 적용) */}
                    {message.files && message.files.length > 0 && (
                      <div className={`file-bubble-container max-w-xs sm:max-w-sm md:max-w-md ${message.type === 'user' ? 'self-end' : 'self-start'}`}>
                        {message.files.map(file => {
                          const extension = file.name.split('.').pop()?.toUpperCase() || '';
                          return (
                            <a
                              key={file.id}
                              href={`${getApiUrl()}/files/${file.id}/preview`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-bubble"
                              aria-label={`${file.name} 파일 보기`}
                            >
                              <div className="file-name truncate">{file.name}</div>
                              <div className="file-meta">
                                {getFileIcon(file.mime_type)}
                                <span className="file-extension">{extension}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* 텍스트 메시지 (내용이 있을 때만 표시) */}
                    {message.content && (
                      <div
                        className={`chat-message ${message.type} mt-2`}
                        role="article"
                        aria-label={`${message.type === 'user' ? '사용자' : 'AI 어시스턴트'} 메시지 ${index + 1}번`}
                        aria-describedby={`message-content-${message.id}`}
                        tabIndex={0}
                      >
                        {message.isVoice && <span className="text-xs opacity-70" aria-label="음성 메시지" role="img">● </span>}

                        <div id={`message-content-${message.id}`} aria-live="polite">
                          {message.type === 'assistant' ? (
                            <MarkdownRenderer
                              content={message.content}
                              isAssistant={true}
                              animate={false}
                              isStreaming={isStreaming && index === messages.length - 1}
                            />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <div
                    className="chat-message assistant self-start"
                    role="status"
                    aria-label="AI가 응답을 생성하고 있습니다"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <div className="bouncing-loader">
                      <div className="dot1"></div>
                      <div className="dot2"></div>
                      <div></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

            </div>
          )}
        </div>

        {/* 하단 고정 입력창 */}
        <div className="chat-input-container" role="region" aria-label="메시지 입력 영역" aria-describedby="input-help">
          <div id="input-help" className="sr-only">
            메시지를 입력하거나 음성 녹음을 사용할 수 있습니다. Ctrl+O로 파일을 첨부하고, 스페이스바 2초 길게 누르면 음성 녹음이 시작됩니다.
          </div>
          {/* 파일 업로드를 위한 숨겨진 input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            aria-label="파일 선택"
            accept="*/*"
          />

          <form onSubmit={handleSubmit} className="w-full" role="form" aria-label="메시지 전송 폼">
            {/* 파일 선택 시 표시되는 칩 */}
            {selectedFile && (
              <div
                className="mb-3 flex items-center bg-dark-800 border border-dark-700 text-dark-100 text-sm font-medium px-3 py-2 rounded-full self-start w-fit"
                role="group"
                aria-label={`선택된 파일: ${selectedFile.name}`}
              >
                <span aria-hidden="true">{getFileIcon(selectedFile.type)}</span>
                <span className="ml-2 mr-2" aria-label={`파일명: ${selectedFile.name}`}>{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold hover:bg-gray-600 transition-colors"
                  aria-label={`선택한 파일 ${selectedFile.name} 제거하기`}
                  tabIndex={0}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            )}

            <div className="chat-input-wrapper" role="group" aria-label="메시지 입력 도구">
              <button
                type="button"
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleVoiceClick}
                disabled={isProcessing}
                aria-label={isRecording ? '음성 녹음 중지하기' : '음성 녹음 시작하기'}
                aria-pressed={isRecording}
                aria-describedby="voice-btn-help"
                tabIndex={0}
              >
                <span aria-hidden="true">{isRecording ? '■' : '●'}</span>
              </button>
              <div id="voice-btn-help" className="sr-only">
                {isRecording ? '현재 음성을 녹음 중입니다. 클릭하면 녹음이 중지됩니다.' : '클릭하여 음성 녹음을 시작할 수 있습니다.'}
              </div>

              <textarea
                ref={textareaRef}
                id="chat-input"
                className="chat-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedFile ? "파일에 대한 설명을 입력하세요..." : "Sapie-Braille에게 무엇이든 물어보세요"}
                rows={1}
                aria-label="메시지 입력창"
                aria-describedby="input-instructions"
                disabled={isProcessing || isRecording}
                role="textbox"
                aria-multiline="true"
                aria-required="false"
              />
              <div id="input-instructions" className="sr-only">
                Enter 키로 메시지를 전송하고, Shift+Enter로 줄바꿈을 할 수 있습니다. 현재 {inputText.length}자 입력되었습니다.
              </div>

              <button
                type="submit"
                className="send-btn"
                disabled={isProcessing || (!inputText.trim() && !selectedFile) || isRecording}
                aria-label={isProcessing ? '메시지 처리 중...' : '메시지 전송하기'}
                aria-describedby="send-btn-help"
                tabIndex={0}
              >
                <span aria-hidden="true">{isProcessing ? '○' : '↑'}</span>
              </button>
              <div id="send-btn-help" className="sr-only">
                {isProcessing ? 'AI가 응답을 생성하고 있습니다.' :
                  (!inputText.trim() && !selectedFile) ? '메시지나 파일을 입력한 후 전송할 수 있습니다.' :
                    '클릭하여 메시지를 전송합니다.'}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 스페이스바 녹음 인디케이터 */}
      <SpacebarIndicator
        isHolding={isHolding}
        isRecording={isSpacebarRecording}
        holdProgress={holdProgress}
      />
    </div>
  )
}

