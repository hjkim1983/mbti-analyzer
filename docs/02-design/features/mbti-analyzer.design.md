# PDCA Design: 카카오톡 MBTI 분석기 웹앱

> **Feature**: mbti-analyzer
> **Phase**: Design
> **Created**: 2026-02-26
> **Plan Reference**: `docs/01-plan/features/mbti-analyzer.plan.md`
> **Status**: ✅ Confirmed (현재 코드·`supabase-schema.sql` 기준 — 2026-03-31)

---

## 1. 아키텍처 개요

### 1.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 (Next.js)                       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │UploadCard│  │ MemoCard │  │AnalyzeBtn│  │  PaymentModal    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │              │             │                  │           │
│  ┌────▼──────────────▼─────────────▼──────────────────▼─────────┐│
│  │                    useAnalysis (커스텀 훅)                     ││
│  │  - 이미지 Base64 변환                                         ││
│  │  - 디바이스 ID 관리                                           ││
│  │  - 간단/심층 탭·무료/유료 분기 (`analysis-tier.js`)              ││
│  │  - stage: main | payment | loading | result                    ││
│  └──────────┬───────────────────────┬───────────────────────────┘│
│             │                       │                             │
│    ┌────────▼────────┐    ┌────────▼──────────┐                  │
│    │  usePayment 훅  │    │ LoadingScreen     │                  │
│    │  (포트원 SDK)    │    │ ResultScreen      │                  │
│    └────────┬────────┘    └───────────────────┘                  │
└─────────────┼────────────────────────────────────────────────────┘
              │
    ┌─────────▼──────────────────────────────────────────┐
    │              Next.js API Routes (서버)                │
    │                                                       │
    │  ┌──────────────────┐  ┌──────────────────────────┐  │
    │  │ /api/analyze      │  │ /api/payment/verify      │  │
    │  │ (POST)            │  │ (POST)                    │  │
    │  │                   │  │                           │  │
    │  │ 1. 횟수 검증       │  │ 1. paymentId 수신        │  │
    │  │ 2. Gemini API 호출│  │ 2. 포트원 API 검증        │  │
    │  │ 3. 결과 DB 저장    │  │ 3. payments 테이블 기록   │  │
    │  │ 4. 횟수 +1        │  │ 4. 검증 결과 반환         │  │
    │  └────────┬─────────┘  └──────────┬───────────────┘  │
    └───────────┼────────────────────────┼──────────────────┘
                │                        │
    ┌───────────▼──────┐    ┌────────────▼──────────┐
    │  Google Gemini    │    │  PortOne V2 API       │
    │  (멀티모달 분석)   │    │  (결제 검증)           │
    └──────────────────┘    └───────────────────────┘
                │
    ┌───────────▼──────────────────────────────────────┐
    │                   Supabase                         │
    │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
    │  │ profiles  │  │ analyses │  │    payments      ││
    │  └──────────┘  └──────────┘  └──────────────────┘│
    └──────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름 (핵심 시퀀스)

```
사용자                  클라이언트                API Route              Supabase       Gemini       PortOne
  │                       │                        │                     │              │             │
  │──이미지+이름+메모──→│                        │                     │              │             │
  │                       │──Base64 변환──→ 메모리  │                     │              │             │
  │                       │                        │                     │              │             │
  │──"분석 요청" 클릭──→│                        │                     │              │             │
  │                       │──deviceId + 횟수 조회─→│                     │              │             │
  │                       │                        │──analysis_count──→│              │             │
  │                       │                        │←──count 반환───── │              │             │
  │                       │←─횟수 결과─────────── │                     │              │             │
  │                       │                        │                     │              │             │
  │              ┌────────┤                        │                     │              │             │
  │              │간단·무료│──/api/analyze 호출───→│                     │              │             │
  │              │또 심층  │  (deviceId+mode+이미지) │──Gemini 호출─────→│──────────→  │             │
  │              │결제후   │                        │←─분석 결과─────── │←───────────  │             │
  │              │        │                        │──결과 저장, 횟수+1→│              │             │
  │              │        │←─분석 결과 반환──────│                     │              │             │
  │              │        │                        │                     │              │             │
  │              │간단·유료│──결제 모달 표시──→ UI │                     │              │             │
  │              │또 심층  │                        │                     │              │             │
  │              │        │                        │                     │              │             │
  │──결제 진행 클릭──→  │──포트원 SDK 호출─────→│                     │              │──결제요청→│
  │              │        │                        │                     │              │             │
  │              │        │←─paymentId─────────── │                     │              │←결제완료─│
  │              │        │──/api/payment/verify──→│                     │              │             │
  │              │        │                        │──포트원 검증 요청──→│              │──────────→│
  │              │        │                        │←─검증 결과─────── │              │←─────────│
  │              │        │                        │──payments 기록───→│              │             │
  │              │        │←─검증 성공──────────│                     │              │             │
  │              │        │                        │                     │              │             │
  │              │        │──/api/analyze 호출───→│ (위 무료 플로우와 동일)              │             │
  │              └────────┤                        │                     │              │             │
  │                       │                        │                     │              │             │
  │←──결과 화면────────│                        │                     │              │             │
```

---

## 2. 컴포넌트 설계

### 2.1 컴포넌트 트리

```
app/layout.js                          # suppressHydrationWarning 적용
└── app/page.js ("use client")         # ✅ 변경: next/dynamic(ssr:false) 진입점
    └── HomeContent (dynamic, ssr:false) # ✅ 추가: isMounted 가드 포함
        ├── Header
        ├── [stage === "main"]
        │   ├── HeroSection
        │   ├── ui/Tabs (간단 / 심층) — `activeTab`; 심층은 분석 클릭 시 결제 단계
        │   ├── UploadCard
        │   │   ├── NameInput (인라인)
        │   │   ├── DropZone (인라인)
        │   │   └── StatusBanner (인라인)
        │   ├── MemoCard
        │   │   ├── QuickTags (인라인)
        │   │   └── TextArea (인라인)
        │   ├── FreeCountBadge
        │   └── AnalyzeButton
        ├── [stage === "payment"]
        │   └── PaymentModal
        ├── [stage === "loading"]
        │   └── LoadingScreen
        └── [stage === "result"]
            └── ResultScreen
                ├── MbtiCard
                ├── IndicatorDetail
                ├── ChatPatterns
                ├── ProfileAnalysis (isMulti일 때)
                └── Disclaimer
```

> **✅ 설계 변경 이유**: 브라우저 확장 프로그램(Endic 등)이 React hydration 이전에 DOM을 수정하여  
> 발생하는 Hydration 에러를 완전히 차단하기 위해 `next/dynamic(ssr:false)` + `isMounted` 이중 가드 적용.

### 2.2 상태 관리 (useAnalysis 훅)

```javascript
// src/hooks/useAnalysis.js

/**
 * 분석 전체 플로우를 관리하는 커스텀 훅
 *
 * @returns {Object}
 *  stage: "main" | "payment" | "loading" | "result"
 *  activeTab: "simple" | "deep" — 간단은 캡처만(메모 비사용), 심층은 메모 필수·매회 결제
 *  images: Array<{file: File, preview: string}>
 *  targetName, memo, result, error, freeCount: {used, remaining} | null
 *  마운트 시 profiles 조회: 행 없으면 freeCount = { used:0, remaining: FREE_LIMIT(5) }
 *  requestAnalysis — 간단: 무료 한도 내 즉시 API / 초과 시 payment; 심층: 항상 payment
 *  onPaymentComplete(paymentId) 후 /api/analyze (mode deep|simple)
 */
```

**상태 전이 다이어그램**:

```
              requestAnalysis()
  "main" ─────────────────────────────────────────→ "loading" ────→ "result"
    │                                                   ↑               │
    │     심층 탭 또는 간단·무료 한도 초과                     │               │
    └──────────→ "payment" ──onPaymentComplete()────────┘               │
                    │                                                    │
                    └──취소──→ "main"                    reset()←────────┘
                                                          │
                                                          ▼
                                                       "main"
```

### 2.3 주요 컴포넌트 인터페이스

#### Header

```jsx
// src/components/Header.jsx
// 글래스모피즘 적용된 고정 헤더
// Props: 없음
// 기능: 로고, 서비스명, BETA 뱃지, 남은 무료 횟수 표시
```

#### UploadCard

```jsx
// src/components/UploadCard.jsx
// Props:
//   images: Array<{file, preview}>
//   targetName: string
//   onAddImages: (files: FileList) => void
//   onRemoveImage: (index: number) => void
//   onTargetNameChange: (name: string) => void
//
// 내부 상태: isDragging (드래그앤드롭 UI 전환용)
// 기능:
//   - 드래그앤드롭 + 클릭 업로드 (간단 최대 3장 / 심층 최대 10장)
//   - 이미지 미리보기 그리드 (3열)
//   - 분석 대상 이름 입력
//   - 업로드 상태 배너 (0장/1장/2+장 종합모드)
```

#### MemoCard

```jsx
// src/components/MemoCard.jsx
// Props:
//   memo: string
//   onMemoChange: (text: string) => void
//   onToggleTag: (tag: string) => void
//
// 기능:
//   - 12개 퀵 태그 토글 버튼
//   - 자유 텍스트 입력 (심층 탭, 최소 20자 등 `analysis-tier` 규칙)
//   - 글자수 카운터
```

#### AnalyzeButton

```jsx
// src/components/AnalyzeButton.jsx
// Props:
//   canAnalyze: boolean
//   freeCount: {used: number, remaining: number}
//   isMulti: boolean
//   hasMemo: boolean
//   imageCount: number
//   onAnalyze: () => void
//
// 기능:
//   - 분석 가능 여부에 따른 활성/비활성 UI
//   - 남은 무료 횟수 표시 ("무료 N회 남음" 또는 "유료 분석 ₩1,900")
//   - 입력 상태 요약 칩 (캡처 N장, 추가정보 입력됨)
//   - 분석 모드별 버튼 텍스트 변경
```

#### PaymentModal

```jsx
// src/components/PaymentModal.jsx
// Props:
//   isOpen: boolean
//   analysisCount: number
//   onConfirm: () => void     // 결제 진행
//   onCancel: () => void       // 취소
//
// 기능:
//   - 글래스모피즘 오버레이 모달
//   - 결제 금액 (₩1,900) 안내
//   - 누적 분석 횟수 표시
//   - 결제 진행 / 취소 버튼
//   - 포트원 SDK 호출은 usePayment 훅에서 처리
```

#### LoadingScreen

```jsx
// src/components/LoadingScreen.jsx
// Props:
//   loadingStep: number
//   isMulti: boolean
//   hasMemo: boolean
//   imageCount: number
//
// 기능:
//   - 단계별 프로그레스 표시 (pulse-ring + float 애니메이션)
//   - ✅ 변경: imageCount 기반 동적 로딩 메시지
//     · isMulti: "캡처 이미지 N장 분석 중..." → 전체 맥락 → 말투 분석 → ...
//     · hasMemo only: 말투 → 입력 정보 → MBTI 대조 → 완료
//     · 단일 이미지: 말투 → 이모티콘 → MBTI 대조 → 완료
//   - 각 단계 완료 체크마크 전환
//   - 프로그레스 도트 인디케이터
//   - ✅ 추가: 인터벌 동적 조정 (5장: 3000ms/단계)
```

#### ResultScreen

```jsx
// src/components/ResultScreen.jsx
// Props:
//   result: AnalysisResult     // Gemini AI 응답 파싱 결과
//   targetName: string
//   memo: string
//   isMulti: boolean
//   hasMemo: boolean
//   onReset: () => void
//   onShare: () => void
//
// 서브 컴포넌트:
//   - MbtiCard: 유형 이모지, 4글자, 별명, 태그
//   - IndicatorDetail: E/I, S/N, T/F, J/P 지표별 점수 바 + 근거
//   - ChatPatterns: 주요 말투 특징 리스트
//   - ProfileAnalysis: 프로필 이미지 분석 (isMulti 전용)
//   - Disclaimer: 주의사항 배너
```

#### GlassCard

```jsx
// src/components/GlassCard.jsx
// Props:
//   children: ReactNode
//   className?: string
//   variant?: "default" | "highlight" | "subtle"
//   animate?: boolean   // slide-up 애니메이션 적용 여부
//   delay?: number      // 애니메이션 딜레이 (초)
//
// 글래스모피즘 공통 래퍼 — 모든 카드에 일관된 스타일 적용
```

---

## 3. API 설계

### 3.1 POST `/api/analyze`

**요청**:

```typescript
interface AnalyzeRequest {
  deviceId: string;
  targetName: string;
  memo: string;                   // 심층 모드에서만 서버가 사용 (간단은 "")
  images: Array<{
    base64Data: string;           // 순수 base64 (data URL 아님)
    mimeType: string;             // image/jpeg | image/png 등
  }>;
  mode?: "simple" | "deep";      // 기본 simple
  paymentId?: string;             // 유료 시 포트원 paymentId
}
```

**응답 (성공 200)**:

```typescript
interface AnalyzeResponse {
  success: true;
  data: {
    analysisId: string;          // DB 저장된 분석 ID (공유용)
    mbtiType: string;            // "INFP"
    emoji: string;               // "🌿"
    title: string;               // "선의의 옹호자"
    color: string;               // "#A29BFE"
    confidence: number;          // 72
    confidenceLevel: string;     // "MEDIUM"
    indicators: {
      EI: IndicatorResult;
      SN: IndicatorResult;
      TF: IndicatorResult;
      JP: IndicatorResult;
    };
    highlights: {
      chatPatterns: string[];    // 말투 특징 리스트
      profileAnalysis: string | null;
      behaviorAnalysis: string | null;
    };
    traits: string[];            // 주요 특성 4개
    tags: string[];              // "#공감", "#진심" 등
    conflicts: string[];         // 지표 간 충돌 메모
    profile: {                   // 프로필 분석 (이미지 2+장)
      mood: string;
      status: string;
      bg: string;
      score: number;
    } | null;
  };
  freeCount: {
    used: number;
    remaining: number;
  };
}

interface IndicatorResult {
  result: string;      // "I" | "E" | "S" | "N" | "T" | "F" | "J" | "P"
  score: number;       // 0~100
  confidence: number;  // 0~100
  evidence: string[];  // 근거 문장 배열
}
```

**에러 응답**:

```typescript
// 400 — 입력 부족
{ success: false, error: "INVALID_INPUT", message: "이미지 또는 메모가 필요합니다" }

// 402 — 결제 필요
{ success: false, error: "PAYMENT_REQUIRED", message: "…", freeCount: { used, remaining } }

// (클라이언트 전용) PAYMENT_INVALID 등은 포트원 흐름에서 별도 처리

// 429 — AI 할당량 초과 ✅ 추가
{ success: false, error: "QUOTA_EXCEEDED", message: "AI 서버 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요." }

// 500 — AI 분석 실패
{ success: false, error: "ANALYSIS_FAILED", message: "AI 분석 중 오류가 발생했습니다" }

// 504 — AI 타임아웃
{ success: false, error: "ANALYSIS_TIMEOUT", message: "분석 시간이 초과되었습니다. 다시 시도해주세요" }
```

**서버 로직 흐름**:

```
1. validateAnalysisRequest({ mode, images, memo }) — 간단/심층 규칙(장 수·메모 길이) 검사
2. getAnalysisCount(deviceId) — profiles 조회·없으면 insert
3. requiresPayment(mode, count) — 심층이면 항상 true; 간단이면 count >= FREE_LIMIT(5)
4. 유료인데 paymentId 없으면 402 PAYMENT_REQUIRED
5. Gemini 멀티모달 호출 (system: mbti_skills + 티어 힌트, user: buildUserParts)
6. parseGeminiAnalysisJson — 마크다운 펜스 제거·parts 병합·정규식 폴백
7. saveAnalysis — analyses.insert(..., analysis_mode: simple|deep)
8. incrementAnalysisCount(profileId) — RPC increment_analysis_count 또는 폴백 update
9. 응답 반환
```

### 3.2 POST `/api/payment/verify`

**요청**:

```typescript
interface PaymentVerifyRequest {
  paymentId: string;   // 포트원에서 반환된 결제 ID
  deviceId: string;    // 디바이스 식별자
}
```

**응답 (성공 200)**:

```typescript
interface PaymentVerifyResponse {
  success: true;
  data: {
    verified: boolean;
    paymentId: string;
    amount: number;
    status: "paid" | "failed" | "cancelled";
  };
}
```

**서버 로직 흐름**:

```
1. paymentId로 포트원 V2 API 조회 (GET /payments/{paymentId})
2. 응답에서 status === "PAID" 확인
3. amount === 1900 확인 (금액 위변조 방지)
4. payments INSERT — 실패 시 500 (클라이언트에 실패 메시지)
5. 검증 결과 반환
```

### 3.3 GET `/api/analysis/[id]` (결과 공유용 — P2)

```typescript
// 공유 URL로 접근 시 분석 결과 조회
interface AnalysisDetailResponse {
  success: true;
  data: Omit<AnalyzeResponse["data"], "analysisId">;
}
```

---

## 4. Gemini AI 프롬프트 설계

### 4.1 System Prompt

```
당신은 세 가지 입력 데이터를 통합 분석하여 MBTI를 추론하는 전문 심리언어학 분석 에이전트입니다.

[mbti_skills.md 전문 삽입 — Part 1~5의 모든 체크리스트, 가중치, 충돌 해결 규칙]

## 출력 규칙
1. 반드시 아래 JSON 스키마에 맞춰 응답하세요.
2. JSON 외의 텍스트를 포함하지 마세요.
3. evidence 배열에는 한국어로 구체적 근거를 3개 이상 작성하세요.
4. conflicts 배열에는 지표 간 충돌이 있을 경우 설명을 포함하세요.
5. 확신도(confidence)는 Part 4.3의 신뢰도 등급 기준을 따르세요.
```

### 4.2 User Prompt 빌더

```javascript
// src/lib/gemini.js — buildUserPrompt()

function buildUserPrompt({ targetName, memo, images }) {
  const parts = [];

  // 분석 대상 지정
  parts.push({
    text: `## 분석 대상\n이름: ${targetName || "미지정"}\n\n` +
          `이 사람의 MBTI를 아래 입력 데이터를 기반으로 분석해주세요.\n` +
          `이미지에서 대화([A])와 프로필([B])을 스스로 분류하여 분석하세요.`
  });

  // [A][B] 이미지 첨부
  images.forEach((img, i) => {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,  // "image/jpeg" | "image/png"
        data: img.base64Data     // 순수 base64 (접두사 제거)
      }
    });
  });

  // [C] 행동/성격 텍스트
  if (memo && memo.trim()) {
    parts.push({
      text: `\n## [C] 행동/성격 텍스트 (관찰자 입력)\n${memo}`
    });
  }

  // 가중치 안내
  const hasImages = images.length > 0;
  const hasMemo = memo && memo.trim().length > 0;

  let weightGuide = "";
  if (hasImages && hasMemo) {
    weightGuide = "가중치: [A] 카카오톡 대화 50%, [B] 프로필 사진 15%, [C] 행동/성격 텍스트 35%";
  } else if (hasImages && !hasMemo) {
    weightGuide = "가중치: [A] 카카오톡 대화 65%, [B] 프로필 사진 35% ([C] 누락)";
  } else if (!hasImages && hasMemo) {
    weightGuide = "가중치: [C] 행동/성격 텍스트 100% (단, 신뢰도 LOW 고정)";
  }

  parts.push({
    text: `\n## 분석 가중치\n${weightGuide}`
  });

  // JSON 스키마 요구
  parts.push({
    text: `\n## 출력 형식\n아래 JSON 스키마에 맞춰 응답하세요. JSON만 출력하세요.\n` +
    `{\n` +
    `  "mbtiType": "XXXX",\n` +
    `  "confidence": 0-100,\n` +
    `  "confidenceLevel": "HIGH|MEDIUM|LOW",\n` +
    `  "indicators": {\n` +
    `    "EI": {"result":"I|E","score":0-100,"confidence":0-100,"evidence":["근거1","근거2","근거3"]},\n` +
    `    "SN": {"result":"S|N","score":0-100,"confidence":0-100,"evidence":[...]},\n` +
    `    "TF": {"result":"T|F","score":0-100,"confidence":0-100,"evidence":[...]},\n` +
    `    "JP": {"result":"J|P","score":0-100,"confidence":0-100,"evidence":[...]}\n` +
    `  },\n` +
    `  "highlights": {\n` +
    `    "chatPatterns": ["특징1","특징2",...],\n` +
    `    "profileAnalysis": "프로필 분석 요약 또는 null",\n` +
    `    "behaviorAnalysis": "행동 분석 요약 또는 null"\n` +
    `  },\n` +
    `  "traits": ["특성1","특성2","특성3","특성4"],\n` +
    `  "tags": ["#태그1","#태그2","#태그3"],\n` +
    `  "conflicts": ["충돌 설명..."] 또는 [],\n` +
    `  "profile": {"mood":"분위기","status":"상태메시지 스타일","bg":"배경 취향","score":0-100} 또는 null\n` +
    `}`
  });

  return parts;
}
```

### 4.3 Gemini API 호출 설정

```javascript
// src/lib/gemini.js — callGemini()

// ✅ 변경: gemini-2.0-flash → gemini-2.5-flash (무료 할당량 초과 해결)
const MODEL = "gemini-2.5-flash";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const generationConfig = {
  temperature: 0.3,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 8192,              // ✅ 변경: 4096 → 8192 (JSON 잘림 방지)
  responseMimeType: "application/json",
  candidateCount: 1,                  // ✅ 추가: 불필요한 후보 생성 제거
};

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

// ✅ 변경: 15000 → 55000 (이미지 5장 처리 대응, Vercel maxDuration=60과 맞춤)
const TIMEOUT_MS = 55000;
```

**에러 처리 추가 (할당량 초과)**:
```javascript
if (res.status === 429 || errText.includes("RESOURCE_EXHAUSTED")) {
  throw new Error("QUOTA_EXCEEDED");
}
// route.js에서 429 상태로 변환하여 클라이언트에 전달
```

**JSON 파싱 폴백 로직**:
```javascript
try {
  return JSON.parse(text);
} catch {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  // 잘린 JSON 복구 시도 (닫는 괄호 추가) 후 실패 시 에러
}
```

### 4.4 AI 응답 → MBTI 데이터 매핑

Gemini 응답의 `mbtiType`에 따라 UI 표시용 데이터 보강:

```javascript
// src/constants/mbti-data.js
// 16가지 MBTI 유형 전체 데이터 (기존 4개 → 16개 확장)

const MBTI_META = {
  ENFP: { emoji: "🌟", title: "열정적인 활동가", color: "#FF6B6B" },
  INTJ: { emoji: "🧠", title: "전략적 분석가", color: "#4ECDC4" },
  INFJ: { emoji: "🌿", title: "선의의 옹호자", color: "#A29BFE" },
  INFP: { emoji: "🦋", title: "열정적인 중재자", color: "#DDA0DD" },
  ENFJ: { emoji: "🌻", title: "정의로운 사회운동가", color: "#FFB347" },
  ENTJ: { emoji: "👑", title: "대담한 통솔자", color: "#2ECC71" },
  ENTP: { emoji: "💡", title: "뜨거운 논쟁가", color: "#F39C12" },
  INTP: { emoji: "🔬", title: "논리적인 사색가", color: "#3498DB" },
  ISFJ: { emoji: "🛡️", title: "용감한 수호자", color: "#1ABC9C" },
  ISTJ: { emoji: "📋", title: "청렴결백한 논리주의자", color: "#34495E" },
  ISFP: { emoji: "🎨", title: "호기심 많은 예술가", color: "#E91E63" },
  ISTP: { emoji: "🔧", title: "만능 재주꾼", color: "#607D8B" },
  ESFJ: { emoji: "🤝", title: "사교적인 외교관", color: "#E74C3C" },
  ESTJ: { emoji: "📊", title: "엄격한 관리자", color: "#8E44AD" },
  ESFP: { emoji: "🎭", title: "자유로운 영혼의 연예인", color: "#FD79A8" },
  ESTP: { emoji: "⚡", title: "모험을 즐기는 사업가", color: "#00BCD4" },
};
```

---

## 5. 결제 로직 상세 설계

### 5.1 usePayment 훅

```javascript
// src/hooks/usePayment.js

/**
 * 포트원 V2 결제 플로우 관리
 *
 * @returns {Object}
 *  requestPayment(deviceId): Promise<{paymentId: string} | null>
 *  isProcessing: boolean
 *  error: string | null
 */

// 내부 구현:
// 1. @portone/browser-sdk의 PortOne.requestPayment() 호출
// 2. 성공 시 paymentId 반환 → 부모에서 /api/payment/verify 호출
// 3. 실패/취소 시 null 반환
```

### 5.2 포트원 결제 요청 파라미터

```javascript
const paymentRequest = {
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID,
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,  // ✅ 환경변수로 관리
  paymentId: `mbti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  orderName: "카톡 MBTI 분석 1회",
  totalAmount: 1900,
  currency: "CURRENCY_KRW",   // ✅ 변경: PortOne V2 enum 형식
  payMethod: "CARD",
  customer: {
    customerId: deviceId,
  },
};
```

### 5.3 서버 사이드 결제 검증

```javascript
// src/app/api/payment/verify/route.js

// 포트원 V2 API를 사용하여 결제 상태 검증
// API: GET https://api.portone.io/payments/{paymentId}
// Header: Authorization: PortOne {PORTONE_API_SECRET}

// 검증 체크리스트:
// 1. status === "PAID"
// 2. amount.total === 1900
// 3. 이미 사용된 paymentId가 아닌지 (payments 테이블 중복 체크)
```

---

## 6. 유틸리티 설계

### 6.1 디바이스 ID (src/lib/device-id.js)

```javascript
/**
 * 비로그인 사용자 식별을 위한 디바이스 ID 생성/조회
 *
 * 전략:
 * 1. localStorage에서 기존 ID 확인
 * 2. 없으면 crypto.randomUUID() + 브라우저 fingerprint 해시 조합
 * 3. 결과를 localStorage에 저장
 *
 * @returns {string} "uuid-fingerprinthash" 형태
 */
export function getDeviceId(): string

/**
 * 간단한 브라우저 fingerprint 생성
 * canvas + userAgent + language + screenResolution 조합 → SHA-256 해시
 *
 * @returns {string} 해시 문자열 (16자)
 */
function generateFingerprint(): string
```

### 6.2 이미지 처리 (src/lib/image-utils.js)

```javascript
/**
 * ✅ 변경: 장수별 압축 프리셋 추가 (5장 동시 전송 시 총 페이로드 ~4MB 이하 유지)
 *
 * | 장수 | 최대 해상도 | JPEG 품질 |
 * |------|-----------|---------|
 * |  1장 | 1024px    | 82%     |
 * |  2장 |  900px    | 78%     |
 * |  3장 |  800px    | 72%     |
 * |  4장 |  720px    | 68%     |
 * |  5장 |  640px    | 62%     |
 */

/**
 * File → Base64 변환 (장수에 따른 자동 압축 강도 조정)
 *
 * @param {File}   file        - 이미지 파일
 * @param {number} totalImages - 함께 전송할 이미지 총 장수 (압축 강도 결정)
 * @returns {Promise<{base64: string, base64Data: string, mimeType: string}>}
 */
export async function fileToBase64(file, totalImages = 1): Promise<ImageData>

/**
 * Base64 문자열에서 data URI 접두사 제거
 * "data:image/jpeg;base64,/9j/4A..." → "/9j/4A..."
 */
export function stripBase64Prefix(base64DataUri: string): string
```

### 6.3 분석 횟수 관리 (src/lib/analysis-count.js)

```javascript
/**
 * 디바이스의 분석 횟수 조회
 * profiles 테이블에서 device_id로 조회
 * 프로필 없으면 자동 생성 (analysis_count: 0)
 *
 * @param {string} deviceId
 * @returns {Promise<{profileId: string, count: number}>}
 */
export async function getAnalysisCount(deviceId): Promise<CountResult>

/**
 * 분석 횟수 +1 증가
 * @param {string} profileId
 * @returns {Promise<number>} 업데이트 후 횟수
 */
export async function incrementAnalysisCount(profileId): Promise<number>

const FREE_LIMIT = 5;        // 간단 모드 무료 분석 횟수 (analysis-tier.js)
const PRICE_PER_ANALYSIS = 1900;  // 건당 가격 (원)
```

### 6.4 Supabase 클라이언트 (src/lib/supabase.js)

```javascript
/**
 * 싱글톤 Supabase 클라이언트 (브라우저·API Route 공통)
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 필수
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
> API Route는 동일 모듈을 import하며, 별도 `createServerSupabase` 분리는 없음.

---

## 7. 글래스모피즘 디자인 시스템

### 7.1 글로벌 CSS (src/app/globals.css)

```css
@import "tailwindcss";

/* ─── 폰트 ─── */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

:root {
  --glass-bg: rgba(255, 255, 255, 0.65);
  --glass-border: rgba(255, 255, 255, 0.3);
  --glass-blur: 20px;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);

  --color-primary: #FEE500;
  --color-primary-dark: #FFD000;
  --color-purple: #A29BFE;
  --color-success: #10B981;
  --color-error: #EF4444;

  --gradient-bg: linear-gradient(135deg, #FFF9C4 0%, #E8EAF6 50%, #F3E5F5 100%);
}

body {
  font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  background: var(--gradient-bg);
  background-attachment: fixed;
  min-height: 100vh;
}

/* ─── 글래스 카드 변형 ─── */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--glass-shadow);
}

.glass-subtle {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
}

.glass-highlight {
  background: rgba(254, 229, 0, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(254, 229, 0, 0.3);
  border-radius: 24px;
}

.glass-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

/* ─── 애니메이션 ─── */
@keyframes pulse-ring {
  0% { transform: scale(0.85); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pop {
  0% { transform: scale(0.75); opacity: 0; }
  80% { transform: scale(1.04); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.anim-float { animation: float 3s ease-in-out infinite; }
.anim-slide-up { animation: slide-up 0.45s ease forwards; }
.anim-pulse-ring { animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
.anim-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

/* 순차 애니메이션 딜레이 */
.delay-1 { animation-delay: 0.08s; opacity: 0; }
.delay-2 { animation-delay: 0.18s; opacity: 0; }
.delay-3 { animation-delay: 0.30s; opacity: 0; }
.delay-4 { animation-delay: 0.42s; opacity: 0; }
.delay-5 { animation-delay: 0.54s; opacity: 0; }
.delay-6 { animation-delay: 0.66s; opacity: 0; }
```

### 7.2 기존 JSX 대비 변경 사항

| 기존 (`kakao-mbti-scanner.jsx`) | 변경 후 |
|-------------------------------|---------|
| `bg-white rounded-3xl shadow-sm border` | `glass` 클래스 적용 |
| `bg-gray-50` 배경 | 그라데이션 배경 (`--gradient-bg`) |
| 인라인 `<style>` 블록 | `globals.css`로 분리 |
| 단일 컴포넌트 604줄 | 8개 컴포넌트 + 2개 훅으로 분리 |
| `MBTI_DATA` 4개 하드코딩 | 16유형 전체 + AI 동적 매핑 |
| `Math.random()` 결과 | Gemini AI 실제 분석 결과 |
| 결제 로직 없음 | 간단 5회 무료 + 심층 유료 + 포트원 통합 |

---

## 8. 에러 처리 전략

### 8.1 클라이언트 에러 처리

```javascript
// useAnalysis 훅 내부 에러 핸들링

// ✅ 추가: PAYMENT_REQUIRED 시 null 반환 → startLoading().then(data)에서 null 가드 필수
apiPromise.catch((err) => {
  if (err.message === "PAYMENT_REQUIRED") {
    clearInterval(timerRef.current);
    setStage("payment");
    return null;  // startLoading의 .then(data)로 null 전달
  }
  throw err;
});

// startLoading 내부 — null 가드
.then((data) => {
  clearInterval(timerRef.current);
  if (!data) return;  // ✅ 필수: PAYMENT_REQUIRED로 null이 반환된 경우 조기 종료
  setLoadingStep(messages.length);
  setTimeout(() => {
    setResult(data);
    if (data.freeCount) setFreeCount(data.freeCount);
    setStage("result");
  }, 600);
})

// 에러 코드별 처리
switch (data.error) {
  case "PAYMENT_REQUIRED":  setStage("payment"); break;
  case "QUOTA_EXCEEDED":    setError("AI 서버 요청 한도 초과. 1분 후 재시도"); break;  // ✅ 추가
  case "ANALYSIS_TIMEOUT":  setError("분석 시간 초과. 다시 시도해주세요."); break;
  default:                  setError("오류가 발생했어요. 잠시 후 다시 시도해주세요.");
}
```

### 8.2 서버 에러 처리

```javascript
// /api/analyze/route.js

// ✅ 추가: Vercel 함수 실행 시간 제한 확장
export const maxDuration = 60;  // Hobby: 최대 60초

// Gemini API 호출 시 AbortController로 타임아웃 관리
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 55000);  // ✅ 변경: 15000 → 55000

try {
  const geminiResponse = await fetch(API_ENDPOINT, {
    signal: controller.signal,
    // ...
  });
  clearTimeout(timeout);

  // JSON 파싱 실패 대비 (AI가 비정상 응답 반환 시)
  let parsed;
  try {
    parsed = JSON.parse(geminiResponse.text);
  } catch {
    // 재시도 1회
    // 그래도 실패하면 ANALYSIS_FAILED 반환
  }
} catch (err) {
  if (err.name === "AbortError") {
    return NextResponse.json({ error: "ANALYSIS_TIMEOUT" }, { status: 504 });
  }
  throw err;
}
```

---

## 9. 환경 변수 구성

```env
# ─── 클라이언트 공개 (NEXT_PUBLIC_ 접두사) ───
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=            # 선택: gemini.js가 GEMINI_API_KEY 없을 때 폴백 (노출 주의)
NEXT_PUBLIC_PORTONE_STORE_ID=
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=

# ─── 서버 전용 ───
GEMINI_API_KEY=                        # 권장: Gemini 키 (서버만)
PORTONE_API_SECRET=                    # 결제 검증 (/api/payment/verify)
```

> **`gemini.js`**: `process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY` — 프로덕션에서는 서버 전용 키만 쓰는 것을 권장.

---

## 10. 파일별 구현 순서

```
순서  파일                                  의존성              커밋 단위
─────────────────────────────────────────────────────────────────────────
 1   package.json (next, tailwind 등)       없음               ┐
 2   tailwind.config.js                     없음               │ 커밋 1
 3   src/app/layout.js                      없음               │ "프로젝트 초기화 및
 4   src/app/globals.css                    없음               ┘  Next.js 설정"
                                                                
 5   src/lib/supabase.js                    .env               ┐ 커밋 2
 6   DB 스키마 SQL (Supabase 콘솔)           없음               ┘ "Supabase 연동 및
                                                                   DB 스키마 설정"

 7   src/components/GlassCard.jsx           globals.css        ┐
 8   src/components/Header.jsx              GlassCard          │
 9   src/constants/mbti-data.js             없음               │ 커밋 3
10   src/constants/loading-steps.js         없음               │ "글래스모피즘 디자인
11   src/lib/device-id.js                   없음               │  시스템 및 기반
12   src/lib/image-utils.js                 없음               ┘  유틸리티 구현"

13   src/components/UploadCard.jsx          GlassCard          ┐
14   src/components/MemoCard.jsx            GlassCard          │ 커밋 4
15   src/components/AnalyzeButton.jsx       없음               │ "메인 화면 UI
16   src/components/HeroSection.jsx         없음               ┘  컴포넌트 구현"

17   src/lib/gemini.js                      mbti_skills.md     ┐ 커밋 5
18   src/app/api/analyze/route.js           gemini, supabase   ┘ "Gemini AI 분석
                                                                   API 구현"

19   src/lib/analysis-count.js, analysis-tier.js  supabase    ┐
20   src/lib/portone.js                     없음               │ 커밋 6
21   src/hooks/usePayment.js                portone            │ "무료 상한·
22   src/components/PaymentModal.jsx        GlassCard          │  포트원 결제 연동"
23   src/app/api/payment/verify/route.js    supabase           ┘

24   src/hooks/useAnalysis.js               모든 lib/hooks     ┐
25   src/components/LoadingScreen.jsx       없음               │ 커밋 7
26   src/components/ResultScreen.jsx        mbti-data          │ "결과 화면 및
27   src/app/page.js                        모든 컴포넌트       ┘  전체 플로우 통합"
```

---

## 11. Supabase RLS·스키마 (실제 `supabase-schema.sql`)

비로그인 + anon 키 사용을 위해 **테이블별 단일 정책**으로 전 권한을 연다. 재실행 시 중복을 막기 위해 **`DROP POLICY IF EXISTS` 후 `CREATE POLICY`**.

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_all" ON profiles;
CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analyses_all" ON analyses;
CREATE POLICY "analyses_all" ON analyses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_all" ON payments;
CREATE POLICY "payments_all" ON payments FOR ALL USING (true) WITH CHECK (true);
```

- **`analyses.analysis_mode`**: `simple` | `deep`
- **RPC `increment_analysis_count(uuid)`**: `SECURITY DEFINER`, `GRANT EXECUTE` to `anon` (횟수 +1)

> 향후 인증 도입 시 `auth.uid()` 기반으로 정책을 좁힐 수 있음.

---

## 12. 성능 최적화 설계

| 항목 | 전략 | 구현 위치 |
|------|------|----------|
| 이미지 리사이즈 | 클라이언트에서 max 1024px 리사이즈 후 JPEG 80% 압축 | `image-utils.js` |
| 분석 기록 | 매 요청 `analyses` insert (결과 공유용 GET API는 P2) | `saveAnalysis` |
| 로딩 UX | AI 응답 대기 중 단계별 프로그레스로 체감 시간 단축 | `LoadingScreen` |
| 컴포넌트 분리 | 메인 페이지를 8개 컴포넌트로 분리하여 번들 최적화 | 전체 |
| Base64 메모리 관리 | 분석 완료 후 즉시 `null` 할당하여 GC 유도 | `useAnalysis` |
| 폰트 최적화 | Pretendard CDN (variable) + `font-display: swap` | `layout.js` |

---

## 13. 테스트 시나리오

### 13.1 핵심 플로우 테스트

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| T-01 | 간단 탭·이미지 1장 → 분석 (1회차) | 무료, `analysis_count` 1 |
| T-02 | 간단 탭·3장까지 반복 | 한도 내 무료 |
| T-03 | 심층 탭·이미지+메모(20자+) → 분석 | 결제 모달 → 결제 후 분석 |
| T-04 | 간단 탭·6회차 (이미 5회 사용) | 결제 모달, 결제 후 분석 |
| T-05 | 결제 취소 | 메인 복귀, count 불변 |
| T-06 | 포트원 금액 불일치 | 검증 API에서 verified: false 또는 실패 |
| T-07 | Gemini 타임아웃 | `ANALYSIS_TIMEOUT` / 504 안내 |

### 13.2 엣지 케이스

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| E-01 | 5MB 이상 이미지 업로드 | 리사이즈 후 1024px로 축소, 정상 처리 |
| E-02 | 동일 paymentId로 2번 분석 요청 | 중복 결제 차단 |
| E-03 | 시크릿 모드에서 접속 | 새 deviceId, 간단 모드 무료 5회부터 |
| E-04 | Gemini가 마크다운 JSON 혼합 | `stripMarkdownJsonFence` + 정규식 폴백 |
| E-05 | 네트워크 끊김 중 분석 요청 | "네트워크 오류" 메시지 |

---

## 14. Git 커밋 규칙 (재확인)

모든 파일 구현 단위 완료 시 반드시 실행:

```bash
./git-auto.sh "한글 커밋 메시지"
```

**예정 커밋 목록**:
1. `"프로젝트 초기화 및 Next.js 설정"`
2. `"Supabase 연동 및 DB 스키마 설정"`
3. `"글래스모피즘 디자인 시스템 및 기반 유틸리티 구현"`
4. `"메인 화면 UI 컴포넌트 구현"`
5. `"Gemini AI 분석 API 구현"`
6. `"무료 상한·포트원 결제 연동"`
7. `"결과 화면 및 전체 플로우 통합"`
