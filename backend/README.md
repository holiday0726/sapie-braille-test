# SAPIE Braille Backend - MSA 구조

SAPIE Braille의 백엔드는 FastAPI 기반 마이크로서비스 아키텍처(MSA)로 구성.

## 🏗️ 서비스 구성

### 디렉토리 구조
```
backend/
├── services/
│   ├── main_service/      # 오케스트레이터 서비스 (포트: 8000)
│   ├── stt_service/       # 음성→텍스트 변환 서비스 (포트: 8001)
│   ├── vlm_service/       # 비전 언어 모델 서비스 (포트: 8002)
│   └── tts_service/       # 텍스트→음성 변환 서비스 (포트: 8003)
├── requirements-services.txt
└── README.md
```

### Main Service (포트: 8000)
**역할**: 마이크로서비스 오케스트레이터
- 모든 서비스 간의 워크플로우 조율
- 통합 API 엔드포인트 제공
- 서비스 상태 모니터링 및 헬스체크
- 요청 라우팅 및 응답 통합

**주요 기능**:
- 멀티모달 입력 처리 (텍스트, 음성, 문서, 이미지)
- 백그라운드 작업 스케줄링
- 에러 핸들링 및 복구
- 배치 처리 지원

### STT Service (포트: 8001)  
**역할**: Speech-to-Text (음성-텍스트 변환)
- OpenAI Whisper API 통합
- 다양한 오디오 형식 지원 (MP3, WAV, M4A, OGG, FLAC, WebM)
- 실시간 음성 인식 및 변환
- 음성 파일 유효성 검증

**주요 기능**:
- 음성 인식
- 오디오 파일 형식 검증
- 신뢰도 점수 제공
- 배경 잡음 처리

### VLM Service (포트: 8002)
**역할**: Vision Language Model
- 이미지 및 문서 내용 분석
- 차트/그래프 데이터 추출
- OCR 및 구조화된 텍스트 추출
- 멀티모달 콘텐츠 이해

**주요 기능**:
- **이미지 분석**: JPG, PNG  지원
- **문서 추출**: PDF, DOCX, 처리
- **대체 텍스트 생성**: 대체 텍스트 추출
- **구조화된 출력**: 제목, 단락, 목록 등 문서 구조 보존

### TTS Service (포트: 8003)
**역할**: Text-to-Speech (텍스트-음성 변환)
- 점자 텍스트를 음성으로 변환

**주요 기능**:
- 음성 합성
- 텍스트 길이 기반 재생 시간 추정
- 일괄 변환 처리


## 실행 방법

### 자동 실행 (권장)
루트 디렉토리에서:
```bash
./start-services.bat
```

### 수동 실행
```bash
# 1. 의존성 설치
pip install -r backend/requirements-services.txt

# 2. 각 서비스를 별도 터미널에서 실행
cd backend/services/stt_service && python main.py     # 포트 :8001
cd backend/services/vlm_service && python main.py     # 포트 :8002
cd backend/services/tts_service && python main.py     # 포트 :8003
cd backend/services/parser_service && python main.py  # 포트 :8010
cd backend/services/main_service && python main.py    # 포트 :8000 (마지막에 실행)
```

## 📊 API 엔드포인트

### Main Service (http://localhost:8000)
- `POST /process` - 멀티모달 통합 처리 (음성/이미지/문서 → 점자 → 음성)
- `GET /health` - 전체 시스템 상태 확인
- `GET /services/status` - 개별 서비스 상태 조회
- `GET /status/{request_id}` - 특정 요청 처리 상태 확인
- `POST /process-batch` - 일괄 처리 요청

### STT Service (http://localhost:8001)
- `POST /transcribe` - 음성 파일 텍스트 변환
- `POST /validate-audio` - 음성 파일 유효성 검증
- `GET /health` - STT 서비스 상태

### VLM Service (http://localhost:8002)
- `POST /analyze-image` - 이미지 내용 분석
- `POST /extract-document` - 문서 텍스트 추출
- `POST /process-chart` - 차트/그래프 분석
- `GET /health` - VLM 서비스 상태

### TTS Service (http://localhost:8003)
- `POST /synthesize` - 텍스트 음성 변환
- `POST /synthesize-batch` - 일괄 음성 변환
- `GET /voices` - 사용 가능한 음성 목록
- `GET /health` - TTS 서비스 상태

### Parser Service (http://localhost:8010)
- `GET /parse-by-url` - URL로 문서 파싱
- `GET /health` - Parser 서비스 상태

**API 문서**: http://localhost:8000/docs (Swagger UI)

## 환경 설정

루트 디렉토리에 `.env` 파일 생성:
```env
OPENAI_API_KEY=your_openai_api_key_here
UPSTAGE_API_KEY=your_upstage_api_key_here
```

## 워크플로우 예시

### 1. 음성 파일 처리
```
음성 파일 → STT Service → Main Service → TTS Service → 점자 음성 출력
```

### 2. 문서 처리  
```
PDF/DOCX → VLM Service → Main Service → TTS Service → 점자 음성 출력
```

### 3. 이미지 처리
```
이미지 → VLM Service → Main Service → TTS Service → 점자 음성 출력
```

## 서비스 간 통신

- **비동기 HTTP 통신**: httpx 라이브러리 사용
- **서비스 디스커버리**: 고정 포트 기반 직접 통신
- **헬스체크**: 주기적 서비스 상태 확인
- **에러 핸들링**: 서비스 실패 시 graceful degradation

## 더 자세한 정보

- 전체 시스템 구조: 루트 디렉토리의 `README-MSA.md`
- Docker 배포: `docker-compose.yml` 참조
- 프론트엔드 연동: `frontend/` 디렉토리