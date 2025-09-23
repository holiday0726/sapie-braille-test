# SAPIE Braille 프로젝트 가이드

시각장애인을 위한 AI 어시스턴트 서비스입니다. 현재 API Gateway를 중심으로 한 단순화된 아키텍처를 사용합니다.

## 프로젝트 구조

```
sapie-braille/
├── frontend/               # Next.js 애플리케이션 (포트 3000)
├── backend/
│   └── services/
│       └── api_gateway/    # API Gateway 서비스 (포트 8080)
└── PROJECT_GUIDE.md       # 이 문서
```

## 현재 아키텍처

**Frontend (Next.js)** → **API Gateway** → **Dify AI Platform**

- Frontend: 사용자 인터페이스 및 접근성 기능
- API Gateway: 순수 L7 라우팅 레이어, Dify API 프록시
- Dify: 외부 AI 플랫폼 (agent.sapie.ai)

## API Gateway 엔드포인트

### 기본 정보
- **주소**: http://localhost:8080
- **설명**: Dify 중심 단순화 아키텍처를 위한 순수 L7 게이트웨이

### 주요 엔드포인트

#### 시스템 상태
- `GET /` - API Gateway 정보
- `GET /health` - 전체 시스템 상태 확인

#### 대화 관리 (Dify 프록시)
- `GET /conversations` - 대화 목록 조회
- `GET /conversations/{conversation_id}/messages` - 특정 대화 메시지 조회
- `DELETE /conversations/{conversation_id}` - 대화 삭제

#### 메시지 처리
- `POST /process` - 통합 메시지 처리 (스트리밍 응답)

#### 파일 관리
- `POST /dify-files-upload` - Dify 파일 업로드
- `GET /files/{file_id}/preview` - 파일 미리보기/다운로드

#### 음성 처리
- `POST /transcribe` - 음성 인식 (OpenAI Whisper)
- `POST /synthesize` - 음성 합성 (OpenAI TTS)

## Frontend와 API Gateway 연결

### 기본 설정
Frontend는 API Gateway에 연결합니다. API 주소는 `frontend/src/utils/env.ts`의 `getApiUrl` 함수를 통해 동적으로 관리됩니다.

- **로컬 개발 환경** (`npm run dev`): `http://localhost:8080`
- **Vercel 배포 환경**: `http://agent.sapie.ai:8080`

특정 환경에 다른 API 주소를 사용해야 하는 경우, `frontend/.env.local` 파일에 `NEXT_PUBLIC_API_URL` 환경 변수를 설정하여 우선적으로 적용할 수 있습니다.

### 주요 연결 방식

#### 1. 대화 목록 로드
```javascript
import { getApiUrl } from '@/utils/env';

const apiUrl = getApiUrl();
const response = await fetch(`${apiUrl}/conversations?user=default-user&limit=50`);
```

#### 2. 메시지 전송 (스트리밍)
```javascript
const apiUrl = getApiUrl();
const response = await fetch(`${apiUrl}/process`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: userMessage.content,
    conversation_id: sessionId || "",
    user: "default-user",
    files: difyFiles
  })
})
```

#### 3. 파일 업로드
```javascript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('user', 'default-user');

const apiUrl = getApiUrl();
const response = await fetch(`${apiUrl}/dify-files-upload`, {
  method: 'POST',
  body: formData,
});
```

#### 4. 음성 인식
```javascript
const formData = new FormData()
formData.append('file', audioBlob, 'recording.webm')
formData.append('language', 'ko')

const apiUrl = getApiUrl();
const response = await fetch(`${apiUrl}/transcribe`, {
  method: 'POST',
  body: formData,
})
```

## API Gateway와 Dify 연결

### Dify 플랫폼 정보
- **URL**: http://agent.sapie.ai
- **API 키**: `app-R0CHRg90MN5hmtIJZh6NDTHf`
- **사용자**: `default-user`

### 주요 연결 방식

#### 1. 인증 헤더
```javascript
headers: {
  "Authorization": `Bearer ${api_key}`,
  "Content-Type": "application/json"
}
```

#### 2. 대화 API 매핑

| Frontend 요청 | API Gateway | Dify API |
|--------------|-------------|----------|
| `GET /conversations` | 프록시 | `GET /v1/conversations` |
| `GET /conversations/{id}/messages` | 프록시 | `GET /v1/messages` |
| `POST /process` | 변환 + 프록시 | `POST /v1/chat-messages` |
| `POST /dify-files-upload` | 프록시 | `POST /v1/files/upload` |

#### 3. 메시지 처리 플로우
1. Frontend → API Gateway: 사용자 메시지
2. API Gateway → Dify: 형식 변환 후 전달
3. Dify → API Gateway: 스트리밍 응답
4. API Gateway → Frontend: 실시간 전달

#### 4. 스트리밍 응답 처리
```javascript
// Dify 스트리밍 데이터를 Frontend 형식으로 변환
if (event_type === "message") {
  yield `data: ${JSON.dumps({'event': 'message', 'chunk': chunk})}\n\n`
} else if (event_type === "message_end") {
  yield `data: ${JSON.dumps({
    'event': 'message_end', 
    'conversation_id': received_conversation_id, 
    'metadata': metadata
  })}\n\n`
}
```

## 개발 환경 설정

### 1. 환경 변수
```bash
# backend/.env.dify
API_KEY = "app-R0CHRg90MN5hmtIJZh6NDTHf"

# backend/.env.openAI
OPENAI_API_KEY = "your_openai_api_key"

# frontend/.env.local (필요시 사용)
# Vercel Preview 환경 등 특정 주소가 필요할 때 설정
NEXT_PUBLIC_API_URL = "http://preview.agent.sapie.ai:8080"
```

### 2. 서비스 시작
```bash
# API Gateway 시작
cd backend/services/api_gateway
python main.py

# Frontend 시작
cd frontend
npm run dev
```

### 3. 접근 주소
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- API 문서: http://localhost:8080/docs

## 주요 기능

### 접근성 기능
- 스크린 리더 지원 (ARIA 레이블)
- 키보드 네비게이션
- 스페이스바 2초 길게 누르기로 음성 녹음
- Ctrl+O로 파일 탐색기 실행

### 음성 기능
- 실시간 음성 인식 (OpenAI Whisper)
- 자동 음성 합성 및 재생 (OpenAI TTS)
- 환각 필터링 (뉴스 자막 등 제거)

### 파일 처리
- 다양한 파일 형식 지원
- Dify 플랫폼을 통한 파일 분석
- 파일 미리보기 및 다운로드

### 대화 관리
- 대화 세션 저장 및 복원
- 실시간 스트리밍 응답
- 파일 첨부가 포함된 메시지 지원

## 문제 해결

### 자주 발생하는 문제

1. **CORS 오류**: API Gateway에서 localhost:3000 허용 설정 확인
2. **파일 업로드 실패**: Dify API 키 및 네트워크 연결 확인
3. **음성 인식 실패**: 브라우저 마이크 권한 및 OpenAI API 키 확인
4. **스트리밍 중단**: Dify 서버 연결 상태 확인

### 로그 확인
API Gateway는 상세한 로그를 제공합니다:
```bash
python main.py
# 로그에서 요청/응답 상태, 오류 정보 확인 가능
```