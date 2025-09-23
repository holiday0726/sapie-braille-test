"""
STT Service 구현 - 음성을 텍스트로 변환
"""
from typing import Dict, Any, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

from ...core.utils.service_base import STTService
from ...api.clients.asset_client import AssetServiceClient
from ...api.schemas.common import HealthCheckResponse, ServiceStatus


class STTServiceImpl(STTService):
    """STT Service 구현체"""
    
    def __init__(self):
        super().__init__("stt_service", "1.0.0")
        
        # 🔑 OpenAI API 키 로드 - 지정된 환경 파일에서
        load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env.openAI'))
        
        # 외부 서비스 클라이언트
        self.asset_client: Optional[AssetServiceClient] = None
        
        # OpenAI API 설정
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY not found in .env.openAI file")
        
        # 지원하는 오디오 형식
        self.supported_formats = [
            "mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"
        ]
    
    async def initialize(self):
        """서비스 초기화"""
        try:
            # Asset Service 클라이언트 초기화
            self.asset_client = AssetServiceClient("http://localhost:8004")
            await self.asset_client.initialize()
            
            # 의존성 등록
            self.dependencies = {
                "asset_service": self.asset_client
            }
            
            self.is_initialized = True
            print(f"[{self.service_name}] 초기화 완료")
            
        except Exception as e:
            print(f"[{self.service_name}] 초기화 실패: {e}")
            raise
    
    async def cleanup(self):
        """리소스 정리"""
        if self.asset_client:
            await self.asset_client.cleanup()
        
        print(f"[{self.service_name}] 정리 완료")
    
    async def health_check(self) -> HealthCheckResponse:
        """서비스 상태 확인"""
        dependency_status = await self.check_dependencies()
        
        overall_status = ServiceStatus.HEALTHY
        if not self.is_initialized:
            overall_status = ServiceStatus.UNHEALTHY
        elif not self.openai_api_key:
            overall_status = ServiceStatus.DEGRADED
        elif any(status == ServiceStatus.UNHEALTHY for status in dependency_status.values()):
            overall_status = ServiceStatus.DEGRADED
        
        return HealthCheckResponse(
            service_name=self.service_name,
            status=overall_status,
            version=self.version,
            uptime_seconds=self.uptime_seconds,
            dependencies=dependency_status
        )
    
    async def process(self, request_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """메인 처리 로직"""
        audio_file_id = input_data.get("audio_file_id")
        options = input_data.get("options", {})
        
        return await self.transcribe_audio(audio_file_id, options)
    
    async def transcribe_audio(self, audio_file_id: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        음성을 텍스트로 변환
        
        Args:
            audio_file_id: 변환할 오디오 파일 ID
            options: 변환 옵션 (언어, 모델 등)
            
        Returns:
            변환 결과
        """
        if not self.asset_client:
            raise RuntimeError("Asset 클라이언트가 초기화되지 않았습니다")
        
        try:
            # 1. Asset Service에서 파일 다운로드 URL 요청
            download_info = await self.asset_client.request_download_url(audio_file_id)
            
            # 2. 파일 메타데이터 확인
            file_metadata = download_info.get("file_metadata", {})
            content_type = file_metadata.get("content_type", "")
            
            # 3. 지원하는 형식인지 확인
            if not self._is_supported_format(content_type):
                return {
                    "success": False,
                    "error": f"지원하지 않는 오디오 형식입니다: {content_type}",
                    "supported_formats": self.supported_formats
                }
            
            # 4. 실제 STT 처리 (OpenAI Whisper API 호출)
            transcription_result = await self._process_with_whisper(
                download_info["presigned_download_url"],
                options or {}
            )
            
            return {
                "success": True,
                "audio_file_id": audio_file_id,
                "transcription": transcription_result["text"],
                "language": transcription_result.get("language", "unknown"),
                "confidence": transcription_result.get("confidence", 0.0),
                "duration": transcription_result.get("duration", 0.0),
                "processing_time": transcription_result.get("processing_time", 0.0)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "audio_file_id": audio_file_id
            }
    
    async def get_supported_formats(self) -> list:
        """지원하는 오디오 형식 목록"""
        return self.supported_formats.copy()
    
    def _is_supported_format(self, content_type: str) -> bool:
        """지원하는 오디오 형식인지 확인"""
        if not content_type:
            return False
        
        # MIME 타입에서 확장자 추출
        if content_type.startswith("audio/"):
            format_name = content_type.split("/")[1]
            return format_name in self.supported_formats
        
        return False
    
    async def _process_with_whisper(self, audio_url: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """
        OpenAI Whisper API를 사용한 실제 STT 처리
        
        Args:
            audio_url: 오디오 파일 다운로드 URL
            options: 처리 옵션
            
        Returns:
            STT 처리 결과
        """
        # 실제 구현 시 OpenAI API 호출
        # 현재는 더미 응답 반환
        
        # TODO: 실제 구현
        # import openai
        # import httpx
        # 
        # # 1. 오디오 파일 다운로드
        # async with httpx.AsyncClient() as client:
        #     audio_response = await client.get(audio_url)
        #     audio_data = audio_response.content
        # 
        # # 2. OpenAI Whisper API 호출
        # openai.api_key = self.openai_api_key
        # result = openai.Audio.transcribe(
        #     model="whisper-1",
        #     file=audio_data,
        #     language=options.get("language"),
        #     response_format="json"
        # )
        
        # 더미 응답 (실제 구현 시 제거)
        return {
            "text": "음성에서 변환된 텍스트입니다. (더미 데이터 - 실제 구현 필요)",
            "language": options.get("language", "ko"),
            "confidence": 0.95,
            "duration": 10.5,
            "processing_time": 2.3
        }


# 구현 가이드라인 (주석)
"""
실제 구현 시 고려사항:

1. OpenAI Whisper API 연동:
   - API 키 설정 및 보안 관리
   - 요청 제한 및 재시도 로직
   - 다양한 언어 지원
   - 응답 형식 선택 (text, json, srt, verbose_json 등)

2. 오디오 파일 처리:
   - 파일 크기 제한 (25MB)
   - 긴 오디오 파일 분할 처리
   - 다양한 오디오 형식 지원
   - 오디오 품질 최적화

3. 성능 최적화:
   - 비동기 처리로 동시 요청 처리
   - 결과 캐싱 (동일한 파일 재처리 방지)
   - 스트리밍 처리 (실시간 변환)

4. 오류 처리:
   - 네트워크 오류 재시도
   - API 제한 초과 시 대기
   - 지원하지 않는 형식 처리
   - 품질이 낮은 오디오 처리

5. 모니터링:
   - 변환 성공률 추적
   - 평균 처리 시간 측정
   - API 사용량 모니터링
   - 오류 발생 패턴 분석
"""
