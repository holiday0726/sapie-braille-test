import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getFileIcon } from '@/utils/fileUtils';
import { announceFileUploadStatus, announceRecordingStatus, announceToScreenReader } from '@/utils/accessibilityUtils';

export interface ChatInputHandles {
  focus: () => void;
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  isRecording: boolean;
  onVoiceClick: () => void;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  selectedAgentId: number;
}

export const ChatInput = forwardRef<ChatInputHandles, ChatInputProps>(({
  inputText,
  setInputText,
  selectedFile,
  fileInputRef,
  onFileChange,
  onRemoveFile,
  isRecording,
  onVoiceClick,
  isProcessing,
  onSubmit,
  selectedAgentId
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDocumentConversionAgent = selectedAgentId === 5;
  const prevIsRecording = useRef(isRecording);
  const prevIsProcessing = useRef(isProcessing);
  const prevSelectedFile = useRef(selectedFile);

  // 녹음 상태 변화 감지 및 알림
  useEffect(() => {
    if (prevIsRecording.current !== isRecording) {
      if (isRecording) {
        announceRecordingStatus('start');
      } else if (prevIsRecording.current) {
        announceRecordingStatus('stop');
      }
      prevIsRecording.current = isRecording;
    }
  }, [isRecording]);

  // 처리 상태 변화 감지 및 알림
  useEffect(() => {
    if (prevIsProcessing.current !== isProcessing) {
      if (isProcessing) {
        announceToScreenReader('메시지를 전송했습니다. AI가 응답을 생성하고 있습니다', 'polite');
      }
      prevIsProcessing.current = isProcessing;
    }
  }, [isProcessing]);

  // 파일 선택 상태 변화 감지 및 알림
  useEffect(() => {
    if (prevSelectedFile.current !== selectedFile) {
      if (selectedFile && !prevSelectedFile.current) {
        announceFileUploadStatus(selectedFile.name, 'success');
      } else if (!selectedFile && prevSelectedFile.current) {
        announceToScreenReader(`${prevSelectedFile.current.name} 파일이 제거되었습니다`, 'polite');
      }
      prevSelectedFile.current = selectedFile;
    }
  }, [selectedFile]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const handleVoiceClick = () => {
    onVoiceClick();
    // 녹음 상태는 useEffect에서 처리됨
  };

  const handleFileRemove = () => {
    onRemoveFile();
    // 파일 제거는 useEffect에서 처리됨
  };

  return (
    <div className="chat-input-container" role="region" aria-label="메시지 입력 영역" aria-describedby="input-help">
      <div id="input-help" className="sr-only">
        메시지를 입력하거나 음성 녹음을 사용할 수 있습니다. Ctrl+O로 파일을 첨부하고, 스페이스바를 두 번 연속 눌러서 음성 녹음을 시작/종료할 수 있습니다. Ctrl+R로 텍스트를 음성으로 재생할 수 있습니다.
      </div>
      
      {/* 파일 업로드를 위한 숨겨진 input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        aria-label="파일 선택"
        accept="*/*"
      />

      <form onSubmit={onSubmit} className="w-full" role="form" aria-label="메시지 전송 폼">
        {/* 파일 선택 시 표시되는 칩 */}
        {selectedFile && (
          <div
            className="mb-3 flex items-center bg-gray-100 border border-gray-300 text-gray-800 text-sm font-medium px-3 py-2 rounded-full self-start w-fit"
            role="group"
            aria-label={`선택된 파일: ${selectedFile.name}`}
          >
            <span className="mr-2">{getFileIcon(selectedFile.type, selectedFile.name)}</span>
            <span className="ml-2 mr-2" aria-label={`선택된 파일명: ${selectedFile.name}`}>{selectedFile.name}</span>
            <button
              type="button"
              onClick={handleFileRemove}
              className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white"
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
            className={`voice-btn ${isRecording ? 'recording' : ''} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white`}
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
            placeholder={
              isDocumentConversionAgent 
                ? (selectedFile ? "추가 설명을 입력하세요 (선택사항)" : "문서 변환을 위해 파일을 업로드해주세요") 
                : (selectedFile ? "파일에 대한 설명을 입력하세요..." : "Sapie-Braille에게 무엇이든 물어보세요")
            }
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
            className="send-btn focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white"
            disabled={
              isProcessing || 
              isRecording || 
              (isDocumentConversionAgent ? !selectedFile : (!inputText.trim() && !selectedFile))
            }
            aria-label={isProcessing ? '메시지 처리 중...' : '메시지 전송하기'}
            aria-describedby="send-btn-help"
            tabIndex={0}
          >
            <span aria-hidden="true">{isProcessing ? '○' : '↑'}</span>
          </button>
          <div id="send-btn-help" className="sr-only">
            {isProcessing ? 'AI가 응답을 생성하고 있습니다.' :
              isDocumentConversionAgent ? 
                (!selectedFile ? '문서 변환을 위해 파일을 업로드해주세요.' : '클릭하여 문서 변환을 시작합니다.') :
                (!inputText.trim() && !selectedFile) ? '메시지나 파일을 입력한 후 전송할 수 있습니다.' :
                  '클릭하여 메시지를 전송합니다.'}
          </div>
        </div>
      </form>
    </div>
  );
});