"""
MongoDB 연결 및 관리 클래스
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo.errors import ConnectionFailure, OperationFailure
import os
import logging
from datetime import datetime

# 로거 설정
logger = logging.getLogger(__name__)


class MongoDBConnection:
    """MongoDB 연결 관리 클래스"""
    
    def __init__(self, connection_string: Optional[str] = None, database_name: Optional[str] = None):
        self.connection_string = connection_string or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        self.database_name = database_name or os.getenv("MONGODB_DATABASE", "sapie_braille")
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
    
    async def connect(self):
        """MongoDB 연결"""
        try:
            self.client = AsyncIOMotorClient(self.connection_string, serverSelectionTimeoutMS=5000) # 개선됨: 타임아웃 추가
            # 연결 테스트
            await self.client.admin.command('ping')
            self.database = self.client[self.database_name]
            logger.info(f"[SUCCESS] MongoDB 연결 성공: {self.database_name}")
        except ConnectionFailure as e:
            logger.error(f"[ERROR] MongoDB 연결 실패: {e}")
            self.client = None
            self.database = None
            raise
    
    async def disconnect(self):
        """MongoDB 연결 해제"""
        if self.client:
            self.client.close()
            logger.info("🔌 MongoDB 연결 해제") # 개선됨: print -> logger.info
    
    def get_collection(self, collection_name: str) -> AsyncIOMotorCollection:
        """컬렉션 반환"""
        if self.database is None:
            raise RuntimeError("데이터베이스가 연결되지 않았습니다")
        return self.database[collection_name]
    
    async def health_check(self) -> Dict[str, Any]:
        """MongoDB 상태 확인"""
        try:
            if self.client is None or self.database is None: # 개선됨: database 객체도 확인
                return {"healthy": False, "error": "클라이언트가 연결되지 않음"}
            
            # ping 명령으로 연결 상태 확인
            await self.client.admin.command('ping')
            
            # 서버 정보 조회
            server_info = await self.client.server_info()
            
            return {
                "healthy": True,
                "database": self.database_name,
                "mongodb_version": server_info.get("version", "unknown"),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


class BaseRepository(ABC):
    """MongoDB 리포지토리 기본 클래스"""
    
    def __init__(self, db_connection: MongoDBConnection, collection_name: str):
        self.db_connection = db_connection
        self.collection_name = collection_name
        self._collection: Optional[AsyncIOMotorCollection] = None
    
    @property
    def collection(self) -> AsyncIOMotorCollection:
        """컬렉션 반환"""
        if self._collection is None: # 수정됨: not self._collection -> is None
            self._collection = self.db_connection.get_collection(self.collection_name)
        return self._collection
    
    async def create(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """문서 생성"""
        now = datetime.now() # 개선됨: 시간 일관성 유지
        document["created_at"] = now
        document["updated_at"] = now
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document
    
    async def find_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """ID로 문서 조회"""
        return await self.collection.find_one({"_id": doc_id})
    
    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """조건으로 단일 문서 조회"""
        return await self.collection.find_one(filter_dict)
    
    async def find_many(
        self, 
        filter_dict: Dict[str, Any], 
        limit: int = 100, # 개선됨: 기본값 설정 및 to_list length와 연동
        sort: Optional[List[tuple]] = None
    ) -> List[Dict[str, Any]]:
        """조건으로 여러 문서 조회"""
        cursor = self.collection.find(filter_dict)
        
        if sort:
            cursor = cursor.sort(sort)
        if limit:
            cursor = cursor.limit(limit)
            
        return await cursor.to_list(length=limit)
    
    async def update_by_id(self, doc_id: str, update_data: Dict[str, Any]) -> bool:
        """ID로 문서 업데이트"""
        if "$set" not in update_data and "$unset" not in update_data:
             update_data = {"$set": update_data}

        if "$set" in update_data:
            update_data["$set"]["updated_at"] = datetime.now()

        result = await self.collection.update_one({"_id": doc_id}, update_data)
        return result.modified_count > 0
    
    async def delete_by_id(self, doc_id: str) -> bool:
        """ID로 문서 삭제"""
        result = await self.collection.delete_one({"_id": doc_id})
        return result.deleted_count > 0
    
    @abstractmethod
    async def create_indexes(self):
        """컬렉션 인덱스 생성 - 각 리포지토리에서 구현"""
        pass


# Asset Service용 파일 리포지토리 예시
class FileMetadataRepository(BaseRepository):
    """파일 메타데이터 리포지토리"""
    
    def __init__(self, db_connection: MongoDBConnection):
        super().__init__(db_connection, "file_metadata")
    
    async def create_indexes(self):
        """파일 메타데이터 인덱스 생성"""
        try:
            # 사용자별 파일 조회용 인덱스
            await self.collection.create_index("user_id")
            # 파일 상태별 조회용 인덱스      
            await self.collection.create_index("available")
            # 생성일자 인덱스
            await self.collection.create_index("created_at")
            logger.info(f"'{self.collection_name}' 컬렉션 인덱스 생성 완료")
        except OperationFailure as e:
            logger.warning(f"'{self.collection_name}' 컬렉션 인덱스 생성 중 경고 발생 (이미 존재할 수 있음): {e}")


    async def find_by_user(self, user_id: str, available_only: bool = True) -> List[Dict[str, Any]]:
        """사용자별 파일 조회"""
        filter_dict = {"user_id": user_id}
        if available_only:
            filter_dict["available"] = True
        
        return await self.find_many(
            filter_dict, 
            sort=[("created_at", -1)]  # 최신순
        )
    
    async def update_availability(self, file_id: str, available: bool, s3_url: Optional[str] = None) -> bool:
        """파일 가용성 상태 업데이트"""
        update_data = {"available": available}
        if s3_url:
            update_data["s3_url"] = s3_url
        
        return await self.update_by_id(file_id, update_data)


# =============================================================================
# SESSION MAPPING UTILITY FUNCTIONS (MSA 공통 사용)
# =============================================================================

# 전역 연결 객체 (싱글턴 패턴)
_global_db_connection: Optional[MongoDBConnection] = None
_session_mapping_collection: Optional[AsyncIOMotorCollection] = None

async def initialize_session_mapping_db(connection_string: Optional[str] = None, database_name: Optional[str] = None) -> bool:
    """세션 매핑용 MongoDB 초기화 (MSA 서비스에서 호출)"""
    global _global_db_connection, _session_mapping_collection
    try:
        if _global_db_connection and _global_db_connection.database is not None:
            logger.info("Session Mapping MongoDB가 이미 초기화되었습니다.")
            return True

        connection_string = connection_string or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        database_name = database_name or os.getenv("MONGODB_DATABASE", "sapie_braille")
        
        _global_db_connection = MongoDBConnection(connection_string, database_name)
        await _global_db_connection.connect()
        
        # 수정됨: 여기서 database 객체가 None이 아닌지 명시적으로 확인 (핵심 수정 사항)
        if _global_db_connection.database is not None:
            _session_mapping_collection = _global_db_connection.get_collection("session_mappings")
            
            # 인덱스 생성
            await _session_mapping_collection.create_index("frontend_uuid", unique=True)
            await _session_mapping_collection.create_index("dify_conversation_id") 
            await _session_mapping_collection.create_index("last_used_at")
            
            logger.info("[SUCCESS] Session Mapping MongoDB 초기화 및 인덱스 설정 완료")
            return True
        else:
            # connect()에서 예외가 발생하지 않았지만 database 객체가 없는 경우
            logger.error("[ERROR] MongoDB 연결 후 Database 객체를 가져오지 못했습니다.")
            return False
            
    except Exception as e:
        logger.error(f"[ERROR] Session Mapping MongoDB 초기화 실패: {e}")
        _global_db_connection = None
        _session_mapping_collection = None
        return False

async def disconnect_session_mapping_db():
    """세션 매핑용 MongoDB 연결 해제"""
    global _global_db_connection
    if _global_db_connection:
        await _global_db_connection.disconnect()
        _global_db_connection = None

async def save_session_mapping(frontend_uuid: str, dify_conversation_id: str) -> bool:
    """세션 매핑 저장 (MSA 공통 함수) - Upsert 방식으로 개선"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        logger.error("[ERROR] save_session_mapping: MongoDB 연결이 초기화되지 않았습니다.")
        return False
        
    # 유효성 검사
    if not frontend_uuid or not dify_conversation_id:
        logger.warning(f"Invalid mapping data: frontend_uuid='{frontend_uuid}', dify_conversation_id='{dify_conversation_id}'")
        return False
    
    if frontend_uuid.startswith('legacy_'):
        logger.info(f"Skipping save for legacy key: {frontend_uuid}")
        return True # 저장은 안하지만 실패는 아님

    try:
        # 개선됨: find-update/insert 대신 upsert=True를 사용하여 한 번의 DB 호출로 처리
        now = datetime.now()
        result = await _session_mapping_collection.update_one(
            {"frontend_uuid": frontend_uuid},
            {
                "$set": {
                    "dify_conversation_id": dify_conversation_id,
                    "last_used_at": now
                },
                "$setOnInsert": { # insert 시에만 created_at 설정
                    "created_at": now
                }
            },
            upsert=True
        )
        
        if result.upserted_id:
            logger.info(f"MongoDB: Created new mapping {frontend_uuid} -> {dify_conversation_id}")
        elif result.modified_count > 0:
            logger.info(f"MongoDB: Updated mapping {frontend_uuid} -> {dify_conversation_id}")
        else:
            logger.info(f"MongoDB: Mapping data for {frontend_uuid} is already up-to-date.")

        return True
        
    except Exception as e:
        logger.error(f"Error saving session mapping to MongoDB: {e}")
        return False

async def get_session_mapping(frontend_uuid: str) -> Optional[str]:
    """세션 매핑 조회 (MSA 공통 함수)"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        logger.error("[ERROR] get_session_mapping: MongoDB 연결이 초기화되지 않았습니다.")
        return None
        
    try:
        logger.debug(f"MongoDB: Looking up mapping for {frontend_uuid}")
        
        # 개선됨: find_one_and_update를 사용하여 조회와 업데이트를 원자적으로 처리
        result = await _session_mapping_collection.find_one_and_update(
            {"frontend_uuid": frontend_uuid},
            {"$set": {"last_used_at": datetime.now()}},
            projection={"dify_conversation_id": 1}
        )
        
        if result:
            dify_id = result.get("dify_conversation_id")
            logger.debug(f"MongoDB: Found mapping {frontend_uuid} -> {dify_id}")
            return dify_id
        else:
            logger.debug(f"MongoDB: No mapping found for {frontend_uuid}")
            return None
            
    except Exception as e:
        logger.error(f"Error getting session mapping from MongoDB: {e}")
        return None

async def get_reverse_session_mapping(dify_conversation_id: str) -> Optional[str]:
    """역방향 세션 매핑 조회 (MSA 공통 함수)"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        logger.error("[ERROR] get_reverse_session_mapping: MongoDB 연결이 초기화되지 않았습니다.")
        return None
        
    try:
        logger.debug(f"MongoDB: Looking up reverse mapping for {dify_conversation_id}")
        result = await _session_mapping_collection.find_one(
            {"dify_conversation_id": dify_conversation_id},
            projection={"frontend_uuid": 1}
        )
        
        if result:
            frontend_uuid = result.get("frontend_uuid")
            logger.debug(f"MongoDB: Found reverse mapping {dify_conversation_id} -> {frontend_uuid}")
            return frontend_uuid
        else:
            logger.debug(f"MongoDB: No reverse mapping found for {dify_conversation_id}")
            return None
    except Exception as e:
        logger.error(f"Error getting reverse mapping from MongoDB: {e}")
        return None


async def delete_session_mapping(frontend_uuid: str) -> bool:
    """세션 매핑 삭제 (MSA 공통 함수)"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        logger.error("[ERROR] delete_session_mapping: MongoDB 연결이 초기화되지 않았습니다.")
        return False
    try:
        result = await _session_mapping_collection.delete_one({"frontend_uuid": frontend_uuid})
        success = result.deleted_count > 0
        if success:
            logger.info(f"MongoDB: Deleted mapping for {frontend_uuid}")
        else:
            logger.warning(f"MongoDB: No mapping found to delete for {frontend_uuid}")
        return success
    except Exception as e:
        logger.error(f"Error deleting session mapping from MongoDB: {e}")
        return False

async def cleanup_stale_session_mappings(existing_dify_ids: List[str]) -> int:
    """존재하지 않는 대화들의 매핑 정리 (MSA 공통 함수)"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        logger.error("[ERROR] cleanup_stale_session_mappings: MongoDB 연결이 초기화되지 않았습니다.")
        return 0
    try:
        logger.info("MongoDB: Starting cleanup of stale mappings...")
        
        # 삭제 대상 필터
        filter_query = {"dify_conversation_id": {"$nin": existing_dify_ids}}
        
        # 삭제 전, 대상 문서를 로그로 남기기 위해 조회 (선택 사항)
        stale_mappings_cursor = _session_mapping_collection.find(filter_query, {"frontend_uuid": 1, "dify_conversation_id": 1})
        stale_mappings = await stale_mappings_cursor.to_list(length=None)

        if not stale_mappings:
            logger.info("MongoDB: No stale mappings found to clean up.")
            return 0
            
        # 일괄 삭제
        result = await _session_mapping_collection.delete_many(filter_query)
        cleaned_count = result.deleted_count

        logger.info(f"MongoDB: Cleaned up {cleaned_count} stale mappings.")
        for mapping in stale_mappings:
             logger.info(f"  - Removed: {mapping.get('frontend_uuid')} -> {mapping.get('dify_conversation_id')}")
        
        return cleaned_count
    except Exception as e:
        logger.error(f"Error cleaning up stale mappings: {e}")
        return 0

async def get_all_session_mappings() -> Dict[str, str]:
    """모든 세션 매핑 조회 (MSA 공통 함수)"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        logger.error("[ERROR] get_all_session_mappings: MongoDB 연결이 초기화되지 않았습니다.")
        return {}
    try:
        cursor = _session_mapping_collection.find({}, {"frontend_uuid": 1, "dify_conversation_id": 1})
        mappings = {doc["frontend_uuid"]: doc["dify_conversation_id"] async for doc in cursor}
        logger.info(f"MongoDB: Retrieved {len(mappings)} total mappings from DB.")
        return mappings
    except Exception as e:
        logger.error(f"Error getting all mappings from MongoDB: {e}")
        return {}

async def get_session_mapping_statistics() -> Dict[str, Any]:
    """세션 매핑 통계 정보 (MSA 공통 함수)"""
    global _session_mapping_collection
    if _session_mapping_collection is None:
        return {"healthy": False, "error": "MongoDB 연결이 초기화되지 않음"}
        
    try:
        total_count = await _session_mapping_collection.count_documents({})
        
        # 최근 24시간 내 사용된 매핑
        recent_cutoff = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        recent_count = await _session_mapping_collection.count_documents({"last_used_at": {"$gte": recent_cutoff}})
        
        return {
            "healthy": True,
            "total_mappings": total_count,
            "recent_active_mappings": recent_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return {"healthy": False, "error": str(e)}

async def get_mongodb_health() -> Dict[str, Any]:
    """MongoDB 상태 확인 (MSA 공통 함수)"""
    global _global_db_connection
    if _global_db_connection:
        return await _global_db_connection.health_check()
    else:
        return {
            "healthy": False,
            "error": "MongoDB 연결이 초기화되지 않음",
            "timestamp": datetime.now().isoformat()
        }