"""
간단 분기 유틸: route_processor(state)
- InputNode가 이미 file_extension(소문자)과 file_type을 채워둔다고 가정
- 그래프의 add_conditional_edges와 함께 사용
"""
from state import ParserState, FileType


def route_processor(state: ParserState) -> str:
    """파일 확장자/타입에 따라 라우트 키 반환
    우선순위: file_extension -> file_type
    반환: 'image' | 'pdf' | 'unknown'
    """
    ext = state.get("file_extension") or ""

    if ext in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"):
        return "image"
    if ext == ".pdf":
        return "pdf"

    ft = state.get("file_type")
    if ft == FileType.IMAGE:
        return "image"
    if ft == FileType.PDF:
        return "pdf"

    return "unknown"


