"""
Parser Service - 독립 FastAPI 서버 (MCP)
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
import os
import uuid
import asyncio
from fastapi.openapi.utils import get_openapi

from graph import create_main_graph
from state import ParserState

# --- Pydantic Models for OpenAPI Schema ---
class SuccessResponse(BaseModel):
    success: bool = Field(True, description="성공 여부")
    result: Dict[str, Any] = Field(..., description="파싱 결과")

class ErrorResponse(BaseModel):
    detail: str = Field(..., description="오류 메시지")

# --- Pydantic Models ---
# ParseByUrlRequest 모델은 더 이상 사용하지 않으므로 제거하거나 주석 처리합니다.

# --- Service Implementation (Graph Runner) ---
class ParserService:
    def __init__(self):
        # UPSTAGE_API_KEY 환경 변수 확인
        if "UPSTAGE_API_KEY" not in os.environ:
            print("경고: UPSTAGE_API_KEY 환경 변수가 설정되지 않았습니다. PDF 파싱이 실패할 수 있습니다.")

        self.graph = create_main_graph(verbose=True)

    async def initialize(self):
        """서비스 초기화"""
        pass

    async def cleanup(self):
        """서비스 정리"""
        pass

    async def health_check(self) -> Dict[str, Any]:
        """헬스 체크"""
        return {"service_name": "Parser Service", "status": "healthy", "version": "2.0.0"}

    async def run_parsing_graph(self, file_url: str, provider: str, model: str) -> Dict[str, Any]:
        """LangGraph 기반으로 파싱을 실행합니다."""
        thread_id = str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}

        initial_state: ParserState = {
            "url": file_url,
            "provider": provider,
            "model": model,
        }

        print("\n--- [DEBUG] 그래프 실행 시작 ---")
        print(f"입력 상태: {initial_state}")

        final_state = await asyncio.to_thread(self.graph.invoke, initial_state, config=config)

        # print(f"최종 상태: {final_state}")
        print("--- [DEBUG] 그래프 실행 종료 ---\n")

        if final_state:
            if final_state.get("error"):
                return {"success": False, "error": final_state["error"]}

            return {
                "success": True,
                "result": final_state.get("structured_result", "결과 없음")
            }

        return {"success": False, "error": "그래프 실행 중 오류가 발생했습니다."}


# --- FastAPI App ---
parser_service: Optional[ParserService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global parser_service
    parser_service = ParserService()
    await parser_service.initialize()
    yield
    await parser_service.cleanup()


app = FastAPI(
    title="문서 파싱 서비스 (Parser Service)",
    description="URL로 제공된 문서를 다운로드하여 텍스트와 구조를 추출하는 툴입니다.",
    version="2.0.0",
    contact={
        "name": "Sapie AI",
        "email": "contact@sapie.ai",
    },
    lifespan=lifespan
)

# CORS 설정 추가
##개발환경에서는 모든 출처 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # credentials을 False로 변경
    allow_methods=["*"],
    allow_headers=["*"],
)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5001", "http://127.0.0.1:80", "*"], # Dify 주소나 테스트 환경에 맞게 추가
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#     allow_headers=["*"],
# )


@app.get("/")
async def root():
    return {
        "service": "Parser Service",
        "version": "2.0.0",
        "endpoints": {
            "parse_by_url": "GET /parse-by-url",
            "health": "GET /health"
        }
    }

@app.get("/health")
async def health_check():
    if not parser_service:
        raise HTTPException(status_code=503, detail="서비스 미초기화")
    return await parser_service.health_check()




@app.get(
    "/parse-by-url",
    summary="URL로 문서 파싱",
    description="공개된 URL의 문서를 다운로드하여 내용을 파싱하고 구조화된 텍스트를 반환합니다.",
    operation_id="parseDocumentByUrl",
    responses={
        200: {"description": "성공적으로 파싱됨", "model": SuccessResponse},
        500: {"description": "서버 내부 오류", "model": ErrorResponse},
    }
)
async def parse_by_url(
    file_url: str = Query(..., description="파싱할 파일의 공개적으로 접근 가능한 URL입니다.", example="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"),
    provider: str = Query("openai", description="텍스트 생성을 위해 사용할 LLM 제공자 이름입니다. (예: openai)", example="openai"),
    model: str = Query("gpt-4o", description="사용할 구체적인 LLM 모델명입니다. (예: gpt-4o)", example="gpt-4o")
):
    if not parser_service:
        raise HTTPException(status_code=503, detail="서비스 미초기화")
    try:
        result = await parser_service.run_parsing_graph(
            file_url=file_url,
            provider=provider,
            model=model
        )
        return result
    except Exception as e:
        # 실제 운영에서는 에러 로깅이 필요
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"파싱 그래프 실행 중 오류: {str(e)}")


@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint():
    return JSONResponse(get_openapi(title=app.title, version=app.version, routes=app.routes))


if __name__ == "__main__":
    import uvicorn
    print("===== Parser Service (LangGraph) =====")
    print("실행 전 UPSTAGE_API_KEY와 OPENAI_API_KEY 환경변수를 설정해야 할 수 있습니다.")
    print("========================================")
    uvicorn.run("main:app", host="0.0.0.0", port=8010, reload=True)

