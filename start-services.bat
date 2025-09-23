@echo off
echo ====================================
echo   SAPIE Braille MSA Services 시작
echo ====================================

echo.
echo 📋 필요한 패키지 설치 중...
pip install -r requirements.txt

echo.
echo 📁 필요한 디렉토리 생성...
mkdir audio_output 2>nul
mkdir temp_files 2>nul
mkdir shared_data 2>nul

echo.
echo 🚀 서비스들을 순차적으로 시작합니다...
echo   (Asset Service → STT/TTS → Parser Service → API Gateway)

echo.
echo [1/5] Asset Service 시작 중...
start "Asset Service" cmd /k "python -m backend.services.asset_service.main"
timeout /t 3 /nobreak >nul

echo [2/5] STT Service 시작 중...
start "STT Service" cmd /k "python -m backend.services.stt_service.main"
timeout /t 2 /nobreak >nul

echo [3/5] TTS Service 시작 중...
start "TTS Service" cmd /k "python -m backend.services.tts_service.main"
timeout /t 2 /nobreak >nul

echo [4/5] Parser Service 시작 중...
start "Parser Service" cmd /k "python -m backend.services.parser_service.main"
timeout /t 3 /nobreak >nul

echo [5/5] API Gateway 시작 중...
start "API Gateway" cmd /k "python -m backend.services.api_gateway.main"
timeout /t 2 /nobreak >nul

echo.
echo ✅ 모든 서비스가 시작되었습니다!
echo.
echo 🌐 API Gateway (클라이언트 진입점):
echo   http://agent.sapie.ai:8080
echo.
echo 📊 개별 서비스 주소:
echo   - Asset Service:  http://localhost:8004
echo   - Parser Service: http://localhost:8000
echo   - STT Service:    http://localhost:8001
echo   - TTS Service:    http://localhost:8003
echo.
echo 📖 API 문서:
echo   - Gateway: http://agent.sapie.ai:8080/docs
echo   - Asset:   http://localhost:8004/docs
echo   - Parser:  http://localhost:8000/docs
echo   - STT:     http://localhost:8001/docs
echo   - TTS:     http://localhost:8003/docs
echo.
echo 🔍 전체 시스템 상태: http://agent.sapie.ai:8080/health
echo 💡 사용법: API Gateway를 통해 모든 서비스 접근 가능
echo    예: http://agent.sapie.ai:8080/stt/transcribe
echo        http://agent.sapie.ai:8080/tts/synthesize
echo        http://agent.sapie.ai:8080/parser/parse
echo.
pause