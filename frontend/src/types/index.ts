export interface DifyFile {
  id: string;
  name: string;
  type: string;
  mime_type: string;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  braille?: string; // 점자 텍스트 필드 (옵션)
  timestamp: Date;
  isVoice?: boolean;
  files?: DifyFile[];
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  lastMessage: string;
  messages: Message[];
}