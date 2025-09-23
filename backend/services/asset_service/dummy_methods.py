"""
Asset Service 더미 구현 메소드들
Dify 중심 아키텍처에서 사용할 간단한 더미 구현
"""

# Asset Service의 핵심 더미 메소드들

async def generate_upload_permission(self, user_id: str, file_metadata: dict) -> dict:
    """파일 업로드 허가 - 더미 구현"""
    import uuid
    from datetime import datetime, timedelta
    
    uid = str(uuid.uuid4())
    
    # 더미 저장소에 임시 저장
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

async def create_file_from_uid(self, uid: str) -> dict:
    """업로드 완료 후 파일 생성 - 더미 구현"""
    
    if uid not in self.dummy_files:
        raise ValueError(f"File with uid {uid} not found")
    
    # 더미 파일 정보 업데이트
    self.dummy_files[uid]["status"] = "completed"
    self.dummy_files[uid]["file_id"] = uid  # 간단히 uid를 file_id로 사용
    
    return {
        "success": True,
        "file_id": uid,
        "message": "파일이 성공적으로 생성되었습니다 (더미 모드)"
    }

async def generate_download_url(self, uid: str, user_id: str = None) -> dict:
    """다운로드 URL 생성 - 더미 구현"""
    from datetime import datetime, timedelta
    
    if uid not in self.dummy_files:
        raise ValueError(f"File with uid {uid} not found")
    
    file_info = self.dummy_files[uid]
    
    return {
        "presigned_download_url": f"https://dummy-s3.example.com/download/{uid}",
        "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "file_metadata": file_info["metadata"]
    }

async def get_file_metadata(self, uid: str) -> dict:
    """파일 메타데이터 조회 - 더미 구현"""
    
    if uid not in self.dummy_files:
        return None
    
    return self.dummy_files[uid]

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