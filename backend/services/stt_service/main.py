"""
STT Service - 음성을 텍스트로 변환하는 마이크로서비스
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import time

from .service import STTServiceImpl


# Pydantic 모델
class TranscribeRequest(BaseModel):
    """음성 변환 요청"""
    audio_file_id: str = Field(description="변환할 오디오 파일 ID")
    language: Optional[str] = Field(default=None, description="음성 언어 (자동 감지 시 None)")
    response_format: str = Field(default="json", description="응답 형식")
    temperature: float = Field(default=0.0, description="변환 창의성 (0.0-1.0)")


class TranscribeResponse(BaseModel):
    """음성 변환 응답"""
    success: bool = Field(description="변환 성공 여부")
    audio_file_id: str = Field(description="원본 오디오 파일 ID")
    transcription: Optional[str] = Field(default=None, description="변환된 텍스트")
    language: Optional[str] = Field(default=None, description="감지된 언어")
    confidence: Optional[float] = Field(default=None, description="변환 신뢰도")
    duration: Optional[float] = Field(default=None, description="오디오 길이 (초)")
    processing_time: Optional[float] = Field(default=None, description="처리 시간 (초)")
    error: Optional[str] = Field(default=None, description="오류 메시지")


class SupportedFormatsResponse(BaseModel):
    """지원 형식 응답"""
    supported_formats: List[str] = Field(description="지원하는 오디오 형식 목록")


# 서비스 인스턴스
stt_service: Optional[STTServiceImpl] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 생명주기 관리"""
    global stt_service
    
    print("[STT Service] 초기화 중...")
    try:
        stt_service = STTServiceImpl()
        await stt_service.initialize()
        print("[STT Service] 초기화 완룼")
    except Exception as e:
        print(f"[STT Service] 초기화 실패: {e}")
        raise
    
    yield
    
    if stt_service:
        await stt_service.cleanup()
    print("[STT Service] 종료")


app = FastAPI(
    title="STT Service",
    description="음성을 텍스트로 변환하는 마이크로서비스",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    if not stt_service:
        raise HTTPException(status_code=503, detail="서비스가 초기화되지 않았습니다")
    
    health_response = await stt_service.health_check()
    return health_response.dict()


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    """
    음성을 텍스트로 변환
    
    Args:
        request: 변환 요청 데이터
        
    Returns:
        변환 결과
    """
    if not stt_service:
        raise HTTPException(status_code=503, detail="STT 서비스가 준비되지 않았습니다")
    
    start_time = time.time()
    request_id = f"stt_{int(start_time)}_{hash(request.audio_file_id)%1000:03d}"
    
    try:
        # 요청 데이터 준비
        input_data = {
            "audio_file_id": request.audio_file_id,
            "options": {
                "language": request.language,
                "response_format": request.response_format,
                "temperature": request.temperature
            }
        }
        
        # STT 처리 실행
        result = await stt_service.start_processing(request_id, input_data)
        
        return TranscribeResponse(**result)
        
    except Exception as e:
        return TranscribeResponse(
            success=False,
            audio_file_id=request.audio_file_id,
            error=f"STT 처리 중 오류: {str(e)}"
        )


@app.get("/formats", response_model=SupportedFormatsResponse)
async def get_supported_formats():
    """지원하는 오디오 형식 목록 조회"""
    if not stt_service:
        raise HTTPException(status_code=503, detail="STT 서비스가 준비되지 않았습니다")
    
    formats = await stt_service.get_supported_formats()
    return SupportedFormatsResponse(supported_formats=formats)


@app.get("/status/{request_id}")
async def get_request_status(request_id: str):
    """요청 처리 상태 확인"""
    if not stt_service:
        raise HTTPException(status_code=503, detail="STT 서비스가 준비되지 않았습니다")
    
    status = stt_service.get_request_status(request_id)
    if not status:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다")
    
    return status


@app.get("/")
async def root():
    """서비스 정보"""
    return {
        "service": "STT Service",
        "description": "음성을 텍스트로 변환하는 마이크로서비스",
        "version": "1.0.0",
        "endpoints": {
            "transcribe": "POST /transcribe - 음성 변환",
            "formats": "GET /formats - 지원 형식 조회",
            "health": "GET /health - 상태 확인"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)