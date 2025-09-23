# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🏗️ Architecture Overview

This is a microservices architecture (MSA) project called SAPIE Braille that processes audio, images, and documents to generate accessible text and speech for visually impaired users. The system is composed of:

- **Frontend**: Next.js application (port 3000) with accessibility features and recording capabilities
- **API Gateway**: Pure L7 routing layer (port 8080)
- **Asset Service**: File metadata and S3 presigned URL management (port 8004) with MongoDB
- **Parser Service**: Document/image analysis and text extraction (port 8000)
- **STT Service**: Speech-to-text using OpenAI Whisper (port 8001)
- **TTS Service**: Text-to-speech using OpenAI TTS (port 8003)

## 🚀 Development Commands

### Starting Services
```bash
# Windows (Recommended - starts all services with proper order)
start-services.bat

# Docker Compose (Alternative)
docker-compose up

# Manual service startup (for development)
python -m backend.services.asset_service.main     # Port 8004
python -m backend.services.parser_service.main    # Port 8000
python -m backend.services.stt_service.main       # Port 8001
python -m backend.services.tts_service.main       # Port 8003
python -m backend.services.api_gateway.main       # Port 8080
```

### Frontend Development
```bash
cd frontend
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Code linting
```

### Testing Services
```bash
# Health checks
curl http://agent.sapie.ai:8080/health           # Overall system
curl http://localhost:8004/health           # Asset Service
curl http://localhost:8000/health           # Parser Service
curl http://localhost:8001/health           # STT Service
curl http://localhost:8003/health           # TTS Service

# API documentation
# http://agent.sapie.ai:8080/docs  (Gateway)
# http://localhost:8004/docs  (Asset)
# http://localhost:8000/docs  (Parser)
# http://localhost:8001/docs  (STT)
# http://localhost:8003/docs  (TTS)
```

### Dependencies
```bash
# Backend services
pip install -r backend/requirements-services.txt

# Frontend
cd frontend && npm install
```

## 🏛️ Project Structure

The project follows a monorepo structure with four core directories:

```
/
├── api/          # Service API clients and schemas
├── core/         # Shared business logic, logging, utilities
├── infra/        # Infrastructure code (S3, Docker, DB)
├── services/     # Individual microservices
└── frontend/     # Next.js application
```

### Core Architecture Patterns

1. **Monorepo Organization**: All services share common modules through the four-directory structure
2. **Service Communication**: Services use `api/clients/` for inter-service communication
3. **File Management**: Two-phase upload pattern (permission → S3 upload → completion report)
4. **Infrastructure Abstraction**: All external services (S3, MongoDB) accessed through `infra/` modules

### Critical Workflows

1. **File Upload by Client**:
   - Client → Asset Service (permission request)
   - Client → S3 (direct upload via presigned URL)
   - Client → Asset Service (completion report)
   - Client → Parser Service (processing request)

2. **File Creation by Service**:
   - Service → Asset Service (permission request)
   - Service → S3 (direct upload)
   - Service → Asset Service (completion report)

## 🔧 Environment Configuration

Required environment variables in `.env`:
```bash
OPENAI_API_KEY=your_api_key_here
```

Service-specific environment files:
- `backend/.env.db` - Database configuration
- `backend/.env.dify` - Dify platform settings

## 📊 Service Dependencies

- **Asset Service**: Independent MongoDB instance
- **All Services**: Can communicate with AWS S3 through `infra/` modules
- **Frontend**: Communicates with API Gateway (port 8080) which routes to appropriate services
- **Inter-service**: Uses HTTP clients in `api/clients/` directory

## 🔍 Key Implementation Details

- **API Gateway**: Pure routing only - no authentication, authorization, or load balancing
- **Asset Service**: Manages file metadata and presigned URLs, NOT file storage
- **Service Independence**: Each service can be deployed and scaled independently
- **Shared Code**: Common functionality in `core/`, infrastructure in `infra/`, API clients in `api/`
- **Frontend Features**: Accessibility-focused with spacebar recording, markdown rendering, focus management