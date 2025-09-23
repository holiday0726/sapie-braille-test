"""
입력 처리 노드 - 파일 다운로드와 타입 식별을 통합한 InputNode
"""
import os
import requests
import mimetypes
from urllib.parse import urlparse
from typing import Optional
from PIL import Image
import uuid
from nodes.base import BaseNode
from state import ParserState, FileType
import filetype


class InputNode(BaseNode):
    """입력 처리 노드 - 단일 파일 다운로드 및 타입 식별 처리"""
    
    def __init__(self, download_dir: str = "downloads", **kwargs):
        super().__init__(**kwargs)
        self.download_dir = download_dir
        self.name = "InputNode"
        
        # 다운로드 디렉토리 생성
        os.makedirs(self.download_dir, exist_ok=True)
        
        # 지원하는 확장자들
        self.image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
        self.pdf_extensions = {'.pdf'}

    def _get_filename_from_url(self, url: str) -> str:
        """URL에서 파일명 추출"""
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        
        if not filename or '.' not in filename:
            filename = "downloaded_file"
            
        return filename
    
    def _get_filename_from_headers(self, response: requests.Response) -> Optional[str]:
        """HTTP 헤더에서 파일명 추출"""
        content_disposition = response.headers.get('content-disposition')
        if content_disposition:
            import re
            match = re.findall('filename="(.+)"', content_disposition)
            if match:
                return match[0]
        return None

    def _guess_extension_from_content_type(self, content_type: Optional[str]) -> Optional[str]:
        """Content-Type에서 확장자 추정"""
        if not content_type:
            return None
        try:
            # 예: 'application/pdf' -> '.pdf', 'image/png' -> '.png'
            ext = mimetypes.guess_extension(content_type.split(';')[0].strip())
            # 일부 경우 .jpe 등이 나올 수 있으므로 보정
            if ext == '.jpe':
                return '.jpg'
            return ext
        except Exception:
            return None

    def _ensure_extension(self, filename: str, response: requests.Response) -> str:
        """파일명에 확장자가 없으면 Content-Type을 기반으로 확장자 부여"""
        base, ext = os.path.splitext(filename)
        if ext:
            return filename
        # 헤더의 Content-Type으로 시도
        content_type = response.headers.get('content-type')
        guessed = self._guess_extension_from_content_type(content_type)
        if guessed:
            return f"{filename}{guessed}"
        # response.url 경로에서 재시도
        try:
            from urllib.parse import urlparse
            path = urlparse(response.url).path
            path_name = os.path.basename(path)
            _, path_ext = os.path.splitext(path_name)
            if path_ext:
                return f"{filename}{path_ext}"
        except Exception:
            pass
        # 최종 기본값
        return f"{filename}.bin"
    
    def _download_file(self, url: str) -> str:
        """파일 다운로드 """
        
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            # 파일명 결정
            filename = self._get_filename_from_headers(response)
            if not filename:
                filename = self._get_filename_from_url(url)
            # 확장자 보장
            filename = self._ensure_extension(filename, response)

            # 고유 파일명으로 대체 (확장자 유지)
            _, ext = os.path.splitext(filename)
            unique_name = f"{uuid.uuid4().hex}{ext or ''}"
            
            # 다운로드 경로 설정
            file_path = os.path.join(self.download_dir, unique_name)
            
            # 파일을 저장할 디렉토리가 존재하는지 확인하고, 없으면 생성
            os.makedirs(self.download_dir, exist_ok=True)
            
            # 파일 다운로드
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            return file_path
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"파일 다운로드 실패: {e}")
        except IOError as e:
            raise Exception(f"파일 저장 실패: {e}")
    
    def _identify_file_type(self, file_path: str) -> FileType:
        """파일 타입 식별 (로그 최소화)"""
        
        if not os.path.exists(file_path):
            raise ValueError("파일이 존재하지 않습니다.")
        
        file_type = FileType.UNKNOWN
        
        # 1. 확장자로 판별
        _, ext = os.path.splitext(file_path.lower())
        if ext in self.image_extensions:
            file_type = FileType.IMAGE
        elif ext in self.pdf_extensions:
            file_type = FileType.PDF
        
        # 2. MIME 타입으로 판별 (확장자 판별이 실패한 경우)
        if file_type == FileType.UNKNOWN:
            try:
                mime_type, _ = mimetypes.guess_type(file_path)
                if mime_type:
                    if mime_type.startswith('image/'):
                        file_type = FileType.IMAGE
                    elif mime_type == 'application/pdf':
                        file_type = FileType.PDF
            except Exception as e:
                self.log(f"MIME 타입 판별 중 오류: {e}")
        
        # 3. filetype 라이브러리로 판별
        if file_type == FileType.UNKNOWN:
            try:
                kind = filetype.guess(file_path)
                if kind is not None:
                    if kind.mime.startswith('image/'):
                        file_type = FileType.IMAGE
                    elif kind.mime == 'application/pdf':
                        file_type = FileType.PDF
            except Exception as e:
                self.log(f"Filetype 라이브러리 판별 중 오류: {e}")
        
        # 4. 파일 유효성 검증
        if file_type == FileType.IMAGE:
            if not self._validate_image_file(file_path):
                file_type = FileType.UNKNOWN
        elif file_type == FileType.PDF:
            if not self._validate_pdf_file(file_path):
                file_type = FileType.UNKNOWN
        return file_type
    
    def _validate_image_file(self, file_path: str) -> bool:
        """이미지 파일 유효성 검사"""
        try:
            with Image.open(file_path) as img:
                img.verify()
            return True
        except Exception:
            return False
    
    def _validate_pdf_file(self, file_path: str) -> bool:
        """PDF 파일 유효성 검사"""
        try:
            with open(file_path, 'rb') as f:
                header = f.read(4)
                return header == b'%PDF'
        except Exception:
            return False
    
    def execute(self, state: ParserState) -> ParserState:
        """입력 처리 실행 - 단일 파일 전용"""
        url = state.get("url")

        if not url:
            raise ValueError("URL이 제공되지 않았습니다.")

        self.log("입력 처리 시작 - 단일 파일")

        # 1) 다운로드
        file_path = self._download_file(url)
        
        # 2) 타입 식별
        file_type = self._identify_file_type(file_path)

        # 3) 확장자 산출
        _, ext = os.path.splitext(file_path)
        file_extension = ext.lower()

        # 4) 상태 업데이트 (단일 전용 키)
        state["downloaded_file_path"] = file_path
        state["file_type"] = file_type
        state["file_extension"] = file_extension

        # 요약 로그
        self.log(f"완료 - {file_type.value} -> {os.path.basename(file_path)}")

        return state
