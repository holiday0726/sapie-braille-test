"""
멀티모달 LLM 노드 (간결 버전)
- layoutparse.llm의 헬퍼들을 활용하여 간결하게 구성
"""
from typing import List, Dict, Any
from nodes.base import BaseNode
from state import ParserState
from util import (supports_vision, create_llm, create_message_with_image)
from dotenv import load_dotenv
import os
load_dotenv()


def _normalize_provider(provider: str) -> str:
    """내부 provider 값을 layoutparse.llm에서 기대하는 값으로 정규화"""
    p = (provider or "openai").lower()
    if p in ("chatgpt", "openai"):  # chatgpt 명칭을 openai로 통일
        return "openai"
    if p in ("anthropic", "google"):
        return p
    return "openai"

class MultimodalLLMNode(BaseNode):
    """단일 이미지 멀티모달 분석 노드"""

    def __init__(self, temperature: float = 0.0, node_type: str = "general", **kwargs):
        super().__init__(**kwargs)
        self.name = f"MultimodalLLMNode_{node_type}"
        self.temperature = temperature
        self.node_type = node_type # 'general', 'accessibility' 등
        
        # 기본 프롬프트 설정
        self.default_prompts = {
            "general": "이미지를 분석해서 마크다운 형식으로 작성해주세요.",
            "accessibility": """이미지를 시각장애인을 위해 분석해주세요. 다음 사항을 포함해서 자세히 설명해주세요:

1. **전체적인 이미지 설명**: 이미지의 주요 내용과 구성 요소
2. **표(Table) 상세 설명**: 
   - 표의 제목과 전체 구조
   - 행과 열의 개수 및 헤더 정보
   - 각 셀의 데이터를 순서대로 읽을 수 있도록 "1행 1열: 값, 1행 2열: 값" 형식으로 설명
   - 표에서 발견되는 주요 패턴이나 트렌드
3. **차트/그래프 상세 설명**:
   - 차트 유형 (막대그래프, 선그래프, 파이차트 등)
   - X축, Y축 정보 및 단위
   - 데이터 포인트별 구체적인 수치
   - 데이터의 변화 추세나 특징점
4. **기타 시각적 요소**: 색상, 레이아웃, 주석 등의 의미

마크다운 형식으로 구조화하되, 모든 시각적 정보를 텍스트로 완전히 설명해주세요."""
        }
        
        # 커스텀 프롬프트가 있으면 사용, 없으면 타입별 기본 프롬프트 사용
        self.prompt = kwargs.get("prompt", self.default_prompts.get(self.node_type, self.default_prompts["general"]))

    def execute(self, state: ParserState) -> dict:
        provider = _normalize_provider(state.get("provider", "openai"))
        model = state.get("model", "gpt-4o")
        
        # 노드 타입에 따라 출력 키를 결정
        if self.node_type == "accessibility":
            output_key = "structured_accessibility_result"
        else: # 'general' 또는 기본값
            output_key = "structured_result"
            
        # 프롬프트 우선순위: state에 있으면 그것을 사용, 없으면 __init__에서 설정된 기본값 사용
        prompt = state.get("prompt") or self.prompt

        source_path = state.get("downloaded_file_path")
        if not source_path:
            raise ValueError("분석할 입력 파일이 없습니다. 'downloaded_file_path'가 필요합니다.")

        if not supports_vision(provider, model):
            raise ValueError(f"해당 모델은 비전 입력을 지원하지 않습니다: {provider}/{model}")

        # LLM 생성
        llm = create_llm(provider, model, temperature=self.temperature)

        # 메시지 구성 (이미지 포함)
        msg = create_message_with_image(provider=provider, text=prompt, image_path=source_path)

        # 실행
        self.log(f"이미지 분석 ({self.node_type}): {source_path}")
        resp = llm.invoke([msg])
        
        # 상태 전체를 반환하는 대신, 수정한 부분만 담은 딕셔너리를 반환
        return {output_key: getattr(resp, "content", resp)}


import asyncio
from typing import List

class BatchMultimodalNode(BaseNode):
    """
    저장된 이미지 파일들('png_filepath')을 기반으로 대체 텍스트를 병렬 생성하는 노드.
    기존 유틸리티(create_llm, create_message_with_image)를 활용합니다.
    """

    def __init__(self, model: str = "gpt-4o", temperature: float = 0.0, verbose: bool = False, **kwargs):
        super().__init__(verbose=verbose, **kwargs)
        self.model = model
        self.temperature = temperature
        self.provider = "openai"  # 이 노드는 openai 사용을 가정
        self.prompt = """이 이미지를 시각장애인을 위해 설명하는 대체 텍스트(alt text)를 생성해줘. 간결하고 명확하게 핵심 내용을 설명해줘."""

    async def _get_alt_text_for_image(self, llm, element_index: int, image_path: str) -> dict:
        """단일 이미지 파일에 대한 대체 텍스트를 비동기적으로 요청하는 함수"""
        if not os.path.exists(image_path):
            self.log(f"Image file not found for index {element_index}: {image_path}", "error")
            return {"element_index": element_index, "alt_text": "오류: 이미지 파일을 찾을 수 없습니다."}

        msg = create_message_with_image(
            provider=self.provider, text=self.prompt, image_path=image_path
        )
        try:
            resp = await llm.ainvoke([msg])
            description = getattr(resp, "content", resp)
            self.log(f"Alt text generated for image at index {element_index} content: {description}")
            return {"element_index": element_index, "alt_text": description}
        except Exception as e:
            self.log(f"Error generating alt text for {image_path}: {e}", "error")
            return {"element_index": element_index, "alt_text": "오류: 대체 텍스트 생성에 실패했습니다."}

    def execute(self, state: ParserState) -> dict:
        """state에서 이미지 파일 경로를 찾아 병렬로 대체 텍스트를 생성합니다."""
        return asyncio.run(self.aexecute(state))

    async def aexecute(self, state: ParserState) -> dict:
        """state에서 이미지 파일 경로를 찾아 병렬로 대체 텍스트를 생성합니다."""
        self.log("Starting parallel generation of alt texts from image files.")
        
        elements = state.get("elements_from_parser", [])
        
        llm = create_llm(
            self.provider, model=self.model, temperature=self.temperature
        )
        
        tasks: List[asyncio.Task] = []
        for i, elem in enumerate(elements):
            if "png_filepath" in elem and elem["png_filepath"] and elem.get("category") == "figure":
                task = asyncio.create_task(
                    self._get_alt_text_for_image(llm, i, elem["png_filepath"])
                )
                tasks.append(task)

        if not tasks:
            self.log("No saved images found to process.")
            return {"is_img_convert": False} # 이미지가 없을 경우 플래그를 False로 설정

        self.log(f"Processing {len(tasks)} images in parallel...")
        results = await asyncio.gather(*tasks)

        for result in results:
            if result:
                element_index = result["element_index"]
                elements[element_index]["alt_text"] = result["alt_text"]

        self.log("Finished generating alt texts.")
        # 업데이트된 elements와 함께 변환 완료 플래그를 반환
        return {"elements_from_parser": elements, "is_img_convert": True}
