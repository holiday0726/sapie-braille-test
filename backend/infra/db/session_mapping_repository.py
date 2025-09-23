"""
세션 매핑 MongoDB 리포지토리
Frontend UUID ↔ Dify conversation_id 매핑 관리
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from .mongodb import BaseRepository, MongoDBConnection

logger = logging.getLogger(__name__)


class SessionMappingRepository(BaseRepository):
    """세션 매핑 전용 리포지토리"""
    
    def __init__(self, db_connection: MongoDBConnection):
        super().__init__(db_connection, "session_mappings")
    
    async def create_indexes(self):
        """세션 매핑 인덱스 생성"""
        # frontend_uuid로 조회용 (유니크)
        await self.collection.create_index("frontend_uuid", unique=True)
        # dify_conversation_id로 조회용 (역방향 조회)
        await self.collection.create_index("dify_conversation_id")
        # 생성일자 인덱스 (정리용)
        await self.collection.create_index("created_at")
        # 마지막 사용일 인덱스 (정리용)
        await self.collection.create_index("last_used_at")
        logger.info("✅ SessionMapping 인덱스 생성 완료")
    
    async def save_mapping(self, frontend_uuid: str, dify_conversation_id: str) -> bool:
        """세션 매핑 저장"""
        try:
            # 유효성 검사
            if not frontend_uuid or not dify_conversation_id:
                logger.error(f"Invalid mapping data: frontend_uuid='{frontend_uuid}', dify_conversation_id='{dify_conversation_id}'")
                return False
            
            # legacy_ prefix가 있는 키는 저장하지 않음
            if frontend_uuid.startswith('legacy_'):
                logger.warning(f"Skipping save for legacy key: {frontend_uuid}")
                return False
            
            # UUID 형식 검증 (기본적인 길이 체크)
            if len(frontend_uuid) < 32 or len(dify_conversation_id) < 32:
                logger.error(f"UUID format validation failed: frontend_uuid='{frontend_uuid}', dify_conversation_id='{dify_conversation_id}'")
                return False
            
            logger.info(f"=== SAVING SESSION MAPPING TO MONGODB ===")
            logger.info(f"Frontend UUID: {frontend_uuid}")
            logger.info(f"Dify Conversation ID: {dify_conversation_id}")
            
            # 기존 매핑 확인
            existing = await self.find_one({"frontend_uuid": frontend_uuid})
            
            mapping_data = {
                "frontend_uuid": frontend_uuid,
                "dify_conversation_id": dify_conversation_id,
                "last_used_at": datetime.now()
            }
            
            if existing:
                # 업데이트
                result = await self.collection.update_one(
                    {"frontend_uuid": frontend_uuid},
                    {"$set": mapping_data}
                )
                success = result.modified_count > 0
                logger.info(f"MongoDB: Updated existing mapping {frontend_uuid} -> {dify_conversation_id}")
            else:
                # 새로 생성
                mapping_data["created_at"] = datetime.now()
                result = await self.collection.insert_one(mapping_data)
                success = bool(result.inserted_id)
                logger.info(f"MongoDB: Created new mapping {frontend_uuid} -> {dify_conversation_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error saving session mapping to MongoDB: {e}")
            return False
    
    async def get_mapping(self, frontend_uuid: str) -> Optional[str]:
        """Frontend UUID로 Dify conversation_id 조회"""
        try:
            logger.debug(f"MongoDB: Looking up mapping for {frontend_uuid}")
            
            result = await self.find_one({"frontend_uuid": frontend_uuid})
            
            if result:
                dify_conversation_id = result["dify_conversation_id"]
                logger.debug(f"MongoDB: Found mapping {frontend_uuid} -> {dify_conversation_id}")
                
                # 마지막 사용 시간 업데이트
                await self.collection.update_one(
                    {"frontend_uuid": frontend_uuid},
                    {"$set": {"last_used_at": datetime.now()}}
                )
                
                return dify_conversation_id
            else:
                logger.debug(f"MongoDB: No mapping found for {frontend_uuid}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting session mapping from MongoDB: {e}")
            return None
    
    async def get_reverse_mapping(self, dify_conversation_id: str) -> Optional[str]:
        """Dify conversation_id로 Frontend UUID 조회 (역방향)"""
        try:
            logger.debug(f"MongoDB: Looking up reverse mapping for {dify_conversation_id}")
            
            result = await self.find_one({"dify_conversation_id": dify_conversation_id})
            
            if result:
                frontend_uuid = result["frontend_uuid"]
                logger.debug(f"MongoDB: Found reverse mapping {dify_conversation_id} -> {frontend_uuid}")
                return frontend_uuid
            else:
                logger.debug(f"MongoDB: No reverse mapping found for {dify_conversation_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting reverse mapping from MongoDB: {e}")
            return None
    
    async def delete_mapping(self, frontend_uuid: str) -> bool:
        """세션 매핑 삭제"""
        try:
            result = await self.collection.delete_one({"frontend_uuid": frontend_uuid})
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"MongoDB: Deleted mapping for {frontend_uuid}")
            else:
                logger.warning(f"MongoDB: No mapping found to delete for {frontend_uuid}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error deleting session mapping from MongoDB: {e}")
            return False
    
    async def cleanup_stale_mappings(self, existing_dify_ids: List[str]) -> int:
        """존재하지 않는 대화들의 매핑 정리"""
        try:
            logger.info("MongoDB: Starting cleanup of stale mappings")
            
            # 현재 존재하지 않는 dify_conversation_id 찾기
            stale_mappings = await self.collection.find({
                "dify_conversation_id": {"$nin": existing_dify_ids}
            }).to_list(length=None)
            
            if not stale_mappings:
                logger.info("MongoDB: No stale mappings found")
                return 0
            
            # 오래된 매핑들의 frontend_uuid 수집
            stale_frontend_uuids = [mapping["frontend_uuid"] for mapping in stale_mappings]
            
            # 일괄 삭제
            result = await self.collection.delete_many({
                "frontend_uuid": {"$in": stale_frontend_uuids}
            })
            
            cleaned_count = result.deleted_count
            logger.info(f"MongoDB: Cleaned up {cleaned_count} stale mappings")
            
            for mapping in stale_mappings:
                logger.warning(f"MongoDB: Removed stale mapping {mapping['frontend_uuid']} -> {mapping['dify_conversation_id']}")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up stale mappings: {e}")
            return 0
    
    async def get_all_mappings(self) -> Dict[str, str]:
        """모든 매핑을 메모리 캐시 형태로 반환 (JSON 방식과 호환성을 위해)"""
        try:
            cursor = self.collection.find({}, {"frontend_uuid": 1, "dify_conversation_id": 1})
            mappings = {}
            
            async for doc in cursor:
                frontend_uuid = doc["frontend_uuid"]
                dify_conversation_id = doc["dify_conversation_id"]
                mappings[frontend_uuid] = dify_conversation_id
            
            logger.debug(f"MongoDB: Retrieved {len(mappings)} total mappings")
            return mappings
            
        except Exception as e:
            logger.error(f"Error getting all mappings from MongoDB: {e}")
            return {}
    
    async def get_statistics(self) -> Dict[str, Any]:
        """매핑 통계 정보"""
        try:
            total_count = await self.collection.count_documents({})
            
            # 최근 24시간 내 사용된 매핑
            recent_cutoff = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_count = await self.collection.count_documents({
                "last_used_at": {"$gte": recent_cutoff}
            })
            
            return {
                "total_mappings": total_count,
                "recent_active_mappings": recent_count,
                "collection_name": self.collection_name,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {
                "total_mappings": 0,
                "recent_active_mappings": 0,
                "error": str(e)
            }