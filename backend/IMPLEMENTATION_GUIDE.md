# MSA 기반 AI 서비스 플랫폼 - 구현 가이드라인

## 개요

이 문서는 guideline.md에 정의된 MSA 아키텍처를 구현하기 위한 가이드라인을 제공합니다.

## 프로젝트 구조

```
backend/
├── api/                    # 서비스 간 통신
│   ├── clients/           # 각 서비스 API 클라이언트
│   │   ├── base_client.py
│   │   ├── asset_client.py
│   │   └── ...
│   └── schemas/           # 공통 데이터 모델
│       └── common.py
├── core/                  # 공통 핵심 기능
│   ├── utils/
│   │   └── service_base.py  # 서비스 기본 클래스
│   ├── exception/
│   ├── logging/
│   └── utils/
├── infra/                 # 외부 인프라 통신
│   ├── db/               # 데이터베이스 연결
│   │   └── mongodb.py
│   ├── s3/               # S3 유틸리티
│   └── docker/
└── services/             # 마이크로서비스들
    ├── api_gateway/      # 🆕 API 게이트웨이 (L7 라우팅)
    ├── asset_service/    # 파일 메타데이터 관리 (MongoDB)
    ├── parser_service/   # 문서 파싱 & 오케스트레이션
    ├── stt_service/      # 🆕 음성-텍스트 변환
    └── tts_service/      # 🆕 텍스트-음성 변환
```

## 서비스 포트 매핑

| 서비스 | 포트 | 역할 |
|--------|------|------|
| API Gateway | 8080 | L7 라우팅, 클라이언트 진입점 |
| Parser Service | 8000 | 워크플로우 오케스트레이션, 문서 파싱 |
| STT Service | 8001 | 음성 → 텍스트 변환 |
| TTS Service | 8003 | 텍스트 → 음성 변환 |
| Asset Service | 8004 | 파일 메타데이터 관리 |

## 핵심 컴포넌트 구현 가이드

### 1. API Gateway (포트 8080)

**핵심 역할:**
- 순수 L7 라우팅 (HTTP 경로 기반)
- 클라이언트 요청을 적절한 마이크로서비스로 전달
- 통합 헬스체크 제공

**라우팅 패턴:**
```
http://agent.sapie.ai:8080/{service_name}/{path}
```

**구현 예시:**
```python
SERVICE_ROUTES = {
    "asset": "http://localhost:8004",
    "parser": "http://localhost:8000", 
    "stt": "http://localhost:8001",
    "tts": "http://localhost:8003"
}

@app.api_route("/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_request(service_name: str, path: str, request: Request):
    target_url = f"{SERVICE_ROUTES[service_name]}/{path}"
    # 요청 프록시 로직
```

### 2. Asset Service (포트 8004)

**핵심 책임:**
- 파일 메타데이터 관리 (MongoDB)
- Presigned URL 생성 (S3)
- 파일 상태 추적

**주요 API:**
```python
POST /files/upload-permission    # 업로드 허가 요청
POST /files/upload-complete      # 업로드 완료 보고  
GET /files/{file_id}/download-url # 다운로드 URL 요청
GET /files/{file_id}/metadata    # 파일 메타데이터 조회
```

### 3. Parser Service (포트 8000)

**핵심 책임:**
- 전체 워크플로우 오케스트레이션
- 문서 파싱 및 텍스트 추출
- 다른 서비스들 간의 데이터 흐름 관리
- 통합 처리 결과 제공

**간단한 서비스 호출 방식:**
```python
async def process(self, request_id: str, input_data: Dict[str, Any]):
    final_text = input_data.get("text", "")
    
    # STT 처리 (음성 파일이 있는 경우)
    if input_data.get("audio_file_id"):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8001/transcribe",
                json={"audio_file_id": input_data["audio_file_id"]}
            )
            stt_result = response.json()
            final_text += stt_result.get("transcription", "")
    
    # 문서 파싱 처리 (파일이 있는 경우)
    if input_data.get("file_ids"):
        for file_id in input_data["file_ids"]:
            parse_result = await self.parse_document(file_id)
            final_text += parse_result.get("extracted_text", "")
    
    # TTS 처리
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8003/synthesize",
            json={"text": final_text, "voice": "alloy"}
        )
        tts_result = response.json()
    
    return {
        "success": True,
        "final_text": final_text,
        "audio_file_id": tts_result.get("file_id")
    }
```

### 4. STT Service (포트 8001)

**핵심 책임:**
- 음성 파일을 텍스트로 변환
- OpenAI Whisper API 연동
- 다양한 오디오 형식 지원

**주요 API:**
```python
POST /transcribe     # 음성 변환
GET /formats         # 지원 형식 조회
GET /health          # 상태 확인
```

### 5. TTS Service (포트 8003)

**핵심 책임:**
- 텍스트를 음성으로 변환
- OpenAI TTS API 연동
- 생성된 오디오를 Asset Service를 통해 저장

**주요 API:**
```python
POST /synthesize        # 텍스트 음성 변환
GET /voices            # 사용 가능한 음성 조회
POST /synthesize-batch # 일괄 변환
```



## 실제 사용 흐름 예시

### 1. 파일 업로드 워크플로우
  
```bash
# 1. 클라이언트 → API Gateway → Asset Service (업로드 허가)
curl -X POST http://agent.sapie.ai:8080/asset/files/upload-permission \
  -H "Content-Type: application/json" \
  -d '{
    "file_metadata": {"filename": "document.pdf", "contentType": "application/pdf"},
    "user_id": "user-123"
  }'

# 응답: {"file_id": "abc123", "presigned_upload_url": "https://..."}

# 2. 클라이언트 → S3 (직접 업로드)
curl -X PUT "presigned_upload_url" \
  --data-binary @document.pdf

# 3. 클라이언트 → API Gateway → Asset Service (완료 보고)
curl -X POST http://agent.sapie.ai:8080/asset/files/upload-complete \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "abc123",
    "s3_url": "https://bucket.s3.amazonaws.com/files/abc123"
  }'
```

### 2. 통합 처리 워크플로우

```bash
# 클라이언트 → API Gateway → Parser Service
curl -X POST http://agent.sapie.ai:8080/parser/process \
  -H "Content-Type: application/json" \
  -d '{
    "text": "추가 텍스트",
    "file_ids": ["abc123"],
    "audio_file_id": "audio456",
    "options": {"tts_voice": "alloy"}
  }'

# Parser Service 내부에서 자동으로:
# 1. STT Service 호출 (audio_file_id가 있는 경우)
# 2. 문서 파싱 (file_ids가 있는 경우)  
# 3. 텍스트 통합 및 후처리
# 4. TTS Service 호출

# 최종 응답:
# {
#   "success": true,
#   "final_text": "통합된 최종 텍스트",
#   "audio_file_id": "generated_audio_789"
# }
```

### 3. 개별 서비스 직접 호출

```bash
# STT 서비스 직접 호출
curl -X POST http://agent.sapie.ai:8080/stt/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_file_id": "audio456"}'

# TTS 서비스 직접 호출  
curl -X POST http://agent.sapie.ai:8080/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요", "voice": "alloy"}'

# 문서 파싱 직접 호출
curl -X POST http://agent.sapie.ai:8080/parser/parse \
  -H "Content-Type: application/json" \
  -d '{"file_id": "abc123", "extract_images": true}'
```

## 환경 변수 설정

```bash
# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=sapie_braille

# S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=ap-northeast-2

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## 서비스 시작 순서

1. **MongoDB 시작**
2. **Asset Service 시작** (포트 8004)
3. **STT, TTS Service 시작** (포트 8001, 8003)
4. **Parser Service 시작** (포트 8000)
5. **API Gateway 시작** (포트 8080)

## 개발 및 테스트

### 헬스체크

```bash
# 전체 시스템 상태 확인
curl http://agent.sapie.ai:8080/health

# 개별 서비스 상태 확인
curl http://localhost:8001/health  # STT Service
curl http://localhost:8003/health  # TTS Service
curl http://localhost:8004/health  # Asset Service
```

### 로그 확인

각 서비스는 구조화된 로깅을 제공하여 디버깅을 지원합니다.

## 주요 장점

1. **단순성**: 복잡한 워크플로우 관리 없이 직접적인 서비스 호출
2. **투명성**: 서비스 간 호출 흐름이 명확하게 보임
3. **디버깅 용이**: 각 호출을 개별적으로 추적 가능
4. **확장성**: 필요시 개별 서비스 독립적 확장
5. **유지보수성**: 각 서비스가 명확한 책임을 가짐

이 가이드라인을 따라 구현하면 **간단하면서도 효과적인 MSA 시스템**을 구축할 수 있습니다.