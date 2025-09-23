#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

# UTF-8 인코딩 설정
sys.stdout.reconfigure(encoding='utf-8')

# API Gateway 디렉토리를 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend', 'services', 'api_gateway'))

try:
    from KorToBraille.KorToBraille import KorToBraille
    
    def test_braille_direct():
        print("=== Direct KorToBraille Test ===")
        
        # KorToBraille 인스턴스 생성
        braille_converter = KorToBraille()
        
        # 테스트 텍스트들
        test_cases = [
            "안녕하세요!",
            "반갑습니다!",
            "무엇을 도와드릴까요?",
            "안녕하세요! 반갑습니다! 무엇을 도와드릴까요? 궁금한 점이나 알고 싶은 주제가 있다면 편하게 말씀해 주세요."
        ]
        
        for i, text in enumerate(test_cases, 1):
            print(f"\n{i}. Original: {repr(text)}")
            print(f"   Display: {text}")
            
            try:
                braille = braille_converter.korTranslate(text)
                print(f"   Braille: {repr(braille)}")
                print(f"   Display: {braille}")
                print(f"   Length: {len(braille)}")
                
                # 예상보다 너무 짧은 경우 경고
                if len(braille) < len(text) * 0.3:
                    print(f"   ⚠️  WARNING: Braille result seems too short!")
                    
            except Exception as e:
                print(f"   ❌ ERROR: {e}")
                import traceback
                print(f"   Traceback: {traceback.format_exc()}")
        
        print("\n=== Test Complete ===")
        
    test_braille_direct()
    
except ImportError as e:
    print(f"❌ Failed to import KorToBraille: {e}")
    print("Make sure KorToBraille is installed: pip install KorToBraille==1.0.2")
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    print(f"Traceback: {traceback.format_exc()}")