import React, { useState } from 'react';
import { Message } from '@/types';
import { getFileIcon } from '@/utils/fileUtils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getApiUrl } from '@/utils/env';

interface ChatMessagesProps {
  messages: Message[];
  isProcessing: boolean;
  isStreaming: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  selectedAgentId?: number;
}

export const ChatMessages = ({ messages, isProcessing, isStreaming, messagesEndRef, selectedAgentId = 0 }: ChatMessagesProps) => {
  const [brailleView, setBrailleView] = useState<Record<string, boolean>>({});

  const toggleBrailleView = (messageId: string) => {
    setBrailleView(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const downloadBrfFile = async (brailleText: string, messageId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/download-brf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          braille_text: brailleText,
          filename: `braille_${messageId}.brf`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 파일 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `braille_${messageId}.brf`;
      
      document.body.appendChild(a);
      a.click();
      
      // 정리
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // 접근성 안내
      const announceElement = document.getElementById('live-announcements');
      if (announceElement) {
        announceElement.textContent = 'BRF 파일이 다운로드되었습니다.';
      }
      
    } catch (error) {
      console.error('BRF 다운로드 실패:', error);
      
      // 에러 안내
      const announceElement = document.getElementById('live-announcements');
      if (announceElement) {
        announceElement.textContent = 'BRF 파일 다운로드에 실패했습니다.';
      }
    }
  };

  return (
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
            {/* 파일 첨부 표시 */}
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
                        {getFileIcon(file.mime_type, file.name)}
                        <span className="file-extension" aria-label={`파일 확장자: ${extension}`}>{extension}</span>
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
                style={message.type === 'user' ? { backgroundColor: '#f0f0f0' } : { backgroundColor: '#FBFBFB', border: '1px solid #e0e0e0' }}
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
            {/* 점자 토글 버튼과 내용 - AI 어시스턴트 메시지에만 표시, 에이전트 1번(점역변환)일 때는 숨김 */}
            {message.braille && !isStreaming && selectedAgentId !== 1 && message.type === 'assistant' && (
              <div className="w-full flex flex-col items-start">
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => toggleBrailleView(message.id)}
                    className="braille-toggle-btn inline-flex items-center gap-2"
                    aria-label={brailleView[message.id] ? '점자 내용 닫기' : '점자 내용 펼치기'}
                    aria-expanded={brailleView[message.id]}
                  >
                    <svg className={`w-4 h-4 transform transition-transform ${brailleView[message.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>점자 표시</span>
                  </button>
                  <button
                    onClick={() => downloadBrfFile(message.braille!, message.id)}
                    className="braille-toggle-btn inline-flex items-center gap-2 bg-blue-600 hover:bg-gray-200"
                    aria-label="BRF 파일로 다운로드"
                    title="점자를 BRF 파일로 다운로드하여 점자 디스플레이에서 사용할 수 있습니다"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>BRF 다운로드</span>
                  </button>
                </div>
                {brailleView[message.id] && (
                  <div className="braille-accordion-content">
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {message.braille}
                    </div>
                  </div>
                )}
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
  );
};