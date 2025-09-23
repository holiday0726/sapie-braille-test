
### Parser Service (포트: 8010)
**역할**: 문서 파싱 서비스
- URL로 제공된 문서를 다운로드하여 텍스트와 구조를 추출

**주요 기능**:
- 공개된 URL의 문서 다운로드 및 파싱
- 구조화된 텍스트 반환
- LLM 제공자 및 모델 선택 기능 (기본: openai, gpt-4o)

**Dify 연동 가이드**:
- 이 서비스는 Dify와 같은 외부 도구와 연동할 수 있도록 `openapi.json` 파일을 제공합니다.
- **주의사항**: Dify에 이 서비스를 Tool로 추가할 때, `openapi.json` 파일의 맨 아래 `servers` 항목에 있는 `url`을 Dify가 실제로 접근할 수 있는 IP 주소와 포트로 수정해야 합니다. (예: `http://<외부_IP>:8010`)

**의존성 관리**:
- `Parser Service`는 프로젝트 루트의 `requirements-services.txt`와 별도로 `backend/services/parser_service/requirements.txt`에 명시된 독립적인 의존성을 가집니다.