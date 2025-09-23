import { useState, useRef, useEffect, useCallback } from 'react';
import { isHallucination } from '@/utils/chatUtils';
import { getApiUrl } from '@/utils/env';

interface UseVoiceRecordingProps {
  onTranscriptionReceived: (text: string) => void;
}

export const useVoiceRecording = ({ onTranscriptionReceived }: UseVoiceRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 마이크 권한 확인
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
      } catch (error) {
        console.error("마이크 권한이 거부되었습니다.", error);
        setMicPermissionGranted(false);
      }
    };

    checkMicPermission();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'ko');

        let transcribedText = "";
        try {
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/transcribe`, {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (response.ok) {
            transcribedText = result.transcription || result.text;

            if (isHallucination(transcribedText)) {
              transcribedText = "";
              console.log("Hallucination detected:", transcribedText);
            }

          } else {
            throw new Error(result.error?.message || "알 수 없는 API 오류");
          }

        } catch (error) {
          console.error("음성 변환 API 호출 오류:", error);
          const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
          alert(`음성 변환 중 오류가 발생했습니다: ${errorMessage}`);
        }

        // 변환된 텍스트를 콜백으로 전달
        if (transcribedText.trim()) {
          onTranscriptionReceived(transcribedText);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('음성 녹음 오류:', error);
      alert('마이크 권한이 필요합니다.');
    }
  }, [onTranscriptionReceived]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleVoiceClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    micPermissionGranted,
    startRecording,
    stopRecording,
    handleVoiceClick
  };
};