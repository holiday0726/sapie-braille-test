#!/usr/bin/env python3
"""
보안 패치 테스트 스크립트
프론트엔드에서 직접 OpenAI API 호출 제거 확인
"""
import os
import sys
import re

def check_security_vulnerabilities():
    """보안 취약점 검사"""
    vulnerabilities = []
    warnings = []
    
    frontend_dir = "frontend/src"
    
    # 프론트엔드 파일들 검사
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # 위험한 패턴들 검사
                    dangerous_patterns = [
                        (r'NEXT_PUBLIC_OPENAI_API_KEY', 'CRITICAL: OpenAI API key exposed to client'),
                        (r'api\.openai\.com', 'CRITICAL: Direct OpenAI API call'),
                        (r'NEXT_PUBLIC_AWS_ACCESS_KEY_ID', 'WARNING: AWS access key exposed to client'),
                        (r'NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY', 'WARNING: AWS secret key exposed to client'),
                        (r'Bearer.*process\.env\.NEXT_PUBLIC', 'CRITICAL: API key in Authorization header'),
                    ]
                    
                    for pattern, message in dangerous_patterns:
                        if re.search(pattern, content):
                            if 'CRITICAL' in message:
                                vulnerabilities.append(f"{file_path}: {message}")
                            else:
                                warnings.append(f"{file_path}: {message}")
                
                except Exception as e:
                    print(f"파일 읽기 오류: {file_path} - {e}")
    
    return vulnerabilities, warnings

def check_safe_patterns():
    """안전한 패턴들 확인"""
    safe_patterns = []
    
    frontend_dir = "frontend/src"
    
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 안전한 패턴들 검사
                    good_patterns = [
                        (r'agent.sapie.ai:8080/transcribe', 'OK: Safe STT call via API Gateway'),
                        (r'agent.sapie.ai:8080/upload', 'OK: Safe file upload via Asset Service'),
                        (r'보안 개선:', 'OK: Security improvement comment found'),
                    ]
                    
                    for pattern, message in good_patterns:
                        if re.search(pattern, content):
                            safe_patterns.append(f"{file_path}: {message}")
                
                except Exception as e:
                    print(f"파일 읽기 오류: {file_path} - {e}")
    
    return safe_patterns

def main():
    print("=== 보안 패치 검증 시작 ===")
    print("=" * 50)
    
    # 취약점 검사
    vulnerabilities, warnings = check_security_vulnerabilities()
    
    print("검사 결과:")
    print("-" * 30)
    
    if vulnerabilities:
        print("[CRITICAL] 치명적 보안 위험 발견:")
        for vuln in vulnerabilities:
            print(f"  {vuln}")
    else:
        print("[OK] 치명적 보안 위험 없음")
    
    if warnings:
        print("\n[WARNING] 경고사항:")
        for warn in warnings:
            print(f"  {warn}")
    else:
        print("[OK] 경고사항 없음")
    
    # 안전한 패턴 확인
    safe_patterns = check_safe_patterns()
    if safe_patterns:
        print("\n[OK] 안전한 구현 확인:")
        for pattern in safe_patterns:
            print(f"  {pattern}")
    
    print("\n" + "=" * 50)
    
    # 결과 판정
    if vulnerabilities:
        print("[FAIL] 보안 패치 실패: 치명적 취약점이 여전히 존재합니다.")
        return False
    elif warnings:
        print("[PARTIAL] 보안 패치 부분 성공: 일부 경고사항이 있지만 치명적 위험은 해결되었습니다.")
        return True
    else:
        print("[SUCCESS] 보안 패치 완료: 모든 보안 위험이 해결되었습니다!")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)