"""
공통 API 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ServiceStatus(str, Enum):
    """서비스 상태"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class FileStatus(str, Enum):
    """파일 상태"""
    PENDING = "pending"          # 업로드 대기중
    UPLOADING = "uploading"      # 업로드 진행중
    AVAILABLE = "available"      # 사용 가능
    PROCESSING = "processing"    # 처리중
    PROCESSED = "processed"      # 처리 완료
    ERROR = "error"              # 오류 발생


class BaseResponse(BaseModel):
    """기본 응답 모델"""
    success: bool = Field(description="요청 성공 여부")
    message: Optional[str] = Field(default=None, description="응답 메시지")
    timestamp: datetime = Field(default_factory=datetime.now, description="응답 시간")


class ErrorResponse(BaseResponse):
    """오류 응답 모델"""
    success: bool = Field(default=False, description="요청 성공 여부")
    error_code: Optional[str] = Field(default=None, description="오류 코드")
    error_details: Optional[Dict[str, Any]] = Field(default=None, description="오류 상세 정보")


class HealthCheckResponse(BaseModel):
    """헬스체크 응답"""
    service_name: str = Field(description="서비스 이름")
    status: ServiceStatus = Field(description="서비스 상태")
    version: str = Field(description="서비스 버전")
    uptime_seconds: Optional[float] = Field(default=None, description="가동 시간")
    dependencies: Optional[Dict[str, ServiceStatus]] = Field(default=None, description="의존성 서비스 상태")
    timestamp: datetime = Field(default_factory=datetime.now, description="확인 시간")


class FileMetadata(BaseModel):
    """파일 메타데이터"""
    file_id: str = Field(description="파일 고유 ID")
    filename: str = Field(description="원본 파일명")
    content_type: str = Field(description="파일 MIME 타입")
    file_size: Optional[int] = Field(default=None, description="파일 크기 (bytes)")
    user_id: str = Field(description="업로드 사용자 ID")
    status: FileStatus = Field(description="파일 상태")
    s3_url: Optional[str] = Field(default=None, description="S3 저장 URL")
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시간")
    updated_at: datetime = Field(default_factory=datetime.now, description="수정 시간")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="추가 메타데이터")


class PresignedUrlResponse(BaseModel):
    """Presigned URL 응답"""
    presigned_url: str = Field(description="Presigned URL")
    expires_at: datetime = Field(description="URL 만료 시간")
    method: str = Field(description="HTTP 메서드 (GET/PUT)")
    headers: Optional[Dict[str, str]] = Field(default=None, description="필요한 헤더")


class ProcessingStep(BaseModel):
    """처리 단계 정보"""
    step_name: str = Field(description="단계 이름")
    status: str = Field(description="단계 상태")
    start_time: datetime = Field(description="시작 시간")
    end_time: Optional[datetime] = Field(default=None, description="종료 시간")
    duration_ms: Optional[int] = Field(default=None, description="소요 시간 (ms)")
    service_name: Optional[str] = Field(default=None, description="처리 서비스")
    result: Optional[Dict[str, Any]] = Field(default=None, description="단계 결과")
    error: Optional[str] = Field(default=None, description="오류 메시지")


class WorkflowStatus(BaseModel):
    """워크플로우 상태"""
    request_id: str = Field(description="요청 ID")
    status: str = Field(description="전체 상태")
    progress_percentage: int = Field(description="진행률 (0-100)")
    current_step: Optional[str] = Field(default=None, description="현재 단계")
    steps: List[ProcessingStep] = Field(default_factory=list, description="처리 단계 목록")
    start_time: datetime = Field(description="시작 시간")
    end_time: Optional[datetime] = Field(default=None, description="종료 시간")
    total_duration_ms: Optional[int] = Field(default=None, description="총 소요 시간")
    result: Optional[Dict[str, Any]] = Field(default=None, description="최종 결과")
    errors: List[str] = Field(default_factory=list, description="오류 목록")
