#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_braille_conversion():
    url = "http://localhost:8080/convert-to-braille"
    
    # 사용자가 보고한 문제 텍스트
    test_text = "안녕하세요!\n반갑습니다!\n무엇을 도와드릴까요? 궁금한 점이나 알고 싶은 주제가 있다면 편하게 말씀해 주세요."
    
    payload = {
        "text": test_text
    }
    
    print("=== Braille Conversion Test ===")
    print(f"Original text: {repr(test_text)}")
    print(f"Original display:\n{test_text}")
    print()
    
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            braille_text = result.get("braille", "")
            print(f"Braille result: {repr(braille_text)}")
            print(f"Braille display: {braille_text}")
            print(f"Braille length: {len(braille_text)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_braille_conversion()