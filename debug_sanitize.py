#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

def sanitize_text_for_braille(text: str) -> str:
    """점자 변환 전 텍스트에서 마크다운 등 불필요한 요소를 최소한으로 제거합니다."""
    # 입력 텍스트가 비어있거나 None인 경우 처리
    if not text or not text.strip():
        return ""
    
    # 최소한의 마크다운 정리만 수행
    # 1. 마크다운 링크 제거 ([text](url) -> text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)

    # 2. 기본 마크다운 서식 제거
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'__(.*?)__', r'\1', text)      # __bold__
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # *italic*
    text = re.sub(r'_(.*?)_', r'\1', text)        # _italic_
    text = re.sub(r'`(.*?)`', r'\1', text)        # `code`

    # 3. 헤더 기호만 제거
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)

    # 4. 여러 줄바꿈 정리 및 양쪽 공백 제거
    text = re.sub(r'\n\s*\n', '\n', text).strip()
    
    return text

def test_sanitize():
    # 사용자가 보고한 텍스트
    original = " 안녕하세요!\n반갑습니다!\n무엇을 도와드릴까요? 궁금한 점이나 알고 싶은 주제가 있다면 편하게 말씀해 주세요."
    
    print("=== Sanitize Function Test ===")
    print(f"Original: {repr(original)}")
    print(f"Original length: {len(original)}")
    print()
    
    sanitized = sanitize_text_for_braille(original)
    print(f"Sanitized: {repr(sanitized)}")
    print(f"Sanitized length: {len(sanitized)}")
    print()
    
    print("Original display:")
    print(original)
    print()
    print("Sanitized display:")
    print(sanitized)
    
    # 빈 문자열이나 너무 짧은 문자열 체크
    if len(sanitized.strip()) < 5:
        print("\n⚠️  WARNING: Sanitized text is too short!")
        print("This might be causing the braille conversion issue.")
    
    # 특수한 경우들 테스트
    test_cases = [
        "안녕하세요!",
        "**굵은 글씨**",
        "# 제목",
        "- 목록 아이템",
        "1. 번호 목록",
        "[링크](http://example.com)",
        "일반 텍스트만 있는 경우",
        "",
        "   ",
        "\n\n\n"
    ]
    
    print("\n=== Additional Test Cases ===")
    for i, test_case in enumerate(test_cases, 1):
        result = sanitize_text_for_braille(test_case)
        print(f"{i}. Input: {repr(test_case)} -> Output: {repr(result)}")

if __name__ == "__main__":
    test_sanitize()