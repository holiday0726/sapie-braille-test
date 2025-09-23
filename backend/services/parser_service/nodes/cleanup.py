import os
import shutil
from typing import Set
from nodes.base import BaseNode
from state import ParserState

class CleanupNode(BaseNode):
    """
    워크플로우 실행 중에 생성된 중간 파일 및 디렉토리를 정리하는 노드.
    """
    def __init__(
        self,
        cleanup_downloaded: bool = True,
        cleanup_split: bool = True,
        cleanup_images: bool = True,
        verbose: bool = True,
        **kwargs,
    ):
        """
        Args:
            cleanup_downloaded (bool): 다운로드된 원본 파일을 삭제할지 여부.
            cleanup_split (bool): 분할된 PDF 파일들을 삭제할지 여부.
            cleanup_images (bool): 추출된 이미지 파일 및 디렉토리를 삭제할지 여부.
            verbose (bool): 로깅 여부.
        """
        super().__init__(verbose=verbose, **kwargs)
        self.cleanup_downloaded = cleanup_downloaded
        self.cleanup_split = cleanup_split
        self.cleanup_images = cleanup_images

    def execute(self, state: ParserState) -> ParserState:
        # 삭제할 파일 및 디렉토리 경로 수집
        files_to_delete: Set[str] = set()
        dirs_to_delete: Set[str] = set()

        # 1. 다운로드된 원본 파일
        if self.cleanup_downloaded and "downloaded_file_path" in state:
            files_to_delete.add(state["downloaded_file_path"])

        # 2. 분할된 PDF 파일
        if self.cleanup_split and "split_filepaths" in state:
            for path in state["split_filepaths"]:
                files_to_delete.add(path)

        # 3. 추출된 이미지
        if self.cleanup_images and "elements_from_parser" in state:
            for elem in state["elements_from_parser"]:
                if "png_filepath" in elem:
                    # '.../images/category/filename.png' 에서
                    # '.../images' 디렉토리 경로를 추출
                    image_path = elem["png_filepath"]
                    images_dir = os.path.dirname(os.path.dirname(image_path))
                    if os.path.basename(images_dir) == "images":
                        dirs_to_delete.add(images_dir)
                        # 이미지 디렉토리를 삭제할 것이므로 개별 파일 삭제는 불필요
                        break 
        
        # 파일 삭제 실행
        for file_path in files_to_delete:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    self.log(f"파일 삭제됨: {file_path}")
            except OSError as e:
                self.log(f"파일 삭제 오류: {file_path}, {e}")

        # 디렉토리 삭제 실행 (재귀적으로)
        for dir_path in dirs_to_delete:
            try:
                if os.path.exists(dir_path):
                    shutil.rmtree(dir_path)
                    self.log(f"디렉토리 삭제됨: {dir_path}")
            except OSError as e:
                self.log(f"디렉토리 삭제 오류: {dir_path}, {e}")

        return {} # 상태 변경 없음
