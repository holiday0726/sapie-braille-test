"""
Asset Service 클라이언트 - 파일 메타데이터 및 Presigned URL 관리
"""
from typing import Dict, Any, Optional
from .base_client import BaseServiceClient


class AssetServiceClient(BaseServiceClient):
    """Asset Service와의 통신을 담당하는 클라이언트"""
    
    async def get_service_info(self) -> Dict[str, Any]:
        """Asset Service 정보 조회"""
        return await self._make_request("GET", "/info")
    
    async def request_upload_permission(
        self, 
        file_metadata: Dict[str, Any], 
        user_id: str
    ) -> Dict[str, Any]:
        """
        파일 업로드 허가 요청
        
        Args:
            file_metadata: 파일 메타데이터 (filename, contentType 등)
            user_id: 업로드 요청 사용자 ID
            
        Returns:
            {
                "uid": "업로드 고유 식별자",
                "presigned_upload_url": "S3 업로드용 Presigned URL",
                "expires_at": "URL 만료 시간"
            }
        """
        data = {
            "file_metadata": file_metadata,
            "user_id": user_id
        }
        return await self._make_request("POST", "/files/upload-permission", data=data)
    
    async def report_upload_completion(
        self, 
        uid: str
    ) -> Dict[str, Any]:
        """
        파일 업로드 완료 보고 (uid 기반)
        
        Args:
            uid: 업로드 허가 시 받은 고유 식별자
            
        Returns:
            파일 생성 결과 (file_id 포함)
        """
        data = {
            "uid": uid
        }
        return await self._make_request("POST", "/files/upload-complete", data=data)
    
    async def request_download_url(
        self, 
        uid: str, 
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        파일 다운로드 URL 요청 (uid 기반)
        
        Args:
            uid: 파일 고유 식별자 (file_id 또는 upload_uid)
            user_id: 요청 사용자 ID (권한 확인용)
            
        Returns:
            {
                "presigned_download_url": "S3 다운로드용 Presigned URL",
                "expires_at": "URL 만료 시간",
                "file_metadata": "파일 메타데이터"
            }
        """
        params = {"user_id": user_id} if user_id else {}
        return await self._make_request("GET", f"/files/{uid}/download-url", params=params)
    
    async def get_file_metadata(self, uid: str) -> Dict[str, Any]:
        """
        파일 메타데이터 조회 (uid 기반)
        
        Args:
            uid: 파일 고유 식별자
            
        Returns:
            파일 메타데이터
        """
        return await self._make_request("GET", f"/files/{uid}/metadata")
    
    async def update_file_status(
        self, 
        file_id: str, 
        status: str, 
        metadata_updates: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        파일 상태 업데이트
        
        Args:
            file_id: 파일 ID
            status: 새로운 상태
            metadata_updates: 추가 메타데이터 업데이트
            
        Returns:
            업데이트 결과
        """
        data = {
            "status": status,
            "metadata_updates": metadata_updates or {}
        }
        return await self._make_request("PATCH", f"/files/{file_id}/status", data=data)


# 사용 예시 (구현하지 말고 주석으로만)
"""
사용 예시:

async def upload_file_workflow():
    async with AssetServiceClient("http://localhost:8004") as client:
        # 1. 업로드 허가 요청
        permission = await client.request_upload_permission(
            file_metadata={"filename": "document.pdf", "contentType": "application/pdf"},
            user_id="user-123"
        )
        
        # 2. S3에 직접 업로드 (infra.s3.utils 사용)
        # upload_result = await upload_to_s3(permission["presigned_upload_url"], file_data)
        
        # 3. 업로드 완료 보고
        result = await client.report_upload_completion(
            file_id=permission["file_id"],
            s3_url=upload_result["s3_url"]
        )
"""
