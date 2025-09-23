"""
Asset Service 구현 - 파일 메타데이터 및 Presigned URL 관리
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid

from ...core.utils.service_base import AssetService
# 🔄 MongoDB import - Dify 중심 아키텍처로 단순화하여 주석 처리
# from ...infra.db.mongodb import MongoDBConnection, FileMetadataRepository
from ...api.schemas.common import HealthCheckResponse, ServiceStatus, FileStatus


class AssetServiceImpl(AssetService):
    """Asset Service 구현체"""
    
    def __init__(self):
        super().__init__("asset_service", "1.0.0")
        
        # 🔄 MongoDB 연결 및 리포지토리 - Dify 중심 아키텍처로 단순화하여 주석 처리
        # self.db_connection: Optional[MongoDBConnection] = None
        # self.file_repo: Optional[FileMetadataRepository] = None
        
        # 🔄 S3 클라이언트 - Dify 중심 아키텍처로 단순화하여 주석 처리
        # self.s3_client: Optional[S3Client] = None
        
        # 🎯 단순화된 더미 저장소 (Dify가 파일 처리를 담당)
        self.dummy_files = {}
    
    async def initialize(self):
        """서비스 초기화"""
        # 🔄 MongoDB 연결 시도 - Dify 중심 아키텍처로 단순화하여 주석 처리
        # try:
        #     self.db_connection = MongoDBConnection()
        #     await self.db_connection.connect()
        #     
        #     # 리포지토리 초기화
        #     self.file_repo = FileMetadataRepository(self.db_connection)
        #     await self.file_repo.create_indexes()
        #     
        #     print(f"[{self.service_name}] MongoDB 연결 성공")
        #     
        # except Exception as db_error:
        #     print(f"[{self.service_name}] MongoDB 연결 실패: {db_error}")
        #     print(f"[{self.service_name}] MongoDB 없이 제한된 모드로 시작됩니다")
        #     
        #     # MongoDB 연결 실패 시 None으로 설정
        #     self.db_connection = None
        #     self.file_repo = None
        
        try:
            # 🔄 S3 클라이언트 초기화 - Dify 중심 아키텍처로 단순화하여 주석 처리  
            # self.s3_client = S3Client()
            
            # 🎯 단순화된 더미 모드 초기화 (Dify가 실제 파일 처리를 담당)
            self.is_initialized = True
            print(f"[{self.service_name}] 단순화된 더미 모드로 초기화 완료")
            print(f"[{self.service_name}] 실제 파일 처리는 Dify에서 담당합니다")
            
        except Exception as e:
            print(f"[{self.service_name}] 초기화 실패: {e}")
            raise
    
    async def cleanup(self):
        """리소스 정리"""
        if self.db_connection:
            await self.db_connection.disconnect()
        
        print(f"[{self.service_name}] 정리 완료")
    
    async def health_check(self) -> HealthCheckResponse:
        """서비스 상태 확인"""
        dependencies = {}
        
        # MongoDB 상태 확인
        if self.db_connection:
            mongo_health = await self.db_connection.health_check()
            dependencies["mongodb"] = (
                ServiceStatus.HEALTHY if mongo_health.get("healthy", False)
                else ServiceStatus.UNHEALTHY
            )
        
        # S3 상태 확인 (구현 필요)
        # if self.s3_client:
        #     s3_health = await self.s3_client.health_check()
        #     dependencies["s3"] = ServiceStatus.HEALTHY if s3_health.get("healthy", False) else ServiceStatus.UNHEALTHY
        
        overall_status = ServiceStatus.HEALTHY
        if not self.is_initialized:
            overall_status = ServiceStatus.UNHEALTHY
        elif any(status == ServiceStatus.UNHEALTHY for status in dependencies.values()):
            overall_status = ServiceStatus.DEGRADED
        
        return HealthCheckResponse(
            service_name=self.service_name,
            status=overall_status,
            version=self.version,
            uptime_seconds=self.uptime_seconds,
            dependencies=dependencies
        )
    
    async def generate_upload_permission(self, user_id: str, file_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        업로드 허가 - 단순화된 더미 구현 (Dify가 실제 파일 처리 담당)
        
        Args:
            user_id: 업로드 사용자 ID  
            file_metadata: 파일 정보
            
        Returns:
            uid와 더미 업로드 URL
        """
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
    
    async def create_file_from_uid(self, uid: str) -> Dict[str, Any]:
        """
        UID 기반으로 실제 파일 문서 생성
        
        Args:
            uid: 업로드 허가 시 발급된 고유 식별자
            
        Returns:
            생성된 파일 정보
        """
        try:
            # 임시 메타데이터 조회
            temp_metadata = getattr(self, '_temp_metadata', {})
            if uid not in temp_metadata:
                raise Exception(f"유효하지 않은 UID입니다: {uid}")
            
            metadata = temp_metadata[uid]
            
            # 실제 파일 ID 생성
            file_id = str(uuid.uuid4())
            
            # 파일 문서 데이터
            file_document = {
                "_id": file_id,
                "upload_uid": uid,  # 업로드 UID 보관
                "user_id": metadata["user_id"],
                "filename": metadata["filename"],
                "content_type": metadata["content_type"],
                "file_size": metadata.get("file_size"),
                "status": FileStatus.AVAILABLE.value,
                "available": True,
                "s3_url": self._generate_s3_url(uid),  # UID 기반 S3 URL
                "metadata": metadata.get("metadata", {})
            }
            
            if self.file_repo:
                # MongoDB에 저장
                created_file = await self.file_repo.create(file_document)
                print(f"[{self.service_name}] 파일이 MongoDB에 저장됨: {file_id}")
            else:
                # 메모리에만 저장 (MongoDB 없는 경우)
                memory_storage = getattr(self, '_memory_files', {})
                memory_storage[file_id] = file_document
                self._memory_files = memory_storage
                print(f"[{self.service_name}] 파일이 메모리에 저장됨: {file_id}")
            
            # 임시 메타데이터 제거
            del temp_metadata[uid]
            
            return {
                "success": True,
                "file_id": file_id,
                "message": "파일이 성공적으로 생성되었습니다"
            }
            
        except Exception as e:
            raise Exception(f"파일 생성 실패: {str(e)}")
    
    def _generate_s3_url(self, uid: str) -> str:
        """UID 기반 S3 URL 생성"""
        return f"https://your-bucket.s3.amazonaws.com/files/{uid[:2]}/{uid[2:4]}/{uid}"

    async def generate_upload_url(self, uid: str) -> Dict[str, Any]:
        """
        업로드용 Presigned URL 생성
        
        Args:
            uid: 업로드 고유 식별자
            
        Returns:
            Presigned URL 정보
        """
        # S3 키 생성 (UID 기반)
        s3_key = f"files/{uid[:2]}/{uid[2:4]}/{uid}"
        
        # Presigned URL 생성 (실제 구현 시 S3 클라이언트 사용)
        # presigned_url = await self.s3_client.generate_presigned_upload_url(
        #     key=s3_key,
        #     expires_in=timedelta(hours=1)
        # )
        
        # 더미 응답 (실제 구현 필요)
        return {
            "presigned_url": f"https://your-bucket.s3.amazonaws.com/{s3_key}?signature=dummy",
            "expires_at": datetime.now() + timedelta(hours=1),
            "s3_key": s3_key
        }
    
    async def generate_download_url(self, uid: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        다운로드용 Presigned URL 생성 (uid 기반)
        
        Args:
            uid: 파일 고유 식별자 (file_id 또는 upload_uid)
            user_id: 요청 사용자 ID (권한 확인용)
            
        Returns:
            Presigned URL 정보
        """
        file_doc = None
        
        if self.file_repo:
            # MongoDB에서 조회
            file_doc = await self.file_repo.find_by_id(uid)
            if not file_doc:
                # upload_uid로 재검색
                file_doc = await self.file_repo.find_one({"upload_uid": uid})
        else:
            # 메모리에서 조회
            memory_storage = getattr(self, '_memory_files', {})
            file_doc = memory_storage.get(uid)
            if not file_doc:
                # upload_uid로 검색
                for file_id, doc in memory_storage.items():
                    if doc.get("upload_uid") == uid:
                        file_doc = doc
                        break
        
        if not file_doc:
            raise Exception(f"파일을 찾을 수 없습니다: {uid}")
        
        # 권한 확인 (필요시)
        if user_id and file_doc.get("user_id") != user_id:
            raise Exception("파일 접근 권한이 없습니다")
        
        # 파일이 사용 가능한 상태인지 확인
        if not file_doc.get("available", False):
            raise Exception("파일이 아직 사용할 수 없는 상태입니다")
        
        # Presigned Download URL 생성 (실제 구현 시 S3 클라이언트 사용)
        # presigned_url = await self.s3_client.generate_presigned_download_url(
        #     key=file_doc["s3_key"],
        #     expires_in=timedelta(hours=1)
        # )
        
        # 더미 응답 (실제 구현 필요)
        return {
            "presigned_download_url": file_doc.get("s3_url", f"https://dummy-url/{uid}"),
            "expires_at": datetime.now() + timedelta(hours=1),
            "file_metadata": {
                "file_id": file_doc["_id"],
                "uid": uid,
                "filename": file_doc["filename"],
                "content_type": file_doc["content_type"],
                "file_size": file_doc.get("file_size")
            }
        }
    
    async def update_file_status(self, file_id: str, status: str, s3_url: Optional[str] = None) -> bool:
        """
        파일 상태 업데이트
        
        Args:
            file_id: 파일 ID
            status: 새로운 상태
            s3_url: S3 URL (업로드 완료 시)
            
        Returns:
            업데이트 성공 여부
        """
        update_data = {"status": status}
        
        # 업로드 완료 시 추가 정보 업데이트
        if status == FileStatus.AVAILABLE.value and s3_url:
            update_data.update({
                "available": True,
                "s3_url": s3_url
            })
        
        if self.file_repo:
            return await self.file_repo.update_by_id(file_id, update_data)
        else:
            # 메모리에서 업데이트
            memory_storage = getattr(self, '_memory_files', {})
            if file_id in memory_storage:
                memory_storage[file_id].update(update_data)
                return True
            return False
    
    async def get_file_metadata(self, uid: str) -> Optional[Dict[str, Any]]:
        """파일 메타데이터 조회 (uid 기반)"""
        if self.file_repo:
            # MongoDB에서 조회
            file_doc = await self.file_repo.find_by_id(uid)
            if not file_doc:
                # upload_uid로 재검색
                file_doc = await self.file_repo.find_one({"upload_uid": uid})
            return file_doc
        else:
            # 메모리에서 조회
            memory_storage = getattr(self, '_memory_files', {})
            file_doc = memory_storage.get(uid)
            if not file_doc:
                # upload_uid로 검색
                for file_id, doc in memory_storage.items():
                    if doc.get("upload_uid") == uid:
                        return doc
            return file_doc
    
    async def get_user_files(self, user_id: str, available_only: bool = True) -> list:
        """사용자별 파일 목록 조회"""
        if self.file_repo:
            return await self.file_repo.find_by_user(user_id, available_only)
        else:
            # 메모리에서 조회
            memory_storage = getattr(self, '_memory_files', {})
            user_files = []
            for file_doc in memory_storage.values():
                if file_doc.get("user_id") == user_id:
                    if not available_only or file_doc.get("available", False):
                        user_files.append(file_doc)
            return user_files


# 구현 가이드라인 (주석)
"""
실제 구현 시 고려사항:

1. S3 연동:
   - boto3를 사용한 S3 클라이언트 구현
   - Presigned URL 생성 시 적절한 만료 시간 설정
   - 멀티파트 업로드 지원 (대용량 파일)
   - S3 이벤트 알림 연동 (업로드 완료 자동 감지)

2. 보안:
   - 사용자별 파일 접근 권한 확인
   - 파일 타입 검증 및 제한
   - 바이러스 스캔 연동 (필요시)
   - Rate limiting으로 남용 방지

3. 성능 최적화:
   - 파일 메타데이터 캐싱 (Redis 등)
   - 대용량 파일 처리를 위한 스트리밍
   - DB 쿼리 최적화 (인덱스 활용)

4. 모니터링:
   - 파일 업로드/다운로드 통계
   - 저장소 사용량 모니터링
   - 실패한 업로드 추적 및 정리

5. 데이터 관리:
   - 오래된 파일 자동 정리 정책
   - 파일 백업 및 복구 전략
   - GDPR 등 데이터 보호 규정 준수
"""
