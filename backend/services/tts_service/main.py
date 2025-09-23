"""
TTS Service - 텍스트를 음성으로 변환하는 마이크로서비스
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import time

from .service import TTSServiceImpl


# Pydantic 모델
class SynthesizeRequest(BaseModel):
    """음성 합성 요청"""
    text: str = Field(description="변환할 텍스트", max_length=4096)
    voice: str = Field(default="alloy", description="사용할 음성")
    speed: float = Field(default=1.0, description="재생 속도 (0.25-4.0)", ge=0.25, le=4.0)
    format: str = Field(default="mp3", description="출력 형식 (mp3, opus, aac, flac)")


class SynthesizeResponse(BaseModel):
    """음성 합성 응답"""
    success: bool = Field(description="합성 성공 여부")
    text: Optional[str] = Field(default=None, description="원본 텍스트")
    voice: Optional[str] = Field(default=None, description="사용된 음성")
    file_id: Optional[str] = Field(default=None, description="생성된 오디오 파일 ID")
    s3_url: Optional[str] = Field(default=None, description="오디오 파일 S3 URL")
    duration: Optional[float] = Field(default=None, description="오디오 길이 (초)")
    file_size: Optional[int] = Field(default=None, description="파일 크기 (bytes)")
    format: Optional[str] = Field(default=None, description="오디오 형식")
    processing_time: Optional[float] = Field(default=None, description="처리 시간 (초)")
    error: Optional[str] = Field(default=None, description="오류 메시지")


class VoicesResponse(BaseModel):
    """음성 목록 응답"""
    available_voices: List[str] = Field(description="사용 가능한 음성 목록")


# 서비스 인스턴스
tts_service: Optional[TTSServiceImpl] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 생명주기 관리"""
    global tts_service
    
    print("[TTS Service] 초기화 중...")
    try:
        tts_service = TTSServiceImpl()
        await tts_service.initialize()
        print("[TTS Service] 초기화 완료")
    except Exception as e:
        print(f"[TTS Service] 초기화 실패: {e}")
        raise
    
    yield
    
    if tts_service:
        await tts_service.cleanup()
    print("[TTS Service] 종료")


app = FastAPI(
    title="TTS Service",
    description="텍스트를 음성으로 변환하는 마이크로서비스",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    if not tts_service:
        raise HTTPException(status_code=503, detail="서비스가 초기화되지 않았습니다")
    
    health_response = await tts_service.health_check()
    return health_response.dict()


@app.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(request: SynthesizeRequest):
    """
    텍스트를 음성으로 변환
    
    Args:
        request: 합성 요청 데이터
        
    Returns:
        합성 결과 (생성된 오디오 파일 정보)
    """
    if not tts_service:
        raise HTTPException(status_code=503, detail="TTS 서비스가 준비되지 않았습니다")
    
    start_time = time.time()
    request_id = f"tts_{int(start_time)}_{hash(request.text)%1000:03d}"
    
    try:
        # 요청 데이터 준비
        input_data = {
            "text": request.text,
            "voice": request.voice,
            "options": {
                "speed": request.speed,
                "format": request.format
            }
        }
        
        # TTS 처리 실행
        result = await tts_service.start_processing(request_id, input_data)
        
        return SynthesizeResponse(**result)
        
    except Exception as e:
        return SynthesizeResponse(
            success=False,
            text=request.text,
            voice=request.voice,
            error=f"TTS 처리 중 오류: {str(e)}"
        )


@app.get("/voices", response_model=VoicesResponse)
async def get_available_voices():
    """사용 가능한 음성 목록 조회"""
    if not tts_service:
        raise HTTPException(status_code=503, detail="TTS 서비스가 준비되지 않았습니다")
    
    voices = await tts_service.get_available_voices()
    return VoicesResponse(available_voices=voices)


@app.get("/status/{request_id}")
async def get_request_status(request_id: str):
    """요청 처리 상태 확인"""
    if not tts_service:
        raise HTTPException(status_code=503, detail="TTS 서비스가 준비되지 않았습니다")
    
    status = tts_service.get_request_status(request_id)
    if not status:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다")
    
    return status


@app.post("/synthesize-batch")
async def synthesize_batch(requests: List[SynthesizeRequest]):
    """
    여러 텍스트를 일괄 음성 변환
    
    Args:
        requests: 합성 요청 목록
        
    Returns:
        일괄 처리 결과
    """
    if not tts_service:
        raise HTTPException(status_code=503, detail="TTS 서비스가 준비되지 않았습니다")
    
    results = []
    for i, req in enumerate(requests):
        try:
            request_id = f"batch_tts_{i}_{int(time.time())}"
            
            input_data = {
                "text": req.text,
                "voice": req.voice,
                "options": {
                    "speed": req.speed,
                    "format": req.format
                }
            }
            
            result = await tts_service.start_processing(request_id, input_data)
            results.append(SynthesizeResponse(**result))
            
        except Exception as e:
            results.append(SynthesizeResponse(
                success=False,
                text=req.text,
                voice=req.voice,
                error=f"배치 처리 오류: {str(e)}"
            ))
    
    return {
        "batch_results": results,
        "total_requests": len(requests),
        "successful": sum(1 for r in results if r.success),
        "failed": sum(1 for r in results if not r.success)
    }


@app.get("/")
async def root():
    """서비스 정보"""
    return {
        "service": "TTS Service",
        "description": "텍스트를 음성으로 변환하는 마이크로서비스",
        "version": "1.0.0",
        "endpoints": {
            "synthesize": "POST /synthesize - 텍스트 음성 변환",
            "voices": "GET /voices - 사용 가능한 음성 조회",
            "batch": "POST /synthesize-batch - 일괄 변환",
            "health": "GET /health - 상태 확인"
        },
        "supported_voices": [
            "alloy", "echo", "fable", "onyx", "nova", "shimmer"
        ],
        "supported_formats": [
            "mp3", "opus", "aac", "flac"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)