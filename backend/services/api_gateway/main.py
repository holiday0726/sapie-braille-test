"""
API Gateway 메인 서비스 - Dify 중심 단순화 아키텍처
순수 L7 라우팅만 담당 (매핑, 인증, 인가, 로드밸런싱 제외)
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from typing import Dict, Any, Optional
import logging
import json
import os
import re # 정규식 모듈 임포트
import uuid
from dotenv import load_dotenv
from datetime import datetime, timedelta
from KorToBraille.KorToBraille import KorToBraille
from pydantic import BaseModel
import jwt as pyjwt  # PyJWT 라이브러리를 pyjwt로 alias
import hashlib

# 로깅 설정
logger = logging.getLogger(__name__)

# 점자 변환기 인스턴스 생성
braille_converter = KorToBraille()

# =============================================================================
# BRF 변환 유틸리티
# =============================================================================

# 유니코드 점자 패턴을 BRF ASCII 문자로 변환하는 딕셔너리 (새로운 정확한 테이블)
UNICODE_TO_BRF = {
    '⠀': ' ',   # 20 (space)
    '⠮': '!',   # 21 !
    '⠐': '"',   # 22 "
    '⠼': '#',   # 23 #
    '⠫': '$',   # 24 $
    '⠩': '%',   # 25 %
    '⠯': '&',   # 26 &
    '⠄': "'",   # 27 '
    '⠷': '(',   # 28 (
    '⠾': ')',   # 29 )
    '⠡': '*',   # 2A *
    '⠬': '+',   # 2B +
    '⠠': ',',   # 2C ,
    '⠤': '-',   # 2D -
    '⠨': '.',   # 2E .
    '⠌': '/',   # 2F /
    '⠴': '0',   # 30 0
    '⠂': '1',   # 31 1
    '⠆': '2',   # 32 2
    '⠒': '3',   # 33 3
    '⠲': '4',   # 34 4
    '⠢': '5',   # 35 5
    '⠖': '6',   # 36 6
    '⠶': '7',   # 37 7
    '⠦': '8',   # 38 8
    '⠔': '9',   # 39 9
    '⠱': ':',   # 3A :
    '⠰': ';',   # 3B ;
    '⠣': '<',   # 3C <
    '⠿': '=',   # 3D =
    '⠜': '>',   # 3E >
    '⠹': '?',   # 3F ?
    '⠈': '@',   # 40 @
    '⠁': 'A',   # 41 A
    '⠃': 'B',   # 42 B
    '⠉': 'C',   # 43 C
    '⠙': 'D',   # 44 D
    '⠑': 'E',   # 45 E
    '⠋': 'F',   # 46 F
    '⠛': 'G',   # 47 G
    '⠓': 'H',   # 48 H
    '⠊': 'I',   # 49 I
    '⠚': 'J',   # 4A J
    '⠅': 'K',   # 4B K
    '⠇': 'L',   # 4C L
    '⠍': 'M',   # 4D M
    '⠝': 'N',   # 4E N
    '⠕': 'O',   # 4F O
    '⠏': 'P',   # 50 P
    '⠟': 'Q',   # 51 Q
    '⠗': 'R',   # 52 R
    '⠎': 'S',   # 53 S
    '⠞': 'T',   # 54 T
    '⠥': 'U',   # 55 U
    '⠧': 'V',   # 56 V
    '⠺': 'W',   # 57 W
    '⠭': 'X',   # 58 X
    '⠽': 'Y',   # 59 Y
    '⠵': 'Z',   # 5A Z
    '⠪': '[',   # 5B [
    '⠳': '\\',  # 5C \
    '⠻': ']',   # 5D ]
    '⠘': '^',   # 5E ^
    '⠸': '_',   # 5F _
}

def convert_unicode_braille_to_brf(unicode_text: str) -> str:
    """
    유니코드 점자 문자열을 BRF 아스키 문자열로 변환합니다.
    매핑 테이블에 없는 문자는 '?'로 처리합니다.
    """
    brf_string = ""
    for char in unicode_text:
        brf_string += UNICODE_TO_BRF.get(char, '?')
    return brf_string

# JWT 시크릿 키 (실제 운영에서는 환경변수로 관리)
JWT_SECRET = "sapie-braille-secret-key-2024"
JWT_ALGORITHM = "HS256"

# 간단한 사용자 데이터베이스 (실제 운영에서는 DB 사용)
USERS_DB = {
    "saltware": {
        "password_hash": hashlib.sha256("salt123a".encode()).hexdigest(),
        "username": "saltware"
    }
}

# Pydantic 모델들
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str

def create_access_token(data: dict, expires_delta: timedelta = None):
    """JWT 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    
    to_encode.update({"exp": expire})
    encoded_jwt = pyjwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, password_hash: str) -> bool:
    """비밀번호 검증"""
    return hashlib.sha256(plain_password.encode()).hexdigest() == password_hash

def sanitize_text_for_braille(text: str) -> str:
    """점자 변환 전 텍스트에서 마크다운, 이모지 등 불필요한 요소를 제거합니다."""
    # 입력 텍스트가 비어있거나 None인 경우 처리
    if not text or not text.strip():
        return ""
    
    # 1. 이모지 제거 (다양한 유니코드 범위)
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F700-\U0001F77F"  # alchemical symbols
        "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
        "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
        "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
        "\U0001FA00-\U0001FA6F"  # Chess Symbols
        "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
        "\U00002600-\U000026FF"  # Miscellaneous Symbols
        "\U00002700-\U000027BF"  # Dingbats
        "\U0000FE00-\U0000FE0F"  # Variation Selectors
        "\U0001F1E0-\U0001F1FF"  # Regional Indicator Symbols
        "\U0001F004"             # Mahjong Tile Red Dragon
        "\U0001F0CF"             # Playing Card Black Joker
        "\U0001F18E"             # Negative squared AB
        "\U0001F191-\U0001F19A"  # Squared symbols
        "\U0001F201-\U0001F202"  # Squared Katakana
        "\U0001F21A"             # Squared CJK Unified Ideograph-7121
        "\U0001F22F"             # Squared CJK Unified Ideograph-6307
        "\U0001F232-\U0001F23A"  # Squared CJK Unified Ideographs
        "\U0001F250-\U0001F251"  # Circled Ideographs
        "]+"
    )
    text = emoji_pattern.sub('', text)
    
    # 2. 최소한의 마크다운 정리만 수행
    # 마크다운 링크 제거 ([text](url) -> text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)

    # 3. 기본 마크다운 서식 제거
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'__(.*?)__', r'\1', text)      # __bold__
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # *italic*
    text = re.sub(r'_(.*?)_', r'\1', text)        # _italic_
    text = re.sub(r'`(.*?)`', r'\1', text)        # `code`

    # 4. 헤더 기호만 제거
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)

    # 5. 여러 줄바꿈 정리 및 양쪽 공백 제거
    text = re.sub(r'\n\s*\n', '\n', text).strip()
    
    # 6. 한글, 숫자, 기본 문장 부호 제외한 나머지 문자(영어 포함) 제거
    # 허용할 문자: 한글(가-힣), 숫자(0-9), 공백, 그리고 일부 문장 부호(.,?!")
    text = re.sub(r'[^가-힣0-9\s\.,\?!"]', '', text)

    return text

def extract_quoted_text_for_braille(text: str) -> str:
    """점역변환 에이전트(agent_id == 1)에서만 사용: 따옴표 안의 텍스트만 추출합니다."""
    if not text or not text.strip():
        return text
    
    # 다양한 따옴표 패턴 정의 (순서 중요: 길고 구체적인 패턴부터)
    quote_patterns = [
        r"'([^']+)'",     
        r'"([^"]+)"',    
        r'`([^`]+)`',        
        r'"([^"]+)"',     
    ]
    
    extracted_texts = []
    
    # 각 패턴에 대해 매칭되는 텍스트 추출
    for pattern in quote_patterns:
        matches = re.findall(pattern, text)
        extracted_texts.extend(matches)
    
    # 따옴표 안의 텍스트가 있으면 그것들을 공백으로 연결하여 반환
    if extracted_texts:
        result = ' '.join(extracted_texts).strip()
        logger.info(f"Extracted quoted text: '{text}' -> '{result}'")
        return result
    
    # 따옴표가 없으면 원본 텍스트 반환
    logger.info(f"No quotes found, using original text: '{text}'")
    return text

# 환경 변수 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env.dify'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__) , '..', '..', '.env.openAI'))

app = FastAPI(
    title="API Gateway",
    description="Dify 중심 단순화 아키텍처를 위한 순수 L7 게이트웨이",
    version="2.0.0"
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTPException 중앙 처리"""
    logger.error(
        f"HTTPException: {exc.status_code} - {exc.detail} "
        f"[{request.method} {request.url}]"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder({"detail": exc.detail}),
    )

origins = [
    "http://localhost:3000",
    "https://braille.sapie.ai",
]
# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 로그인 엔드포인트 추가
@app.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """사용자 로그인"""
    logger.info(f"로그인 시도: {login_data.username}")
    
    # 사용자 확인
    user = USERS_DB.get(login_data.username)
    if not user:
        logger.warning(f"존재하지 않는 사용자: {login_data.username}")
        raise HTTPException(
            status_code=401, 
            detail="사용자명 또는 비밀번호가 올바르지 않습니다."
        )
    
    # 비밀번호 확인
    if not verify_password(login_data.password, user["password_hash"]):
        logger.warning(f"잘못된 비밀번호: {login_data.username}")
        raise HTTPException(
            status_code=401, 
            detail="사용자명 또는 비밀번호가 올바르지 않습니다."
        )
    
    # JWT 토큰 생성
    access_token = create_access_token(
        data={"sub": login_data.username, "username": user["username"]}
    )
    
    logger.info(f"로그인 성공: {login_data.username}")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=user["username"]
    )

@app.get("/auth/verify")
async def verify_token(request: Request):
    """토큰 검증"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="토큰이 없습니다.")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
        
        return {"username": username, "valid": True}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except pyjwt.JWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

# 서비스 엔드포인트 매핑
SERVICE_ROUTES = {
    "asset": "http://localhost:8004",
    "parser": "http://localhost:8000", 
    "tts": "http://localhost:8003",
}

@app.get("/")
async def root():
    """API Gateway 정보"""
    return {
        "service": "API Gateway",
        "version": "2.0.0",
        "description": "Dify 중심 단순화 아키텍처",
        "available_services": list(SERVICE_ROUTES.keys())
    }

@app.get("/health")
async def health_check():
    """전체 시스템 상태 확인"""
    health_status = {"gateway": "healthy", "services": {}}
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        for service_name, service_url in SERVICE_ROUTES.items():
            try:
                response = await client.get(f"{service_url}/health")
                health_status["services"][service_name] = "healthy" if response.status_code == 200 else "unhealthy"
            except Exception as e:
                health_status["services"][service_name] = f"error: {str(e)}"
    
    services_healthy = all(status == "healthy" for status in health_status["services"].values())
    overall_status = "healthy" if services_healthy else "degraded"
    
    return {"status": overall_status, **health_status}

# =============================================================================
# Dify API 프록시 엔드포인트들
# =============================================================================

class BrailleConversionRequest(BaseModel):
    text: str

@app.post("/convert-to-braille")
async def convert_to_braille(request: BrailleConversionRequest):
    """텍스트를 점자로 변환"""
    try:
        if not request.text:
            return JSONResponse(status_code=400, content={"detail": "Text is required"})
        
        logger.info(f"=== BRAILLE CONVERSION DEBUG ===")
        logger.info(f"Original text: {repr(request.text)}")
        logger.info(f"Original length: {len(request.text)}")
        
        sanitized_text = sanitize_text_for_braille(request.text)
        logger.info(f"Sanitized text: {repr(sanitized_text)}")
        logger.info(f"Sanitized length: {len(sanitized_text)}")
        
        braille_text = braille_converter.korTranslate(sanitized_text)
        logger.info(f"Braille result: {repr(braille_text)}")
        logger.info(f"Braille length: {len(braille_text)}")
        logger.info(f"=== END BRAILLE DEBUG ===")
        
        return {"braille": braille_text}
    except Exception as e:
        logger.error(f"Error converting to braille: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Braille conversion failed")

class BrfDownloadRequest(BaseModel):
    braille_text: str
    filename: Optional[str] = None

@app.post("/download-brf")
async def download_brf(request: BrfDownloadRequest):
    """점자 텍스트를 BRF 파일로 변환하여 다운로드"""
    try:
        if not request.braille_text:
            raise HTTPException(status_code=400, detail="Braille text is required")
        
        logger.info(f"=== BRF CONVERSION DEBUG ===")
        logger.info(f"Input braille text: {repr(request.braille_text)}")
        logger.info(f"Input length: {len(request.braille_text)}")
        
        # 유니코드 점자를 BRF ASCII로 변환
        brf_content = convert_unicode_braille_to_brf(request.braille_text)
        logger.info(f"BRF result: {repr(brf_content)}")
        logger.info(f"BRF length: {len(brf_content)}")
        logger.info(f"=== END BRF DEBUG ===")
        
        # 파일명 설정
        filename = request.filename or f"braille_conversion_{datetime.now().strftime('%Y%m%d_%H%M%S')}.brf"
        
        # BRF 파일 내용을 바이트로 변환
        brf_bytes = brf_content.encode('ascii', errors='replace')
        
        return StreamingResponse(
            iter([brf_bytes]),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(brf_bytes)),
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        logger.error(f"Error creating BRF file: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="BRF file creation failed")

async def get_dify_api_key() -> str:
    """Dify API 키 가져오기"""
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Dify API 키가 설정되지 않았습니다")
    return api_key

async def call_dify_api(method: str, endpoint: str, **kwargs) -> httpx.Response:
    """Dify API 호출 헬퍼 함수"""
    api_key = await get_dify_api_key()
    headers = kwargs.get('headers', {})
    headers.update({"Authorization": f"Bearer {api_key}"})
    kwargs['headers'] = headers
    
    url = f"http://agent.sapie.ai/v1/{endpoint}"
    logger.info(f"Calling Dify API: {method} {url}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(method, url, **kwargs)
        logger.info(f"Dify API response: {response.status_code}")
        return response

@app.get("/conversations")
async def get_conversations(user: str = "default-user", last_id: str = "", limit: int = 20):
    """대화 목록 조회 - Dify API 직접 프록시"""
    try:
        params = {"user": user, "limit": limit}
        if last_id:
            params["last_id"] = last_id
            
        response = await call_dify_api("GET", "conversations", params=params)
        
        if response.status_code == 200:
            dify_data = response.json()
            
            # Dify 응답을 프론트엔드 형식으로 변환
            conversations = []
            for conv in dify_data.get("data", []):
                conversations.append({
                    "id": conv["id"],  # Dify conversation_id를 직접 사용
                    "title": conv.get("name", "새로운 대화"),
                    "timestamp": conv.get("updated_at", conv.get("created_at", 0)),
                    "status": conv.get("status", "normal")
                })
            
            # timestamp 기준 최신순 정렬
            conversations.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return JSONResponse(content={
                "limit": dify_data.get("limit", limit),
                "has_more": dify_data.get("has_more", False),
                "data": conversations
            })
        else:
            logger.error(f"Dify API error: {response.status_code}, {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Dify API 오류: {response.text}")
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Dify API 응답 시간 초과")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Dify API에 연결할 수 없습니다")
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=502, detail=f"대화 목록 조회 오류: {str(e)}")

@app.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, user: str = "default-user", limit: int = 20):
    """특정 대화의 메시지 내역 조회 - Dify API 직접 프록시"""
    try:
        params = {
            "user": user,
            "conversation_id": conversation_id,
            "limit": limit
        }
        
        response = await call_dify_api("GET", "messages", params=params)
        
        if response.status_code == 200:
            dify_data = response.json()
            
            # 프론트엔드 형식으로 변환
            messages = []
            for msg in dify_data.get("data", []):
                # 사용자 메시지
                if msg.get("query"):
                    # message_files를 files로 변환
                    files = []
                    if msg.get("message_files"):
                        for file in msg["message_files"]:
                            # URL에서 실제 파일 ID 추출
                            actual_file_id = file.get("id")  # 기본값
                            file_url = file.get("url", "")
                            if file_url and "/files/" in file_url:
                                # URL에서 실제 파일 ID 추출: /files/{actual_id}/file-preview
                                try:
                                    url_parts = file_url.split("/files/")[1].split("/")
                                    if url_parts and url_parts[0]:
                                        actual_file_id = url_parts[0]
                                        logger.info(f"Extracted actual file ID: {actual_file_id} from URL: {file_url}")
                                except Exception as e:
                                    logger.warning(f"Failed to extract file ID from URL {file_url}: {e}")
                            
                            files.append({
                                "id": actual_file_id,
                                "name": file.get("filename", file.get("name", "Unknown file")),
                                "type": file.get("type", "document"),
                                "mime_type": file.get("mime_type", "application/octet-stream"),
                                "url": file.get("url")
                            })
                    
                    messages.append({
                        "id": f"user_{msg['id']}",
                        "type": "user",
                        "content": msg["query"],
                        "timestamp": msg.get("created_at", 0),
                        "isVoice": False,
                        "files": files
                    })
                
                # 어시스턴트 응답
                if msg.get("answer"):
                    messages.append({
                        "id": f"assistant_{msg['id']}",
                        "type": "assistant",
                        "content": msg["answer"],
                        "timestamp": msg.get("created_at", 0),
                        "files": []
                    })
            
            # 시간순 정렬
            messages.sort(key=lambda x: x["timestamp"])
            
            return JSONResponse(content={
                "conversation_id": conversation_id,
                "messages": messages,
                "limit": dify_data.get("limit", limit),
                "has_more": dify_data.get("has_more", False)
            })
        else:
            logger.error(f"Dify messages API error: {response.status_code}, {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Dify API 오류: {response.text}")
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Dify API 응답 시간 초과")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Dify API에 연결할 수 없습니다")
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=502, detail=f"메시지 조회 오류: {str(e)}")

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request):
    """특정 대화 삭제 - Dify API 직접 프록시"""
    try:
        # 요청 본문에서 사용자 정보 읽기
        try:
            body = await request.json()
            user = body.get("user", "default-user")
        except Exception:
            user = "default-user"

        response = await call_dify_api(
            "DELETE", 
            f"conversations/{conversation_id}",
            json={"user": user}
        )
        
        if response.status_code in [200, 204]:
            logger.info(f"Successfully deleted conversation {conversation_id}")
            from starlette.responses import Response
            return Response(status_code=204)
        elif response.status_code == 404:
            # 이미 삭제된 경우 성공으로 처리
            logger.warning(f"Conversation {conversation_id} already deleted")
            from starlette.responses import Response
            return Response(status_code=204)
        else:
            logger.error(f"Dify delete API error: {response.status_code}, {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Dify API 삭제 오류: {response.text}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="대화 삭제 중 오류 발생")

@app.post("/process")
async def process_request(request: Request):
    """통합 처리 요청 - Dify chat-messages API 직접 프록시"""
    try:
        body = await request.body()
        if body:
            # UTF-8 디코딩을 fallback과 함께 처리
            try:
                body_str = body.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    body_str = body.decode('cp949')
                except UnicodeDecodeError:
                    body_str = body.decode('latin-1')
            request_data = json.loads(body_str)
        else:
            request_data = {}
        
        # 상세 로깅 - 요청 분석
        logger.info(f"=== PROCESS REQUEST DEBUG ===")
        logger.info(f"Raw request_data: {request_data}")
        
        # conversation_id 처리 로직
        raw_conversation_id = request_data.get("conversation_id")
        logger.info(f"Raw conversation_id: '{raw_conversation_id}' (type: {type(raw_conversation_id)})")
        
        # 첫 메시지인 경우 (빈값, None, 또는 빈 문자열) 빈 문자열로 설정
        if not raw_conversation_id or raw_conversation_id == "" or raw_conversation_id is None:
            conversation_id = ""  # 빈 문자열로 새 대화 생성
            is_new_conversation = True
            logger.info(f"NEW CONVERSATION: Using conversation_id '' (empty string)")
        else:
            conversation_id = str(raw_conversation_id)
            is_new_conversation = False
            logger.info(f"EXISTING CONVERSATION: Using conversation_id '{conversation_id}'")
        
        # 동적 agent 처리 로직 - agent_id를 받아서 문자열로 변환
        agent_id = request_data.get("agent_id", request_data.get("agent", 0))  # agent_id 우선, 후순위 agent
        
        # Agent ID 유효성 검증 (0: 일반, 1: 점역변환, 2: 뉴스, 3: 복지정보, 4: 날씨정보, 5: 문서변환환)
        if not isinstance(agent_id, int) or agent_id < 0 or agent_id > 5:
            logger.warning(f"Invalid agent_id received: {agent_id}, defaulting to 0")
            agent_id = 0
        
        logger.info(f"Using agent_id: {agent_id}")
        
        # 점역변환 에이전트(agent_id == 1)인 경우 직접 처리
        if agent_id == 1:
            logger.info("Processing braille conversion directly without Dify")
            
            async def stream_braille_response():
                try:
                    query_text = request_data.get("query", request_data.get("message", "")).strip()
                    if not query_text:
                        yield f"data: {json.dumps({'event': 'error', 'message': '변환할 텍스트가 입력되지 않았습니다.'})}\n\n"
                        return
                    
                    # 점자 변환 수행 (따옴표 안의 텍스트만 추출)
                    quoted_text = extract_quoted_text_for_braille(query_text)
                    sanitized_text = sanitize_text_for_braille(quoted_text)
                    braille_text = braille_converter.korTranslate(sanitized_text)
                    
                    # 구조화된 마크다운 응답 생성
                    structured_response = f'''**"{query_text}" 점자로 변환하겠습니다.**

**점자 변환 결과:**
```
{braille_text}
```

점자 변환이 완료되었습니다. 위의 점자를 스크린 리더로 읽어보시거나 점자 디스플레이로 확인하실 수 있습니다.'''
                    
                    # 스트리밍으로 응답 전송 (message 이벤트)
                    yield f"data: {json.dumps({'event': 'message', 'chunk': structured_response})}\n\n"
                    
                    # 대화 ID 생성 (새로운 대화인 경우)
                    final_conversation_id = conversation_id if conversation_id else str(uuid.uuid4())
                    
                    # message_end 이벤트 전송
                    metadata = {
                        'braille': braille_text,
                        'original_text': query_text,
                        'agent_type': '점역변환'
                    }
                    
                    yield f"data: {json.dumps({'event': 'message_end', 'conversation_id': final_conversation_id, 'metadata': metadata})}\n\n"
                    
                except Exception as e:
                    logger.error(f"Error in braille conversion: {str(e)}")
                    yield f"data: {json.dumps({'event': 'error', 'message': f'점자 변환 중 오류가 발생했습니다: {str(e)}'})}\n\n"
            
            return StreamingResponse(
                stream_braille_response(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        # 다른 에이전트들은 기존 Dify 방식으로 처리
        # Dify API 요청 형식으로 변환
        is_voice_value = request_data.get("is_voice", 0) # 기본값은 0 (텍스트)
        
        dify_payload = {
            "inputs": {
                "agent": agent_id,
                "is_voice": is_voice_value
            },
            "query": request_data.get("query", request_data.get("message", "")),
            "response_mode": "streaming",
            "conversation_id": conversation_id,
            "user": request_data.get("user", "default-user"),
        }
        
        # parent_message_id가 있으면 추가 (선택적)
        parent_message_id = request_data.get("parent_message_id")
        if parent_message_id:
            dify_payload["parent_message_id"] = parent_message_id
        
        # files가 있을 때만 추가 (빈 배열도 추가하지 않음)
        if request_data.get("files") and len(request_data.get("files", [])) > 0:
            dify_payload["files"] = request_data.get("files")
        
        logger.info(f"Final Dify payload: {dify_payload}")
        logger.info(f"Is new conversation: {is_new_conversation}")
        
        # 스트리밍 응답 제너레이터
        async def stream_dify_response():
            try:
                api_key = await get_dify_api_key()
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    async with client.stream(
                        "POST",
                        "http://agent.sapie.ai/v1/chat-messages",
                        headers=headers,
                        json=dify_payload
                    ) as response:
                        if response.status_code != 200:
                            error_text = await response.aread()
                            error_text_decoded = error_text.decode()
                            logger.error(f"Dify API error: {response.status_code}, {error_text_decoded}")
                            
                            # 404 Conversation Not Exists 에러인 경우 새 대화로 재시도
                            full_answer = "" # 스트리밍 시작 전 전체 답변 초기화
                            if response.status_code == 404 and "Conversation Not Exists" in error_text_decoded:
                                logger.warning(f"Conversation {conversation_id} not found, retrying as new conversation")
                                
                                # 새 대화로 재시도
                                retry_payload = dify_payload.copy()
                                retry_payload["conversation_id"] = ""  # 빈 값으로 새 대화 생성
                                
                                logger.info(f"Retrying with new conversation: {retry_payload}")
                                
                                async with client.stream(
                                    "POST",
                                    "http://agent.sapie.ai/v1/chat-messages",
                                    headers=headers,
                                    json=retry_payload
                                ) as retry_response:
                                    if retry_response.status_code != 200:
                                        retry_error = await retry_response.aread()
                                        logger.error(f"Retry also failed: {retry_response.status_code}, {retry_error.decode()}")
                                        yield f"data: {json.dumps({'event': 'error', 'message': f'대화 생성 실패: {retry_response.status_code}'})}\n\n"
                                        return
                                    
                                    # 재시도 성공 시 스트리밍 처리
                                    async for line in retry_response.aiter_lines():
                                        line = line.strip()
                                        if not line:
                                            continue
                                            
                                        if line.startswith("data: "):
                                            try:
                                                json_data = json.loads(line[6:])
                                                event_type = json_data.get("event", "")
                                                
                                                if event_type == "message":
                                                    chunk = json_data.get("answer", "")
                                                    if chunk:
                                                        full_answer += chunk  # 전체 응답 저장
                                                        yield f"data: {json.dumps({'event': 'message', 'chunk': chunk})}\n\n"
                                                
                                                elif event_type == "message_end":
                                                    received_conversation_id = json_data.get("conversation_id", "")
                                                    metadata = json_data.get("metadata", {})
                                                    
                                                    # 전체 응답을 점자로 변환
                                                    try:
                                                        if full_answer.strip():
                                                            sanitized_text = sanitize_text_for_braille(full_answer)
                                                            braille_text = braille_converter.korTranslate(sanitized_text)
                                                            metadata['braille'] = braille_text
                                                            logger.info(f"Braille conversion successful for retry response (length: {len(braille_text)})")
                                                        else:
                                                            metadata['braille'] = ""
                                                            logger.warning("Empty response, skipping braille conversion")
                                                    except Exception as e:
                                                        logger.error(f"Error converting to braille in retry: {e}")
                                                        metadata['braille'] = "점자 변환 오류"

                                                    logger.info(f"=== NEW CONVERSATION CREATED ===")
                                                    logger.info(f"New conversation_id: '{received_conversation_id}'")
                                                    
                                                    response_data = {
                                                        'event': 'message_end', 
                                                        'conversation_id': received_conversation_id, 
                                                        'metadata': metadata
                                                    }
                                                    
                                                    logger.info(f"Sending new conversation to frontend: {response_data}")
                                                    yield f"data: {json.dumps(response_data)}\n\n"
                                                    return
                                                
                                                elif event_type == "error":
                                                    error_msg = json_data.get("message", "알 수 없는 오류")
                                                    logger.error(f"Dify retry streaming error: {error_msg}")
                                                    yield f"data: {json.dumps({'event': 'error', 'message': error_msg})}\n\n"
                                                    return
                                                    
                                            except json.JSONDecodeError as e:
                                                logger.error(f"Failed to parse retry JSON: {line}, error: {e}")
                                                continue
                                return
                            else:
                                # 다른 종류의 에러
                                yield f"data: {json.dumps({'event': 'error', 'message': f'Dify API 오류: {response.status_code}'})}\n\n"
                                return
                        
                        full_answer = "" # 스트리밍 시작 전 전체 답변 초기화
                        async for line in response.aiter_lines():
                            line = line.strip()
                            if not line:
                                continue
                                
                            if line.startswith("data: "):
                                try:
                                    json_data = json.loads(line[6:])
                                    event_type = json_data.get("event", "")
                                    
                                    if event_type == "message":
                                        chunk = json_data.get("answer", "")
                                        if chunk:
                                            full_answer += chunk # 전체 응답 저장
                                            yield f"data: {json.dumps({'event': 'message', 'chunk': chunk})}\n\n"
                                    
                                    elif event_type == "message_end":
                                        received_conversation_id = json_data.get("conversation_id", "")
                                        metadata = json_data.get("metadata", {})

                                        # 전체 응답을 점자로 변환
                                        try:
                                            logger.info(f"=== CHAT BRAILLE CONVERSION DEBUG (MAIN) ===")
                                            logger.info(f"Full answer: {repr(full_answer)}")
                                            logger.info(f"Full answer length: {len(full_answer)}")
                                            
                                            sanitized_text = sanitize_text_for_braille(full_answer)
                                            logger.info(f"Sanitized: {repr(sanitized_text)}")
                                            logger.info(f"Sanitized length: {len(sanitized_text)}")
                                            
                                            braille_text = braille_converter.korTranslate(sanitized_text)
                                            logger.info(f"Braille result: {repr(braille_text)}")
                                            logger.info(f"Braille length: {len(braille_text)}")
                                            logger.info(f"=== END CHAT BRAILLE DEBUG (MAIN) ===")
                                            
                                            metadata['braille'] = braille_text
                                        except Exception as e:
                                            logger.error(f"Error converting to braille: {e}")
                                            import traceback
                                            logger.error(f"Traceback: {traceback.format_exc()}")
                                            metadata['braille'] = "점자 변환 오류"
                                        
                                        # 상세 로깅 - 응답 분석
                                        logger.info(f"=== MESSAGE_END EVENT ===")
                                        logger.info(f"Original conversation_id sent: '{conversation_id}'")
                                        logger.info(f"Received conversation_id from Dify: '{received_conversation_id}'")
                                        logger.info(f"Is new conversation: {is_new_conversation}")
                                        
                                        response_data = {
                                            'event': 'message_end', 
                                            'conversation_id': received_conversation_id, 
                                            'metadata': metadata
                                        }
                                        
                                        logger.info(f"Sending to frontend: {response_data}")
                                        yield f"data: {json.dumps(response_data)}\n\n"
                                        break
                                    
                                    elif event_type == "error":
                                        error_msg = json_data.get("message", "알 수 없는 오류")
                                        logger.error(f"Dify streaming error: {error_msg}")
                                        yield f"data: {json.dumps({'event': 'error', 'message': error_msg})}\n\n"
                                        break
                                        
                                except json.JSONDecodeError as e:
                                    logger.error(f"Failed to parse JSON: {line}, error: {e}")
                                    continue
                                    
            except Exception as e:
                logger.error(f"Error during streaming: {str(e)}")
                yield f"data: {json.dumps({'event': 'error', 'message': f'스트리밍 중 오류 발생: {str(e)}'})}\n\n"
        
        return StreamingResponse(
            stream_dify_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
                
    except Exception as e:
        logger.error(f"Error in process_request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"요청 처리 중 오류 발생: {str(e)}")

# =============================================================================
# 기존 서비스 프록시 엔드포인트들
# =============================================================================

@app.post("/dify-files-upload")
async def dify_files_upload(request: Request):
    """Dify 파일 업로드 API 프록시"""
    try:
        api_key = await get_dify_api_key()
        
        form_data = await request.form()
        files = {}
        data = {}
        
        for key, value in form_data.items():
            if hasattr(value, "filename"):
                files[key] = (value.filename, await value.read(), value.content_type)
            else:
                data[key] = value

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://agent.sapie.ai/v1/files/upload",
                headers={"Authorization": f"Bearer {api_key}"},
                files=files,
                data=data
            )
            
            if response.status_code == 201:
                return JSONResponse(content=response.json(), status_code=response.status_code)
            else:
                logger.error(f"Dify file upload error: {response.status_code}, {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Dify 파일 업로드 오류: {response.text}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dify_files_upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 업로드 오류: {str(e)}")

@app.get("/files/{file_id}/preview")
async def dify_file_preview(file_id: str, as_attachment: bool = False):
    """Dify 파일 미리보기/다운로드 API 프록시"""
    try:
        api_key = await get_dify_api_key()
        params = {"as_attachment": str(as_attachment).lower()}

        client = httpx.AsyncClient(timeout=60.0)
        req = client.build_request(
            "GET",
            f"http://agent.sapie.ai/v1/files/{file_id}/preview",
            headers={"Authorization": f"Bearer {api_key}"},
            params=params
        )
        r = await client.send(req, stream=True)

        if r.status_code != 200:
            error_text = await r.aread()
            raise HTTPException(status_code=r.status_code, detail=f"Dify 파일 미리보기 오류: {error_text.decode()}")

        return StreamingResponse(
            r.aiter_bytes(),
            status_code=r.status_code,
            headers={k: v for k, v in r.headers.items() if k.lower() in [
                "content-type", "content-disposition", "content-length",
                "cache-control", "accept-ranges"
            ]}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dify_file_preview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 미리보기 오류: {str(e)}")

@app.post("/transcribe")
async def transcribe_audio(request: Request):
    """음성 인식 - OpenAI Whisper API 직접 호출"""
    try:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다")
        
        form = await request.form()
        if "file" not in form:
            raise HTTPException(status_code=400, detail="오디오 파일이 필요합니다")
        
        audio_file = form["file"]
        if not hasattr(audio_file, 'read'):
            raise HTTPException(status_code=400, detail="유효하지 않은 파일입니다")
        
        files = {"file": (audio_file.filename, await audio_file.read(), audio_file.content_type)}
        data = {"model": "whisper-1", "response_format": "json"}
        
        if "language" in form:
            data["language"] = form["language"]
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {openai_api_key}"},
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                return JSONResponse(content={
                    "success": True,
                    "text": result.get("text", ""),
                    "language": result.get("language", "unknown")
                })
            else:
                logger.error(f"OpenAI API error: {response.status_code}, {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"OpenAI API 오류: {response.text}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in STT processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"STT 처리 중 오류 발생: {str(e)}")

@app.post("/synthesize")
async def synthesize_speech(request: Request):
    """음성 합성 - OpenAI TTS API 직접 호출"""
    try:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다")
        
        body = await request.body()
        if not body:
            raise HTTPException(status_code=400, detail="요청 바디가 비어있습니다")
        
        try:
            request_data = json.loads(body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise HTTPException(status_code=400, detail="잘못된 JSON 형식입니다")
        
        text = request_data.get("text", "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="변환할 텍스트가 필요합니다")
        
        voice = request_data.get("voice", "alloy")
        speed = request_data.get("speed", 1.0)
        response_format = request_data.get("format", "mp3")
        
        # 파라미터 검증
        available_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice not in available_voices:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 음성입니다. 사용 가능한 음성: {available_voices}")
        
        if not (0.25 <= speed <= 4.0):
            raise HTTPException(status_code=400, detail="속도는 0.25~4.0 사이의 값이어야 합니다")
        
        supported_formats = ["mp3", "opus", "aac", "flac"]
        if response_format not in supported_formats:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 형식입니다. 사용 가능한 형식: {supported_formats}")
        
        tts_payload = {
            "model": "tts-1",
            "input": text,
            "voice": voice,
            "response_format": response_format,
            "speed": speed
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json"
                },
                json=tts_payload
            )
            
            if response.status_code == 200:
                audio_content = response.content
                return StreamingResponse(
                    iter([audio_content]),
                    media_type=f"audio/{response_format}",
                    headers={
                        "Content-Disposition": f"inline; filename=tts_output.{response_format}",
                        "Content-Length": str(len(audio_content)),
                        "Cache-Control": "no-cache"
                    }
                )
            else:
                logger.error(f"OpenAI TTS API error: {response.status_code}, {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"OpenAI TTS API 오류: {response.text}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in TTS processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS 처리 중 오류 발생: {str(e)}")

# 범용 프록시 라우터
@app.api_route("/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_request(service_name: str, path: str, request: Request):
    """서비스별 요청 프록시"""
    if service_name not in SERVICE_ROUTES:
        raise HTTPException(status_code=404, detail=f"서비스 '{service_name}'를 찾을 수 없습니다.")
    
    target_url = f"{SERVICE_ROUTES[service_name]}/{path}"
    logger.info(f"Proxying {request.method} {request.url} -> {target_url}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = dict(request.headers)
            headers.pop('host', None)
            body = await request.body()
            
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                params=request.query_params,
                content=body
            )
            
            response_headers = dict(response.headers)
            response_headers.pop('content-encoding', None)
            response_headers.pop('content-length', None)
            
            return JSONResponse(
                content=response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                status_code=response.status_code,
                headers=response_headers
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="서비스 응답 시간 초과")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"서비스 '{service_name}'에 연결할 수 없습니다")
    except Exception as e:
        logger.error(f"Error proxying to {target_url}: {str(e)}")
        raise HTTPException(status_code=502, detail=f"서비스 프록시 오류: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # 커스텀 로깅 설정
    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(levelprefix)s %(asctime)s - %(message)s",
                "use_colors": True,
            },
            "custom": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
            },
            "custom": {
                "formatter": "custom",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "": {
                "handlers": ["custom"],
                "level": "DEBUG",
            },
            "uvicorn.error": {
                "handlers": ["custom"],
                "level": "INFO",
                "propagate": False
            },
            "uvicorn.access": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False
            },
        },
    }

    from logging.config import dictConfig
    dictConfig(LOGGING_CONFIG)
    logger.info("Dify 중심 단순화 아키텍처 적용 완료, 서버 시작")
    uvicorn.run(app, host="0.0.0.0", port=8080, log_config=LOGGING_CONFIG)