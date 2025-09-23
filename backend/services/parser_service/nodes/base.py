"""
parsing_service의 베이스 클래스들
"""
from abc import ABC, abstractmethod
from typing import Any, Dict
from state import ParserState


class BaseNode(ABC):
    """
    모든 노드의 베이스 클래스
    
    이 클래스는 파싱 파이프라인에서 사용되는 각 단계(노드)의 공통 인터페이스를 정의합니다.
    각 노드는 ParseState를 받아서 처리한 후 수정된 ParseState를 반환합니다.
    """
    
    def __init__(self, verbose=False, **kwargs):
        """
        BaseNode 초기화
        
        Args:
            verbose (bool): 로깅 활성화 여부 (기본값: False)
            **kwargs: 하위 클래스에서 사용할 수 있는 추가 키워드 인자
        """
        # 클래스 이름을 노드의 이름으로 설정 (로깅 시 식별용)
        self.name = self.__class__.__name__
        # 상세 로깅 모드 설정
        self.verbose = verbose

    def log(self, message: str):
        """상세 로깅 모드가 활성화된 경우에만 메시지를 출력합니다."""
        if self.verbose:
            print(f"[{self.name}] {message}")

    @abstractmethod
    def execute(self, state: ParserState) -> ParserState:
        """
        노드의 핵심 실행 로직 (추상 메서드)
        
        하위 클래스에서 반드시 구현해야 하는 메서드입니다.
        이 메서드에서 실제 파싱/처리 작업을 수행합니다.
        
        Args:
            state (ParseState): 현재 파싱 상태
            
        Returns:
            ParseState: 처리 후 수정된 파싱 상태
        """
        pass
    
    def __call__(self, state: ParserState) -> Dict[str, Any]:
        """노드 호출 시 실행되는 메서드"""
        try:
            if self.verbose:
                print(f"[{self.__class__.__name__}] 실행 시작")
            
            result = self.execute(state)
            
            if self.verbose:
                print(f"[{self.__class__.__name__}] 실행 완료")
            
            return result
        except Exception as e:
            error_message = f"[{self.__class__.__name__}] 오류: {e}"
            if self.verbose:
                print(error_message)
            return {"error": error_message}