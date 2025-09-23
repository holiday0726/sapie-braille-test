# layoutparse/llm_utils.py
from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
# from langchain_anthropic import ChatAnthropic
# from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import base64
from pathlib import Path
import random
from langgraph.graph.state import CompiledStateGraph
from dataclasses import dataclass

# 기존 헬퍼 함수들 (그대로 유지)
LLM_CONFIG = {
    "openai": {
        "gpt-4o": {"class": ChatOpenAI, "supports_vision": True},
        "gpt-4o-mini": {"class": ChatOpenAI, "supports_vision": True},
        "gpt-4-turbo": {"class": ChatOpenAI, "supports_vision": True},
    },
    # "anthropic": {
    #     "claude-3-5-sonnet": {"class": ChatAnthropic, "model_name": "claude-3-5-sonnet-20241022", "supports_vision": True},
    #     "claude-3-haiku": {"class": ChatAnthropic, "model_name": "claude-3-haiku-20240307", "supports_vision": True},
    #     "claude-3-opus": {"class": ChatAnthropic, "model_name": "claude-3-opus-20240229", "supports_vision": True},
    # },
    # "google": {
    #     "gemini-1.5-pro": {"class": ChatGoogleGenerativeAI, "supports_vision": True},
    #     "gemini-1.5-flash": {"class": ChatGoogleGenerativeAI, "supports_vision": True},
    # }
}

def create_llm(provider: str, model: str, **kwargs):
    """LLM 인스턴스 생성"""
    if provider not in LLM_CONFIG or model not in LLM_CONFIG[provider]:
        raise ValueError(f"지원하지 않는 조합: {provider}/{model}")
    
    config = LLM_CONFIG[provider][model]
    llm_class = config["class"]
    
    if "model_name" in config:
        kwargs["model"] = config["model_name"]
    else:
        kwargs["model"] = model
    
    return llm_class(**kwargs)


def supports_vision(provider: str, model: str) -> bool:
    """비전 지원 여부 확인"""
    if provider not in LLM_CONFIG or model not in LLM_CONFIG[provider]:
        return False
    return LLM_CONFIG[provider][model].get("supports_vision", False)


def create_message(prompt: str) -> HumanMessage:
    """모델별 메시지 생성"""
    return HumanMessage(content=[{"type": "text", "text": prompt}])


def create_message_with_image(provider: str, text: str, image_path: str, **kwargs) -> HumanMessage:
    """모델별 멀티모달 메시지 생성"""
    
    with open(image_path, 'rb') as f:
        image_data = f.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    suffix = Path(image_path).suffix.lower()
    media_type_map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', 
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
    }
    media_type = media_type_map.get(suffix, 'image/jpeg')
    
    if provider == "anthropic":
        if media_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
            media_type = "image/jpeg"
            
        return HumanMessage(
            content=[
                {"type": "text", "text": text},
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64,
                    },
                },
            ]
        )
    else:
        data_url = f"data:{media_type};base64,{image_base64}"
        return HumanMessage(
            content=[
                {"type": "text", "text": text},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]
        )





@dataclass
class NodeStyles:
    default: str = (
        "fill:#45C4B0, fill-opacity:0.3, color:#23260F, stroke:#45C4B0, stroke-width:1px, font-weight:bold, line-height:1.2"  # 기본 색상
    )
    first: str = (
        "fill:#45C4B0, fill-opacity:0.1, color:#23260F, stroke:#45C4B0, stroke-width:1px, font-weight:normal, font-style:italic, stroke-dasharray:2,2"  # 점선 테두리
    )
    last: str = (
        "fill:#45C4B0, fill-opacity:1, color:#000000, stroke:#45C4B0, stroke-width:1px, font-weight:normal, font-style:italic, stroke-dasharray:2,2"  # 점선 테두리
    )


def generate_random_hash():
    return f"{random.randint(0, 0xffffff):06x}"