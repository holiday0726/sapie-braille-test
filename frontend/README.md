# Sapie Braille Frontend

Next.js 기반의 Sapie Braille 프론트엔드 애플리케이션입니다.

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

### 3. 빌드

```bash
npm run build
npm start
```

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css          # 글로벌 스타일
│   │   ├── layout.tsx           # 루트 레이아웃
│   │   ├── page.tsx             # 메인 페이지
│   │   └── about/
│   │       └── page.tsx         # 소개 페이지
│   └── components/
│       └── Header.tsx           # 헤더 컴포넌트
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## 🎨 기능

- **메인 페이지**: 텍스트 입력 및 파일 업로드 인터페이스
- **소개 페이지**: 프로젝트 개요 및 기술 스택 소개
- **반응형 디자인**: 모바일 및 데스크톱 지원
- **현대적인 UI**: 그라데이션 배경과 글래스모피즘 효과

## 🔧 기술 스택

- **Next.js 14**: React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안정성을 위한 정적 타입 언어
- **CSS Modules**: 컴포넌트 스타일링
- **React Hooks**: 상태 관리

## 📝 TODO

- [ ] 백엔드 API 연결
- [ ] 파일 업로드 기능 구현
- [ ] 음성 재생 컴포넌트 추가
- [ ] 사용자 인터페이스 개선
- [ ] 접근성 기능 강화

## 🤝 기여

이 프로젝트는 개발 중입니다. 기여를 원하시면 이슈를 생성하거나 풀 리퀘스트를 보내주세요.
