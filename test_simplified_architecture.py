#!/usr/bin/env python3
"""
단순화된 아키텍처 테스트 스크립트
"""
import asyncio
import aiohttp
import json

async def test_simplified_services():
    """단순화된 서비스들 테스트"""
    print("=== 단순화된 아키텍처 테스트 ===")
    
    # 테스트할 엔드포인트들 (STT는 이제 API Gateway에 통합됨)
    test_endpoints = [
        ("API Gateway", "http://agent.sapie.ai:8080/health"),
        ("Asset Service", "http://localhost:8004/health"),  
        ("TTS Service", "http://localhost:8003/health"),
        ("STT Integrated", "http://agent.sapie.ai:8080/transcribe"),
    ]
    
    async with aiohttp.ClientSession() as session:
        for service_name, url in test_endpoints:
            try:
                # STT Integrated는 POST 요청으로 테스트
                if service_name == "STT Integrated":
                    async with session.post(url, data={}, timeout=3) as response:
                        if response.status == 400:  # "오디오 파일이 필요합니다" 에러 예상
                            print(f"✅ {service_name}: 정상 작동 (API Gateway에 통합됨)")
                        else:
                            print(f"⚠️  {service_name}: 예상하지 못한 상태 코드 {response.status}")
                else:
                    async with session.get(url, timeout=3) as response:
                        if response.status == 200:
                            print(f"✅ {service_name}: 정상 작동")
                        else:
                            print(f"⚠️  {service_name}: 상태 코드 {response.status}")
            except Exception as e:
                print(f"❌ {service_name}: 연결 실패 - {str(e)}")
    
    print("\n=== 더미 파일 업로드 테스트 ===")
    
    try:
        async with aiohttp.ClientSession() as session:
            # 더미 파일 업로드 테스트
            upload_data = {
                "file_metadata": {
                    "filename": "test.txt",
                    "contentType": "text/plain"
                },
                "user_id": "test-user"
            }
            
            async with session.post(
                "http://agent.sapie.ai:8080/upload",
                json=upload_data,
                timeout=5
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ 더미 파일 업로드 성공: {result.get('uid', 'N/A')}")
                else:
                    print(f"⚠️  파일 업로드 테스트 실패: {response.status}")
                    
    except Exception as e:
        print(f"❌ 파일 업로드 테스트 오류: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_simplified_services())