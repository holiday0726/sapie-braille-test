# SAPIE Braille MSA 구조

기존 LangGraph 기반 백엔드를 FastAPI 기반 마이크로서비스 구조로 전환했습니다.

## 🏗️ 아키텍처

```
Frontend (Next.js)
       ↓
Main Service (Orchestrator) :8000
       ↓
   ┌────┴────┬────────┐
   ↓         ↓        ↓
STT       VLM      TTS
:8001     :8002    :8003
```

## 🚀 서비스 구성

### 1. **STT Service** (포트: 8001)
- **기능**: 음성 파일 → 텍스트 변환
- **기반**: 기존 `whisper_service.py`
- **API**: OpenAI Whisper
- **엔드포인트**:
  - `POST /transcribe` - 음성 변환
  - `POST /validate-audio` - 오디오 파일 검증
  - `GET /health` - 서비스 상태

### 2. **VLM Service** (포트: 8002)  
- **기능**: 이미지/문서 → 텍스트 설명
- **기반**: 기존 `alternative_text_node.py` 확장
- **API**: Vision Language Model
- **엔드포인트**:
  - `POST /analyze-image` - 이미지 분석
  - `POST /extract-document` - 문서 텍스트 추출
  - `POST /process-chart` - 차트/그래프 분석
  - `GET /health` - 서비스 상태

### 3. **TTS Service** (포트: 8003)
- **기능**: 텍스트 → 음성 파일 변환  
- **기반**: 기존 `tts_node.py`
- **API**: OpenAI TTS
- **엔드포인트**:
  - `POST /synthesize` - 음성 합성
  - `POST /synthesize-batch` - 일괄 음성 합성
  - `GET /voices` - 사용 가능한 음성 목록
  - `GET /health` - 서비스 상태

### 4. **Main Service** (포트: 8000)
- **기능**: 서비스 오케스트레이션
- **기반**: 기존 `graph.py` 로직
- **역할**: 워크플로우 조율, 에러 처리, 통합 API
- **엔드포인트**:
  - `POST /process` - 통합 처리 (STT→VLM→TTS)
  - `GET /status/{request_id}` - 처리 상태 확인
  - `POST /process-batch` - 일괄 처리
  - `GET /services/status` - 모든 서비스 상태
  - `GET /health` - 전체 시스템 상태

## 🚀 실행 방법

### Option 1: 배치 파일 사용 (권장)
```bash
start-services.bat
```

### Option 2: 수동 실행
```bash
# 1. 의존성 설치
pip install -r backend/requirements-services.txt

# 2. 각 서비스를 별도 터미널에서 실행
cd backend/services/stt_service && python main.py     # 포트 8001
cd backend/services/vlm_service && python main.py     # 포트 8002  
cd backend/services/tts_service && python main.py     # 포트 8003
cd backend/services/main_service && python main.py    # 포트 8000
```

## 📊 API 테스트

### 통합 처리 예시
```bash
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요, 테스트입니다."}'
```

### 개별 서비스 테스트
```bash
# STT 테스트
curl -X POST "http://localhost:8001/transcribe" \
  -F "file=@audio.mp3"

# VLM 테스트  
curl -X POST "http://localhost:8002/analyze-image" \
  -F "file=@image.jpg"

# TTS 테스트
curl -X POST "http://localhost:8003/synthesize" \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요"}'
```

## 📖 API 문서

각 서비스는 자동 생성된 Swagger 문서를 제공합니다:
- Main: http://localhost:8000/docs
- STT: http://localhost:8001/docs
- VLM: http://localhost:8002/docs
- TTS: http://localhost:8003/docs

## 🔍 모니터링

### 전체 시스템 상태
```bash
curl http://localhost:8000/health
```

### 개별 서비스 상태
```bash  
curl http://localhost:8000/services/status
```

## 🔧 환경 설정

`.env` 파일에 필요한 환경 변수 설정:
```env
OPENAI_API_KEY=your_api_key_here
```

## 📁 프로젝트 구조

```
backend/services/
├── main_service/          # 오케스트레이터
│   ├── main.py
│   ├── models.py
│   ├── orchestrator.py
│   └── __init__.py
├── stt_service/           # 음성→텍스트
│   ├── main.py
│   ├── models.py
│   ├── stt_processor.py
│   └── __init__.py
├── vlm_service/           # 이미지/문서→텍스트
│   ├── main.py
│   ├── models.py
│   ├── vlm_processor.py
│   └── __init__.py
└── tts_service/           # 텍스트→음성
    ├── main.py
    ├── models.py
    └── __init__.py
```

## ✅ 장점

1. **확장성**: 각 서비스를 독립적으로 스케일링 가능
2. **유지보수**: 서비스별 독립적인 개발/배포 
3. **안정성**: 한 서비스 장애가 전체에 영향을 주지 않음
4. **기술 스택 다양성**: 서비스별로 최적의 기술 선택 가능
5. **개발 효율성**: 팀별 병렬 개발 가능

## 🔄 기존 LangGraph 대비 장점

- **성능**: 병렬 처리로 더 빠른 응답
- **모듈성**: 각 기능을 독립적으로 개발/테스트
- **유연성**: 필요한 서비스만 선택적 사용 가능
- **확장성**: 새로운 서비스 추가가 용이