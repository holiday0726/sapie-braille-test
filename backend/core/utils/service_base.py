"""
서비스 기본 클래스 - 모든 마이크로서비스의 공통 기반
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager

from ...api.schemas.common import HealthCheckResponse, ServiceStatus


class BaseService(ABC):
    """모든 마이크로서비스의 기본 추상 클래스"""
    
    def __init__(self, service_name: str, version: str = "1.0.0"):
        self.service_name = service_name
        self.version = version
        self.start_time = datetime.now()
        self.is_initialized = False
        self.dependencies: Dict[str, Any] = {}
    
    @property
    def uptime_seconds(self) -> float:
        """서비스 가동 시간 (초)"""
        return (datetime.now() - self.start_time).total_seconds()
    
    @abstractmethod
    async def initialize(self):
        """
        서비스 초기화
        - 데이터베이스 연결
        - 외부 서비스 클라이언트 초기화
        - 필요한 리소스 설정
        """
        pass
    
    @abstractmethod
    async def cleanup(self):
        """
        서비스 종료 시 리소스 정리
        - 데이터베이스 연결 해제
        - 클라이언트 정리
        - 임시 파일 삭제
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> HealthCheckResponse:
        """
        서비스 상태 확인
        - 자체 상태 점검
        - 의존성 서비스 상태 확인
        """
        pass
    
    async def check_dependencies(self) -> Dict[str, ServiceStatus]:
        """의존성 서비스들의 상태 확인"""
        dependency_status = {}
        
        for dep_name, dep_client in self.dependencies.items():
            try:
                if hasattr(dep_client, 'health_check'):
                    health_result = await dep_client.health_check()
                    dependency_status[dep_name] = (
                        ServiceStatus.HEALTHY if health_result.get('healthy', False) 
                        else ServiceStatus.UNHEALTHY
                    )
                else:
                    dependency_status[dep_name] = ServiceStatus.HEALTHY
            except Exception:
                dependency_status[dep_name] = ServiceStatus.UNHEALTHY
        
        return dependency_status
    
    def get_service_info(self) -> Dict[str, Any]:
        """서비스 기본 정보 반환"""
        return {
            "service_name": self.service_name,
            "version": self.version,
            "uptime_seconds": self.uptime_seconds,
            "start_time": self.start_time.isoformat(),
            "is_initialized": self.is_initialized
        }


class ProcessingService(BaseService):
    """처리 작업을 수행하는 서비스의 기본 클래스"""
    
    def __init__(self, service_name: str, version: str = "1.0.0"):
        super().__init__(service_name, version)
        self.active_requests: Dict[str, Dict[str, Any]] = {}
    
    @abstractmethod
    async def process(self, request_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        메인 처리 로직
        
        Args:
            request_id: 요청 고유 ID
            input_data: 입력 데이터
            
        Returns:
            처리 결과
        """
        pass
    
    async def start_processing(self, request_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """처리 시작 (상태 추적 포함)"""
        self.active_requests[request_id] = {
            "status": "processing",
            "start_time": datetime.now(),
            "input_data": input_data
        }
        
        try:
            result = await self.process(request_id, input_data)
            self.active_requests[request_id]["status"] = "completed"
            self.active_requests[request_id]["end_time"] = datetime.now()
            self.active_requests[request_id]["result"] = result
            return result
        except Exception as e:
            self.active_requests[request_id]["status"] = "failed"
            self.active_requests[request_id]["end_time"] = datetime.now()
            self.active_requests[request_id]["error"] = str(e)
            raise
    
    def get_request_status(self, request_id: str) -> Optional[Dict[str, Any]]:
        """요청 상태 조회"""
        return self.active_requests.get(request_id)
    
    def get_active_requests_count(self) -> int:
        """활성 요청 수 반환"""
        return len([req for req in self.active_requests.values() if req.get("status") == "processing"])


# 각 서비스별 구체적인 추상 클래스들

class AssetService(BaseService):
    """Asset Service 추상 클래스"""
    
    @abstractmethod
    async def generate_upload_permission(self, user_id: str, file_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """업로드 허가 및 UID 생성 (DB 저장하지 않음)"""
        pass
    
    @abstractmethod
    async def create_file_from_uid(self, uid: str) -> Dict[str, Any]:
        """UID 기반으로 실제 파일 문서 생성"""
        pass
    
    @abstractmethod
    async def generate_upload_url(self, file_id: str) -> Dict[str, Any]:
        """업로드용 Presigned URL 생성"""
        pass
    
    @abstractmethod
    async def generate_download_url(self, uid: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """다운로드용 Presigned URL 생성 (uid 기반)"""
        pass
    
    @abstractmethod
    async def update_file_status(self, file_id: str, status: str, s3_url: Optional[str] = None) -> bool:
        """파일 상태 업데이트"""
        pass


class ParserService(ProcessingService):
    """Parser Service 추상 클래스 (기존 main_service 역할)"""
    
    @abstractmethod
    async def parse_document(self, file_id: str, extract_images: bool = True) -> Dict[str, Any]:
        """문서 파싱"""
        pass
    
    @abstractmethod
    async def orchestrate_workflow(
        self, 
        request_id: str,
        text: Optional[str] = None,
        file_ids: Optional[list] = None,
        audio_file_id: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """전체 워크플로우 오케스트레이션"""
        pass


class STTService(ProcessingService):
    """STT Service 추상 클래스"""
    
    @abstractmethod
    async def transcribe_audio(self, audio_file_id: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """음성을 텍스트로 변환"""
        pass
    
    @abstractmethod
    async def get_supported_formats(self) -> list:
        """지원하는 오디오 형식 목록"""
        pass


class TTSService(ProcessingService):
    """TTS Service 추상 클래스"""
    
    @abstractmethod
    async def synthesize_speech(
        self, 
        text: str, 
        voice: str = "alloy",
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """텍스트를 음성으로 변환"""
        pass
    
    @abstractmethod
    async def get_available_voices(self) -> list:
        """사용 가능한 음성 목록"""
        pass





# 사용 예시 (구현하지 말고 주석으로만)
"""
각 서비스 구현 예시:

# Asset Service 구현
class AssetServiceImpl(AssetService):
    def __init__(self):
        super().__init__("asset_service")
        self.db_connection = None
        self.file_repo = None
        self.s3_client = None
    
    async def initialize(self):
        self.db_connection = MongoDBConnection()
        await self.db_connection.connect()
        self.file_repo = FileMetadataRepository(self.db_connection)
        self.s3_client = S3Client()
        self.is_initialized = True
    
    async def create_file_metadata(self, user_id: str, file_metadata: Dict[str, Any]):
        # 파일 메타데이터 생성 로직 구현
        pass

# Parser Service 구현
class ParserServiceImpl(ParserService):
    def __init__(self):
        super().__init__("parser_service")
        self.asset_client = None
        self.stt_client = None
        self.tts_client = None
        self.vlm_client = None
    
    async def initialize(self):
        self.asset_client = AssetServiceClient("http://localhost:8004")
        self.stt_client = STTServiceClient("http://localhost:8001")
        # ... 다른 클라이언트 초기화
        self.is_initialized = True
"""
