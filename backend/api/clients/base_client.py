"""
기본 API 클라이언트 - 모든 서비스 클라이언트의 베이스 클래스
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx
from datetime import datetime


class BaseServiceClient(ABC):
    """모든 서비스 클라이언트의 기본 클래스"""
    
    def __init__(self, base_url: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.client: Optional[httpx.AsyncClient] = None
        
    async def __aenter__(self):
        """비동기 컨텍스트 매니저 진입"""
        self.client = httpx.AsyncClient(timeout=self.timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """비동기 컨텍스트 매니저 종료"""
        if self.client:
            await self.client.aclose()
    
    async def initialize(self):
        """클라이언트 초기화"""
        if not self.client:
            self.client = httpx.AsyncClient(timeout=self.timeout)
    
    async def cleanup(self):
        """리소스 정리"""
        if self.client:
            await self.client.aclose()
    
    async def health_check(self) -> Dict[str, Any]:
        """서비스 상태 확인"""
        if not self.client:
            raise RuntimeError("클라이언트가 초기화되지 않았습니다")
            
        try:
            response = await self.client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return {
                "healthy": True,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    @abstractmethod
    async def get_service_info(self) -> Dict[str, Any]:
        """서비스 정보 조회 - 각 서비스에서 구현 필요"""
        pass
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """HTTP 요청 공통 처리"""
        if not self.client:
            raise RuntimeError("클라이언트가 초기화되지 않았습니다")
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = await self.client.request(
                method=method,
                url=url,
                json=data,
                files=files,
                params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise Exception(f"HTTP {e.response.status_code}: {e.response.text}")
        except Exception as e:
            raise Exception(f"요청 실패: {str(e)}")
