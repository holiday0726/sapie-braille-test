"""
parsing_service의 상태 관리
"""
from typing import TypedDict, List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field


@dataclass
class PageElement:
    """
    페이지 한 장의 모든 처리 정보를 담는 데이터 클래스.
    이 객체 하나가 처리 파이프라인의 기본 단위가 됩니다.
    """
    page_number: int
    
    # 초기 추출 데이터
    # PyMuPDF의 get_text("dict") 결과와 get_images() 결과를 순서대로 정렬하여 저장
    raw_elements: List[Dict[str, Any]] = field(default_factory=list)
    
    # 이미지 처리 후 대체 텍스트가 포함된, 순서가 보장된 최종 문서 내용
    documents: List[str] = field(default_factory=list)

    # 추출된 이미지 파일 경로
    img_paths: List[str] = field(default_factory=list)


class FileType(Enum):
    """지원하는 파일 타입"""
    IMAGE = "image"
    PDF = "pdf"
    UNKNOWN = "unknown"


class ElementType(Enum):
    """문서 요소 타입"""
    TEXT = "text"
    TABLE = "table"
    IMAGE = "image"
    CHART = "chart"


class PdfProcessState(TypedDict):
    """PDF 처리 서브그래프의 상태"""
    downloaded_file_path: str
    pages: List[PageElement]
    structured_result: str
    

class ParserState(TypedDict):
    """파서 전체 상태를 관리하는 TypedDict"""
    
    # 입력 정보
    url: str
    provider: str    # "openai"
    model: str       # "4o"
    base_url: Optional[str]    # "https://api.openai.com/v1 추후 sllm에서 사용"
    
    # 파일 처리 상태 
    downloaded_file_path: str      # 다운로드된 원본 파일
    file_type: FileType              # 각 파일의 타입
    
    # Upstage PDF 처리 서브그래프용 상태
    split_filepaths: Optional[List[str]]   # 분할된 PDF 파일 경로 리스트
    working_filepath: Optional[str]        # 현재 처리 중인 분할 PDF 파일 경로
    raw_elements: Optional[List[Dict[str, Any]]] # Upstage API로부터 받은 원시 요소 데이터
    metadata: Optional[List[Dict[str, Any]]]     # 처리 메타데이터
    elements_from_parser: Optional[List[Dict[str, Any]]] # 후처리된 최종 요소 데이터
    total_cost: Optional[float]
    images_to_describe: Optional[List[Dict[str, Any]]] # 설명 생성이 필요한 이미지 목록
    image_descriptions: Optional[Dict[str, str]] # 이미지 경로: 생성된 설명
    
    # 최종 결과
    structured_result: Optional[str] # 최종 마크다운 텍스트
    structured_accessibility_result: Optional[str] # 최종 접근성 마크다운 텍스트
    
    # 오류 처리
    error: Optional[str]
