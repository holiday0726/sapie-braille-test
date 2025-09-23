"""
Asset Service - 파일 메타데이터 및 Presigned URL 관리 마이크로서비스
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import time

# 🔄 복잡한 구현 → 단순한 더미 구현으로 변경 (Dify 중심 아키텍처)
# from .service import AssetServiceImpl
from .simple_service import SimpleAssetServiceImpl as AssetServiceImpl


# Pydantic 모델
class UploadPermissionRequest(BaseModel):
    """업로드 허가 요청"""
    file_metadata: Dict[str, Any] = Field(description="파일 메타데이터")
    user_id: str = Field(description="업로드 사용자 ID")


class UploadPermissionResponse(BaseModel):
    """업로드 허가 응답"""
    uid: str = Field(description="업로드 고유 식별자")
    presigned_upload_url: str = Field(description="S3 업로드용 Presigned URL")
    expires_at: str = Field(description="URL 만료 시간")


class UploadCompleteRequest(BaseModel):
    """업로드 완료 요청"""
    uid: str = Field(description="업로드 고유 식별자")


class DownloadUrlResponse(BaseModel):
    """다운로드 URL 응답"""
    presigned_download_url: str = Field(description="S3 다운로드용 Presigned URL")
    expires_at: str = Field(description="URL 만료 시간")
    file_metadata: Dict[str, Any] = Field(description="파일 메타데이터")


class FileCreateRequest(BaseModel):
    """파일 생성 요청 (uid 기반)"""
    uid: str = Field(description="업로드 시 받은 고유 식별자")


class FileCreateResponse(BaseModel):
    """파일 생성 응답"""
    success: bool = Field(description="생성 성공 여부")
    file_id: str = Field(description="생성된 파일 ID")
    message: str = Field(description="응답 메시지")


# 서비스 인스턴스
asset_service: Optional[AssetServiceImpl] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 생명주기 관리"""
    global asset_service
    
    print("[Asset Service] 초기화 중...")
    try:
        asset_service = AssetServiceImpl()
        await asset_service.initialize()
        print("[Asset Service] 초기화 완료")
    except Exception as e:
        print(f"[Asset Service] 초기화 실패: {e}")
        raise
    
    yield
    
    if asset_service:
        await asset_service.cleanup()
    print("[Asset Service] 종료")


app = FastAPI(
    title="Asset Service",
    description="파일 메타데이터 및 Presigned URL 관리 마이크로서비스",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    if not asset_service:
        raise HTTPException(status_code=503, detail="서비스가 초기화되지 않았습니다")
    
    health_response = await asset_service.health_check()
    return health_response.dict()


@app.post("/files/upload-permission", response_model=UploadPermissionResponse)
async def request_upload_permission(request: UploadPermissionRequest):
    """
    파일 업로드 허가 요청
    
    Args:
        request: 업로드 허가 요청 데이터
        
    Returns:
        업로드 허가 응답 (uid, presigned_upload_url)
    """
    if not asset_service:
        raise HTTPException(status_code=503, detail="Asset 서비스가 준비되지 않았습니다")
    
    try:
        result = await asset_service.generate_upload_permission(
            request.user_id, 
            request.file_metadata
        )
        
        return UploadPermissionResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 허가 처리 중 오류: {str(e)}")


@app.post("/files/upload-complete", response_model=FileCreateResponse)
async def report_upload_completion(request: UploadCompleteRequest):
    """
    파일 업로드 완료 보고 - uid 기반으로 실제 파일 문서 생성
    
    Args:
        request: 업로드 완료 요청 데이터 (uid만 필요)
        
    Returns:
        파일 생성 결과 (file_id 포함)
    """
    if not asset_service:
        raise HTTPException(status_code=503, detail="Asset 서비스가 준비되지 않았습니다")
    
    try:
        result = await asset_service.create_file_from_uid(request.uid)
        
        return FileCreateResponse(**result)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 생성 처리 중 오류: {str(e)}")


@app.get("/files/{uid}/download-url", response_model=DownloadUrlResponse)
async def get_download_url(uid: str, user_id: Optional[str] = None):
    """
    파일 다운로드 URL 요청 (uid 기반)
    
    Args:
        uid: 파일 고유 식별자 (업로드 시 받은 uid 또는 file_id)
        user_id: 요청 사용자 ID (권한 확인용)
        
    Returns:
        다운로드 URL 정보
    """
    if not asset_service:
        raise HTTPException(status_code=503, detail="Asset 서비스가 준비되지 않았습니다")
    
    try:
        result = await asset_service.generate_download_url(uid, user_id)
        return DownloadUrlResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"다운로드 URL 생성 중 오류: {str(e)}")


@app.get("/files/{uid}/metadata")
async def get_file_metadata(uid: str):
    """파일 메타데이터 조회 (uid 기반)"""
    if not asset_service:
        raise HTTPException(status_code=503, detail="Asset 서비스가 준비되지 않았습니다")
    
    try:
        metadata = await asset_service.get_file_metadata(uid)
        if metadata:
            return metadata
        else:
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"메타데이터 조회 중 오류: {str(e)}")


@app.get("/users/{user_id}/files")
async def get_user_files(user_id: str, available_only: bool = True):
    """사용자별 파일 목록 조회"""
    if not asset_service:
        raise HTTPException(status_code=503, detail="Asset 서비스가 준비되지 않았습니다")
    
    try:
        files = await asset_service.get_user_files(user_id, available_only)
        return {"user_id": user_id, "files": files}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 목록 조회 중 오류: {str(e)}")


@app.get("/")
async def root():
    """서비스 정보"""
    return {
        "service": "Asset Service",
        "description": "파일 메타데이터 및 Presigned URL 관리 마이크로서비스",
        "version": "1.0.0",
        "endpoints": {
            "upload_permission": "POST /files/upload-permission - 업로드 허가 요청",
            "upload_complete": "POST /files/upload-complete - 업로드 완료 보고",
            "download_url": "GET /files/{file_id}/download-url - 다운로드 URL 요청",
            "metadata": "GET /files/{file_id}/metadata - 파일 메타데이터 조회",
            "user_files": "GET /users/{user_id}/files - 사용자 파일 목록",
            "health": "GET /health - 상태 확인"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
