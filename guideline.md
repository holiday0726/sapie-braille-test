MSA 기반 Saipe-Braille: 최종 기술 아키텍처 명세서

1. 개요 (Overview)



본 문서는 AI 서비스 플랫폼의 마이크로서비스 아키텍처(MSA)에 대한 기술 명세를 정의합니다. 각 서비스의 역할, 프로젝트의 코드 구성 방식, 그리고 두 가지 핵심 워크플로우(서비스 생성 파일 저장, 클라이언트 업로드 파일 처리)를 명확히 기술하여 일관된 개발 및 코드 생성을 지원하는 것을 목표로 합니다.



2. 아키텍처 다이어그램 (Architecture Diagram)



                      +------------------+
                      |     Clients      |
                      +--------+---------+
                               |
                      +--------v---------+
                      |   API Gateway    |  <-- Pure L7 Routing Only
                      +--------+---------+
                               |
   +---------------------------+---------------------------+
   |        |                  |                 |         |
   | +------v------+  +--------v------+  +-------v-------+  |
   | | Asset       |  | Parser        |  | STT           |  |
   | | Service     |  | Service       |  | Service       |  |
   | | (MongoDB)   |  |               |  |               |  |
   | +-------------+  +---------------+  +---------------+  |
   |                                                      |
   | +----------------------------------------------------+
   | |                                                    |
   | +------v------+                                      |
   | | TTS           |                                      |
   | | Service       |                                      |
   | +---------------+                                      |
   |                                                      |
   +----------------- Services Layer ---------------------+


Asset Service는 독립된 MongoDB를 데이터 스토어로 사용합니다.

모든 서비스는 필요시 infra 모듈을 통해 AWS S3와 직접 통신할 수 있습니다.



3. 프로젝트 구조 및 코드 구성 (Project Structure & Code Organization)

프로젝트는 모노레포(Monorepo) 형태로 구성되며, 최상위 디렉토리는 다음과 같은 네 가지 핵심 폴더로 구성됩니다.

/
├── api/
├── core/
├── infra/
└── services/




core

목적

내부 비즈니스 로직 구현에 필요한 프로젝트 전반의 공통 핵심 기능을 제공합니다.

외부 인프라에 대한 의존성이 없습니다.

포함 내용

로깅(logging), 커스텀 예외 처리(error_handling), 공통 유틸리티(utils)

infra

목적

AWS S3, Docker, 데이터베이스 등 외부 인프라스트럭처와의 통신을 위한 코드를 중앙에서 관리합니다.

포함 내용

S3 클라이언트 및 유틸리티(s3/utils.py), Docker 설정(docker/), DB 연결 코드(db/)

api

목적

API Gateway를 통해 노출되는 API에 대한 클라이언트 코드 또는 명세서를 관리하여 서비스 간 통신을 간소화합니다.

포함 내용

서비스 API 클라이언트(api/clients/), 데이터 모델 스키마(api/schemas/)

services

목적

각 마이크로서비스의 독립적인 비즈니스 로직이 구현되는 공간입니다.

포함 내용

asset_service/, parser_service/ 등

4. 서비스별 역할과 책임 (R&R)

4.1. API Gateway

책임

순수 L7 라우팅 (Pure L7 Routing): HTTP 요청 경로를 기반으로 적절한 내부 서비스로 요청을 전달하는 기능만 수행합니다.

제외되는 기능

인증, 인가, 로드밸런싱

4.2. Asset Service

책임

메타데이터 관리: 파일의 고유 ID, 원본 이름, 상태 등 모든 메타데이터를 관리합니다.

Presigned URL 발급: 파일 접근 권한을 확인하고, S3 업로드/다운로드용 Presigned URL을 생성하여 반환합니다.

데이터베이스

독립된 MongoDB 인스턴스를 사용합니다.

5. 핵심 워크플로우 예시 (Key Workflow Examples)

워크플로우 1: 서비스가 파일을 생성하고 저장하는 경우 (TTS Service)

이 워크플로우는 TTS Service가 클라이언트처럼 동작하여 파일을 생성하고 S3에 저장하는 과정을 설명합니다.

Phase 1: 업로드 허가 요청 및 URL 발급

[TTS Service → Asset Service] 업로드 허가 요청

트리거: TTS Service가 텍스트 변환 요청을 받아 오디오 파일 생성을 완료한 후.

액션: api/clients/asset_client.py를 사용하여 Asset Service에 파일 업로드 허가를 요청합니다.

요청(Request) 내용:

{
  "file_metadata": {
    "filename": "tts_audio.mp3",
    "contentType": "audio/mpeg"
  },
  "user_id": "user-123"
}


[Asset Service] Presigned URL 및 UID 생성

액션: 전달받은 메타데이터를 기반으로 S3 업로드용 Presigned URL과 고유 ID인 uid를 생성합니다. (DB 저장은 아직 X)

[Asset Service → TTS Service] 허가 응답

액션: 업로드를 허가하며, 응답에 생성된 uid와 presigned_url을 포함하여 TTS Service에게 전달합니다.

Phase 2: S3 업로드 및 완료 보고

[TTS Service → S3] 직접 업로드

액션: 전달받은 presigned_url과 infra/s3/utils.py의 업로드 함수를 사용하여 오디오 파일을 S3로 직접 업로드합니다.

[TTS Service → Asset Service] 완료 보고

액션: S3 업로드가 완료된 후, Asset Service에 완료 보고 API를 호출합니다.

요청(Request) 내용:

{
  "uid": "발급받았던-고유-ID"
}


[Asset Service] DB 저장 및 최종 응답

액션: 전달받은 uid와 최초 요청의 메타데이터를 MongoDB에 저장하고, TTS Service에 최종 ok 사인을 보냅니다.



워크플로우 2: 클라이언트가 신규 파일을 업로드하고 처리하는 경우 (Parser Service)

이 워크플로우는 클라이언트가 파일을 시스템에 업로드하고, 이어서 Parser Service가 해당 파일을 처리하는 전 과정을 설명합니다.

Phase 1: 업로드 허가 요청 및 URL 발급

[Client → Asset Service] 업로드 허가 요청

사용자가 파일 메타데이터와 user_id를 담아 Asset Service에 업로드 허가를 요청합니다.

[Asset Service] Presigned URL 및 UID 생성

Asset Service는 전달받은 메타데이터를 기반으로 S3 업로드용 Presigned URL과 고유 식별자인 uid를 생성합니다.

[Asset Service → Client] 허가 응답

Asset Service는 업로드를 허가하며, 응답에 uid와 presigned_url을 포함하여 클라이언트에게 전달합니다.

Phase 2: S3 업로드 및 완료 보고

[Client → S3] 직접 업로드

클라이언트는 전달받은 presigned_url을 사용하여 파일을 S3로 직접 업로드합니다.

[Client → Asset Service] 완료 보고

업로드가 완료되면, 클라이언트는 Asset Service에 uid를 보내 완료되었음을 보고합니다.

[Asset Service] DB 저장 및 최종 응답

Asset Service는 uid와 초기 메타데이터를 MongoDB에 저장하고, 클라이언트에게 최종 ok 사인을 보냅니다.

Phase 3: Parser Service를 통한 파일 처리

[Client → Parser Service] 파일 처리 요청

클라이언트는 완료 사인을 받은 후, 파일 식별을 위한 uid를 담아 Parser Service에 작업을 요청합니다.

[Parser Service → Asset Service] 다운로드 요청

Parser Service는 작업을 위해 uid를 가지고 Asset Service에 다운로드용 URL을 요청합니다.

[Asset Service → Parser Service] 다운로드 URL 응답

Asset Service는 권한 확인 후, 다운로드용 Presigned URL을 생성하여 Parser Service에 반환합니다.

[Parser Service] 파일 다운로드 및 작업 수행

Parser Service는 URL을 이용해 S3에서 파일을 다운로드한 후, 핵심 작업을 수행하고 최종 결과를 클라이언트에게 반환합니다.