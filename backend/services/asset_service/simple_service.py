"""
간단한 Asset Service 더미 구현
복잡한 MongoDB/S3 로직을 제거하고 Dify 중심으로 단순화
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid

from ...core.utils.service_base import AssetService
from ...api.schemas.common import HealthCheckResponse, ServiceStatus

class SimpleAssetServiceImpl(AssetService):
    """단순화된 Asset Service 구현체"""
    
    def __init__(self):
        super().__init__("asset_service", "1.0.0")
        self.dummy_files = {}
        self.is_initialized = False
    
    async def initialize(self):
        """서비스 초기화"""
        self.is_initialized = True
        print(f"[{self.service_name}] 단순화된 더미 모드로 초기화 완료")
        print(f"[{self.service_name}] 실제 파일 처리는 Dify에서 담당합니다")
    
    async def cleanup(self):
        """리소스 정리"""
        self.dummy_files.clear()
        print(f"[{self.service_name}] 더미 저장소 정리 완료")
    
    async def health_check(self) -> HealthCheckResponse:
        """서비스 상태 확인"""
        dependencies = {"dummy_mode": ServiceStatus.HEALTHY}
        overall_status = ServiceStatus.HEALTHY if self.is_initialized else ServiceStatus.UNHEALTHY
        
        return HealthCheckResponse(
            service_name=self.service_name,
            status=overall_status,
            version=self.version,
            uptime_seconds=self.uptime_seconds,
            dependencies=dependencies
        )
    
    async def generate_upload_permission(self, user_id: str, file_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """업로드 허가 - 더미 구현"""
        uid = str(uuid.uuid4())
        
        self.dummy_files[uid] = {
            "user_id": user_id,
            "metadata": file_metadata,
            "status": "pending_upload",
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "uid": uid,
            "presigned_upload_url": f"https://dummy-s3.example.com/upload/{uid}",
            "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
    
    async def create_file_from_uid(self, uid: str) -> Dict[str, Any]:
        """파일 생성 - 더미 구현"""
        if uid not in self.dummy_files:
            raise ValueError(f"File with uid {uid} not found")
        
        self.dummy_files[uid]["status"] = "completed"
        self.dummy_files[uid]["file_id"] = uid
        
        return {
            "success": True,
            "file_id": uid,
            "message": "파일이 성공적으로 생성되었습니다 (더미 모드)"
        }
    
    async def generate_download_url(self, uid: str, user_id: str = None) -> Dict[str, Any]:
        """다운로드 URL 생성 - 더미 구현"""
        if uid not in self.dummy_files:
            raise ValueError(f"File with uid {uid} not found")
        
        file_info = self.dummy_files[uid]
        
        return {
            "presigned_download_url": f"https://dummy-s3.example.com/download/{uid}",
            "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "file_metadata": file_info["metadata"]
        }
    
    async def get_file_metadata(self, uid: str) -> Optional[Dict[str, Any]]:
        """파일 메타데이터 조회 - 더미 구현"""
        return self.dummy_files.get(uid)
    
    async def get_user_files(self, user_id: str, available_only: bool = True) -> list:
        """사용자 파일 목록 - 더미 구현"""
        user_files = []
        for uid, file_info in self.dummy_files.items():
            if file_info["user_id"] == user_id:
                if not available_only or file_info["status"] == "completed":
                    user_files.append({
                        "uid": uid,
                        "file_id": file_info.get("file_id", uid),
                        "metadata": file_info["metadata"],
                        "status": file_info["status"],
                        "created_at": file_info["created_at"]
                    })
        return user_files