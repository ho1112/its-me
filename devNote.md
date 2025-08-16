# 잇츠 미(It's Me) 프로젝트 개발 노트

> **프로젝트**: AI 기반 인터랙티브 포트폴리오 챗봇  
> **시작일**: 2025년 8월 16일  
> **목표**: RAG 기반 대화형 포트폴리오로 채용 담당자와의 상호작용 경험 제공

---

## 📋 프로젝트 개요

### 🎯 핵심 아이디어
- **기존 문제점**: 정적인 텍스트 이력서는 일방적 정보 전달, 상호작용 불가
- **해결 방안**: AI 챗봇이 지원자의 개인 데이터를 RAG로 검색하여 질문에 맞는 맞춤형 답변 제공
- **차별화**: 독립 실행 + 외부 사이트 임베딩 가능한 구조

### 🏗️ 아키텍처 설계
- **"두뇌(API)"**: Next.js API Route + LangChain + Gemini + Supabase
- **"얼굴(UI)"**: React 위젯 컴포넌트
- **배포**: Vercel (API 서버) + GitHub Pages (위젯 임베딩)

---

## 🚀 Phase 1: 초기 환경 구축 (2025-08-16)

### ✅ 완료된 작업들

#### 1. Git 저장소 연결
```bash
git init
git remote add origin https://github.com/ho1112/its-me.git
git add .
git commit -m "Initial commit: Add DESIGN.md"
git branch -M main
git push -u origin main
```
- **결과**: GitHub 저장소와 성공적으로 연결됨
- **참고**: `DESIGN.md` 파일이 이미 존재하여 초기 커밋에 포함

#### 2. Next.js 프로젝트 생성
**문제 발생**: `create-next-app`이 기존 파일과 충돌
```bash
# 시도했던 명령어 (실패)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
# 에러: DESIGN.md 파일과 충돌
```

**해결 방법**: 수동으로 `package.json` 생성 후 의존성 설치
```json
{
  "name": "its-me",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.4",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
```

#### 3. Next.js 최신 버전 업데이트
**문제**: 초기 설치 시 Next.js 14.0.4 버전이 설치됨
```bash
# 해결
npm install next@latest
# 결과: Next.js 15.4.6 (최신 버전)으로 업데이트
```

#### 4. 프로젝트 설정 파일들 생성
- `next.config.js` - Next.js 설정
- `tailwind.config.js` - Tailwind CSS 설정  
- `postcss.config.js` - PostCSS 설정
- `tsconfig.json` - TypeScript 설정 (경로 별칭 `@/*` 포함)
- `src/app/globals.css` - 전역 CSS (Tailwind import)
- `src/app/layout.tsx` - 루트 레이아웃
- `src/app/page.tsx` - 메인 페이지

#### 5. shadcn/ui 초기화
```bash
npx shadcn@latest init --yes
# 스타일: New York (Recommended)
# 색상: Neutral
# 결과: components.json, src/lib/utils.ts 생성

# 기본 UI 컴포넌트 추가
npx shadcn@latest add button card input textarea
```

#### 6. 핵심 라이브러리 설치
**시행착오**: `@vercel/ai` 패키지명이 변경됨
```bash
# 시도 (실패)
npm install @vercel/ai langchain @langchain/google-genai @supabase/supabase-js
# 에러: '@vercel/ai' 패키지를 찾을 수 없음

# 해결
npm install ai langchain @langchain/google-genai @supabase/supabase-js
# 성공: 52개 패키지 설치
```

#### 7. 프로젝트 폴더 구조 생성
```bash
mkdir -p src/components/chatbot src/data src/widget docs scripts
```

#### 8. 환경 변수 예시 파일 생성
- `env.example` 파일 생성 (`.env.local.example`은 차단됨)
- Google Gemini API, Supabase 설정 등 포함

### 🔍 발견된 문제점들과 해결책

#### 문제 1: create-next-app 충돌
- **원인**: 기존 `DESIGN.md` 파일과 충돌
- **해결**: 수동으로 `package.json` 생성 후 의존성 설치
- **교훈**: 기존 파일이 있는 디렉토리에서는 `create-next-app` 사용 시 주의 필요

#### 문제 2: Next.js 버전
- **원인**: 수동 생성 시 하드코딩된 버전 (14.0.4)
- **해결**: `npm install next@latest`로 최신 버전 업데이트
- **교훈**: 최신 버전 사용을 위해 명시적 업데이트 필요

#### 문제 3: 패키지명 변경
- **원인**: `@vercel/ai` → `ai`로 패키지명 변경
- **해결**: 공식 문서 확인 후 올바른 패키지명 사용
- **교훈**: 라이브러리 설치 시 최신 공식 문서 참조 필요

#### 문제 4: next.config.js 경고
- **원인**: Next.js 15에서 `experimental.appDir` 옵션이 기본값이 됨
- **해결**: 해당 옵션 제거
- **교훈**: Next.js 버전별 설정 옵션 변경사항 확인 필요

---

## 🚀 Phase 2: AI 챗봇 위젯 개발 (2025-08-16)

### ✅ 완료된 작업들

#### 1. 챗봇 위젯 컴포넌트 생성
**파일**: `src/components/chatbot/ChatbotWidget.tsx`

**주요 기능**:
- **환영 메시지**: 첫 방문 시 자동으로 챗봇이 대화 시작
- **토글 버튼**: 오른쪽 하단에 💬 버튼으로 챗봇 열기/닫기
- **메시지 표시**: 사용자와 AI의 대화를 구분하여 표시
- **로딩 애니메이션**: AI 응답 대기 중 점 3개 애니메이션
- **자동 스크롤**: 새 메시지 시 자동으로 맨 아래로 스크롤
- **타임스탬프**: 각 메시지의 시간 표시

**UI 특징**:
- **고정 위치**: 화면 우측 하단에 고정
- **카드 형태**: shadcn/ui Card 컴포넌트 활용
- **반응형**: 모바일과 데스크톱 모두 지원
- **색상 구분**: 사용자(파란색), AI(회색) 메시지 구분

#### 2. 메인 페이지 통합
**파일**: `src/app/page.tsx` 업데이트

**추가된 내용**:
- 챗봇 위젯 컴포넌트 import 및 렌더링
- 사용자 안내 메시지: "오른쪽 하단의 💬 버튼을 클릭하여 챗봇과 대화해보세요!"
- 챗봇 위젯이 메인 페이지에 완벽하게 통합

#### 3. API 라우트 생성
**파일**: `src/app/api/chat/route.ts`

**현재 구현**:
- **임시 응답 시스템**: 키워드 기반 응답 (RAG 파이프라인 대체용)
- **응답 지연 시뮬레이션**: 1초 지연으로 실제 AI 응답과 유사한 경험
- **에러 처리**: API 오류 시 적절한 에러 메시지 반환
- **타임스탬프**: 응답 시간 기록

**임시 응답 데이터**:
```typescript
const mockResponses: { [key: string]: string } = {
  '안녕': '안녕하세요! 저는 이력서 챗봇입니다...',
  '이름': '안녕하세요! 저는 이호연입니다...',
  '경력': '프론트엔드 개발 경험은 총 5년입니다...',
  '기술': '주요 기술 스택은 React, TypeScript...',
  '프로젝트': '최근에는 Next.js와 TypeScript를 활용한...',
  '연락처': '이메일: leehoyeon@example.com...',
}
```

### 🔍 Phase 2에서 발견된 문제점들과 해결책

#### 문제 1: next.config.js 경고 지속
- **상황**: 개발 서버 실행 시 여전히 `appDir` 경고 발생
- **원인**: 브라우저 캐시 또는 이전 빌드 파일 영향
- **해결**: 개발 서버 재시작으로 해결
- **교훈**: 설정 파일 변경 후 개발 서버 재시작 필요

#### 문제 2: 컴포넌트 import 경로
- **상황**: `@/components/chatbot/ChatbotWidget` 경로 사용
- **확인**: `tsconfig.json`의 `@/*` 별칭이 제대로 작동하는지 확인
- **결과**: 정상 작동, 컴포넌트 로드 성공
- **교훈**: TypeScript 경로 별칭 설정이 올바르게 작동함

### 📊 현재 프로젝트 상태

#### ✅ 완료된 것들
- [x] Git 저장소 연결
- [x] Next.js 15.4.6 프로젝트 생성
- [x] TypeScript + Tailwind CSS + ESLint 설정
- [x] shadcn/ui 초기화 및 기본 컴포넌트
- [x] 핵심 라이브러리 설치 (AI, LangChain, Supabase)
- [x] 프로젝트 폴더 구조 생성
- [x] 환경 변수 설정 파일
- [x] 빌드 테스트 성공
- [x] **AI 챗봇 위젯 컴포넌트 개발 완료**
- [x] **메인 페이지에 챗봇 통합 완료**
- [x] **API 라우트 생성 및 임시 응답 시스템 구현**

#### 🚧 다음 단계 예정
- [ ] **RAG 파이프라인 구현** (현재 임시 응답 시스템)
- [ ] **Supabase 벡터 DB 설정**
- [ ] **Gemini API 연동**
- [ ] **실제 개인 데이터베이스 구축**
- [ ] **위젯 임베딩 기능 구현**

### 💡 Phase 2 개발 팁 & 노하우

1. **컴포넌트 설계**: 사용자 경험을 우선으로 한 직관적인 UI 설계
2. **임시 시스템**: 완벽한 시스템 구축 전 임시 응답으로 사용자 경험 테스트
3. **에러 처리**: API 오류 시에도 사용자에게 친화적인 메시지 제공
4. **로딩 상태**: AI 응답 대기 시간을 시각적으로 표현하여 사용자 경험 향상

---

## 📝 다음 세션 시작 시 체크리스트

- [x] `npm run dev`로 개발 서버 실행 확인
- [x] 브라우저에서 `http://localhost:3000` 접속 테스트
- [x] 챗봇 위젯 렌더링 확인
- [x] 챗봇 토글 버튼 클릭 테스트
- [x] 임시 응답 시스템 작동 확인
- [ ] 현재 설치된 패키지 버전 확인: `npm list`
- [ ] Git 상태 확인: `git status`

---

*마지막 업데이트: 2025-08-16 (Phase 2 완료)*
