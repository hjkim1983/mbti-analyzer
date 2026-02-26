# PDCA Plan: 카카오톡 MBTI 분석기 웹앱

> **Feature**: mbti-analyzer
> **Phase**: Plan
> **Created**: 2026-02-26
> **Status**: Draft

---

## 1. 프로젝트 개요

### 1.1 목적
카카오톡 대화 캡처, 프로필 사진, 행동/성격 텍스트를 Gemini AI 멀티모달로 통합 분석하여 MBTI를 추론하는 유료 웹 서비스.

### 1.2 핵심 가치
- **정확성**: `mbti_skills.md` 기반 LIWC 언어분석 + 멀티모달 이미지 분석
- **수익화**: 3회 무료 → 이후 포트원 결제 (건당 과금)
- **보안**: 이미지 Base64 변환 후 즉시 폐기, 서버 저장 금지

### 1.3 사용자 여정 (Critical Path)

```
[1] 데이터 입력 → [2] 무료 횟수 조회(Supabase) → [3] 분기 처리
                                                     ├─ Case A (≤3회): 즉시 AI 분석
                                                     └─ Case B (≥4회): 포트원 결제 → 성공 시 AI 분석
→ [4] Gemini AI 정밀 분석 → [5] 결과 DB 저장 → [6] 로딩 애니메이션 → [7] 결과 렌더링
```

---

## 2. 기술 스택

| 카테고리 | 기술 | 버전/비고 |
|---------|------|----------|
| **프레임워크** | Next.js (App Router) | 15.x |
| **스타일링** | Tailwind CSS | 4.x |
| **DB/Auth** | Supabase | JS Client v2 |
| **AI 분석** | Google Gemini API | gemini-2.0-flash (멀티모달) |
| **결제** | 포트원 (PortOne) V2 | @portone/browser-sdk |
| **배포** | Vercel | - |

---

## 3. 기능 명세

### 3.1 Phase 1: 프로젝트 초기화 및 기반 구축

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|---------|
| F-001 | Next.js 프로젝트 생성 | App Router, Tailwind CSS, src/ 디렉토리 구조 | P0 |
| F-002 | Supabase 클라이언트 설정 | 환경변수 기반 싱글톤 클라이언트 | P0 |
| F-003 | DB 스키마 설계 및 마이그레이션 | profiles, analyses 테이블 | P0 |
| F-004 | 글래스모피즘 디자인 시스템 | 컴포넌트별 통일된 glass 스타일 | P0 |

### 3.2 Phase 2: 핵심 분석 기능

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|---------|
| F-101 | 이미지 업로드 & Base64 변환 | 최대 5장, 변환 후 원본 즉시 폐기 | P0 |
| F-102 | 분석 대상 이름 입력 | targetName으로 특정 인물 말풍선 식별 | P0 |
| F-103 | 행동/성격 메모 입력 | 태그 선택 + 자유 텍스트 (300자 제한) | P0 |
| F-104 | Gemini AI 멀티모달 분석 | 이미지+텍스트 통합 분석, mbti_skills.md 기준 | P0 |
| F-105 | 분석 결과 렌더링 | MBTI 유형, 확신도, 지표별 근거 표시 | P0 |
| F-106 | 로딩 애니메이션 | loadingSteps 단계별 프로그레스 표시 | P1 |

### 3.3 Phase 3: 결제 및 수익화

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|---------|
| F-201 | 무료 횟수 조회 | Supabase에서 디바이스/유저별 누적 분석 횟수 조회 | P0 |
| F-202 | 3회 무료 / 4회부터 유료 분기 로직 | 횟수 ≤ 3: 무료 진행, ≥ 4: 결제창 실행 | P0 |
| F-203 | 포트원 결제 연동 | V2 SDK, 결제 요청 → 서버 검증 → 분석 진행 | P0 |
| F-204 | 결제 서버 검증 API | `/api/payment/verify` — 포트원 API로 결제 상태 확인 | P0 |
| F-205 | 분석 횟수 카운트 업데이트 | 분석 완료 시 DB에 횟수 +1 기록 | P0 |

### 3.4 Phase 4: 확장 및 부가 기능

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|---------|
| F-301 | 결과 공유 기능 | URL 기반 결과 공유 | P2 |
| F-302 | 분석 히스토리 | 이전 분석 결과 조회 | P2 |
| F-303 | 사주 기능 확장 준비 | birth_date, birth_time 컬럼 사전 포함 | P1 |

---

## 4. DB 스키마 설계

### 4.1 `profiles` 테이블

```sql
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,          -- 비로그인 사용자 식별 (fingerprint)
  nickname TEXT,                     -- 선택 입력
  analysis_count INTEGER DEFAULT 0,  -- 누적 분석 횟수 (3회 무료 기준)
  birth_date DATE,                   -- 사주 확장용 (미래)
  birth_time TIME,                   -- 사주 확장용 (미래)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_device_id ON profiles(device_id);
```

### 4.2 `analyses` 테이블

```sql
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_name TEXT NOT NULL,           -- 분석 대상 이름
  mbti_type VARCHAR(4) NOT NULL,       -- 예: "INFP"
  confidence INTEGER NOT NULL,         -- 확신도 (0~100)
  confidence_level VARCHAR(10),        -- HIGH / MEDIUM / LOW
  analysis_detail JSONB NOT NULL,      -- 지표별 상세 분석 결과
  memo TEXT,                           -- 사용자 입력 메모
  image_count INTEGER DEFAULT 0,       -- 업로드 이미지 수 (이미지 자체는 저장 안 함)
  is_paid BOOLEAN DEFAULT false,       -- 유료 분석 여부
  payment_id TEXT,                     -- 포트원 결제 ID (유료인 경우)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analyses_profile_id ON analyses(profile_id);
```

### 4.3 `payments` 테이블

```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  portone_payment_id TEXT NOT NULL UNIQUE, -- 포트원 결제 고유 ID
  amount INTEGER NOT NULL,                 -- 결제 금액 (원)
  status VARCHAR(20) NOT NULL,             -- paid / failed / cancelled
  analysis_id UUID REFERENCES analyses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. 디렉토리 구조

```
src/
├── app/
│   ├── layout.js              # 루트 레이아웃 (Pretendard 폰트, 메타데이터)
│   ├── page.js                # 메인 페이지 (분석 폼)
│   ├── result/[id]/page.js    # 결과 페이지 (공유용)
│   ├── api/
│   │   ├── analyze/route.js   # Gemini AI 분석 API
│   │   └── payment/
│   │       └── verify/route.js # 포트원 결제 검증 API
│   └── globals.css            # 글로벌 스타일 + 글래스모피즘
├── components/
│   ├── Header.jsx             # 헤더 (로고, BETA 뱃지)
│   ├── HeroSection.jsx        # 히어로 영역
│   ├── UploadCard.jsx         # 이미지 업로드 카드
│   ├── MemoCard.jsx           # 추가 정보 입력 카드
│   ├── AnalyzeButton.jsx      # 분석 요청 CTA (무료/유료 분기 포함)
│   ├── LoadingScreen.jsx      # 로딩 애니메이션
│   ├── ResultScreen.jsx       # 분석 결과 렌더링
│   ├── PaymentModal.jsx       # 결제 안내 모달
│   └── GlassCard.jsx          # 글래스모피즘 공통 카드 컴포넌트
├── lib/
│   ├── supabase.js            # Supabase 클라이언트 싱글톤
│   ├── gemini.js              # Gemini API 래퍼 (프롬프트 빌더 포함)
│   ├── portone.js             # 포트원 SDK 래퍼
│   ├── device-id.js           # 디바이스 식별 유틸 (fingerprint)
│   └── analysis-count.js      # 분석 횟수 조회/업데이트 로직
├── hooks/
│   ├── useAnalysis.js         # 분석 플로우 관리 커스텀 훅
│   └── usePayment.js          # 결제 플로우 관리 커스텀 훅
└── constants/
    ├── mbti-data.js           # MBTI 16유형 데이터
    └── loading-steps.js       # 로딩 단계 메시지
```

---

## 6. 3회 무료 / 결제 로직 상세

### 6.1 흐름도

```
사용자가 "분석 요청" 클릭
        │
        ▼
  디바이스 ID 확인 (localStorage + fingerprint)
        │
        ▼
  Supabase에서 analysis_count 조회
        │
        ├─ count ≤ 3 ─────────────────────────────┐
        │  (무료)                                   │
        │  → 남은 무료 횟수 표시                      │
        │  → 즉시 AI 분석 진행 ─────────────────────┤
        │                                           │
        └─ count ≥ 4 ──────┐                       │
           (유료)           │                       │
           ▼               │                       │
     결제 안내 모달 표시      │                       │
     (금액: ₩1,900)        │                       │
           │               │                       │
           ├─ 결제 진행 클릭  │                       │
           │  ▼             │                       │
           │  포트원 결제창    │                       │
           │  │             │                       │
           │  ├─ 성공(paid)  │                       │
           │  │  ▼          │                       │
           │  │  서버 검증    │                       │
           │  │  (/api/payment/verify)              │
           │  │  │          │                       │
           │  │  ├─ 검증 성공 ─────────────────────→ AI 분석 진행
           │  │  └─ 검증 실패 → 에러 표시             │
           │  │                                     │
           │  └─ 실패/취소 → 에러 표시                │
           │                                        │
           └─ 취소 → 메인으로 복귀                     │
                                                    ▼
                                            분석 완료 후
                                            analysis_count + 1
                                            결과 DB 저장
                                            결과 화면 렌더링
```

### 6.2 가격 정책

| 항목 | 값 |
|------|-----|
| 무료 분석 횟수 | 3회 |
| 유료 분석 단가 | ₩1,900 |
| 결제 수단 | 카드, 카카오페이, 네이버페이 |
| 결제 검증 | 서버 사이드 (포트원 V2 API) |

### 6.3 디바이스 식별 전략

비로그인 서비스이므로 디바이스 기반 식별 사용:
1. **1차**: `localStorage`에 UUID 저장
2. **2차**: 브라우저 fingerprint (canvas + userAgent 조합) 해시
3. **결합**: 두 값을 조합하여 `device_id` 생성
4. **제한 사항**: 시크릿 모드/브라우저 변경 시 리셋 가능 (허용 범위)

---

## 7. Gemini AI 분석 설계

### 7.1 프롬프트 구조

```
[System Prompt]
  └─ mbti_skills.md 전문 (LIWC 기반 분석 가이드라인)

[User Prompt]
  ├─ 분석 대상: {targetName}
  ├─ [A] 카카오톡 대화 이미지: {base64 이미지 1~5장}
  ├─ [B] 프로필 이미지: {base64 이미지} (있는 경우)
  └─ [C] 행동/성격 텍스트: {memo} (있는 경우)

[Output Format]
  └─ 구조화된 JSON 응답 (MBTI 유형, 확신도, 지표별 분석)
```

### 7.2 가중치 적용

| 입력 소스 | 기본 가중치 |
|----------|-----------|
| [A] 카카오톡 대화 | 50% |
| [B] 프로필 사진 | 15% |
| [C] 행동/성격 텍스트 | 35% |

### 7.3 AI 응답 JSON 스키마

```json
{
  "mbtiType": "INFP",
  "confidence": 72,
  "confidenceLevel": "MEDIUM",
  "indicators": {
    "EI": { "result": "I", "score": 78, "confidence": 80, "evidence": [...] },
    "SN": { "result": "N", "score": 65, "confidence": 75, "evidence": [...] },
    "TF": { "result": "F", "score": 58, "confidence": 65, "evidence": [...] },
    "JP": { "result": "P", "score": 70, "confidence": 70, "evidence": [...] }
  },
  "highlights": {
    "chatPatterns": ["감정어 빈도 높음", "ㅠㅠ 자주 사용"],
    "profileAnalysis": "감성적 풍경 사진, 따뜻한 색감",
    "behaviorAnalysis": "공감 능력 높음, 즉흥적 성향"
  },
  "conflicts": [],
  "disclaimer": "이 분석은 확률적 추론이며..."
}
```

---

## 8. 디자인 시스템: 글래스모피즘

### 8.1 핵심 스타일 토큰

```css
/* 글래스 카드 기본 */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}

/* 배경 그라데이션 */
body {
  background: linear-gradient(135deg, #FFF9C4 0%, #E8EAF6 50%, #F3E5F5 100%);
  min-height: 100vh;
}
```

### 8.2 색상 팔레트

| 용도 | 색상 | 코드 |
|------|------|------|
| 프라이머리 (카카오 옐로) | 🟡 | #FEE500 |
| 프라이머리 다크 | 🟤 | #FFD000 |
| 보라 (프로필 분석) | 🟣 | #A29BFE |
| 성공 | 🟢 | #10B981 |
| 에러 | 🔴 | #EF4444 |
| 배경 그라데이션 시작 | | #FFF9C4 |
| 배경 그라데이션 끝 | | #F3E5F5 |

---

## 9. 보안 요구사항

| 항목 | 정책 |
|------|------|
| 이미지 처리 | Base64 변환 → AI 분석 → 즉시 폐기 (메모리에서만 처리) |
| 이미지 저장 | **절대 금지** — 서버/DB/스토리지 어디에도 저장하지 않음 |
| API 키 보호 | Gemini API 키는 서버 사이드(`/api/analyze`)에서만 사용 |
| 결제 검증 | 서버 사이드 필수 — 클라이언트 결과만으로 분석 진행 금지 |
| 환경 변수 | `.env` 파일은 `.gitignore`에 포함, 절대 커밋 금지 |

---

## 10. 개발 일정 (예상)

| Phase | 기간 | 작업 내용 |
|-------|------|----------|
| **Phase 1** | Day 1 | Next.js 프로젝트 초기화, Supabase 연동, DB 스키마 생성 |
| **Phase 2** | Day 1~2 | UI 컴포넌트 구현 (글래스모피즘), 이미지 업로드 기능 |
| **Phase 3** | Day 2~3 | Gemini AI 분석 API 구현, 프롬프트 엔지니어링 |
| **Phase 4** | Day 3 | 3회 무료/결제 로직 구현, 포트원 연동 |
| **Phase 5** | Day 4 | 결과 화면, 로딩 애니메이션, 통합 테스트 |
| **Phase 6** | Day 4~5 | 버그 수정, 최적화, Vercel 배포 |

---

## 11. Git 자동 커밋 규칙

모든 작업 단위 완료 후 반드시 `./git-auto.sh`를 실행합니다.

### 11.1 커밋 메시지 규칙

- **언어**: 반드시 한글
- **형식**: `{작업 내용} {상세}`
- **예시**:
  - `"프로젝트 초기화 및 Next.js 설정"`
  - `"Supabase 클라이언트 및 DB 스키마 설정"`
  - `"이미지 업로드 컴포넌트 구현"`
  - `"Gemini AI 분석 API 연동"`
  - `"3회 무료 분석 및 결제 로직 구현"`
  - `"포트원 결제 연동 및 서버 검증 API"`
  - `"결과 화면 UI 및 로딩 애니메이션"`
  - `"버그 수정 및 최적화"`

### 11.2 자동 커밋 실행 방법

```bash
./git-auto.sh "한글 커밋 메시지"
```

---

## 12. 구현 우선순위 (실행 순서)

```
1. [F-001] Next.js 프로젝트 생성 + Tailwind 설정
   → ./git-auto.sh "프로젝트 초기화 및 Next.js 설정"

2. [F-002] Supabase 클라이언트 설정
3. [F-003] DB 스키마 생성 (profiles, analyses, payments)
   → ./git-auto.sh "Supabase 연동 및 DB 스키마 설정"

4. [F-004] 글래스모피즘 디자인 시스템 + GlassCard 컴포넌트
5. [F-101] 이미지 업로드 + Base64 변환
6. [F-102] 분석 대상 이름 입력
7. [F-103] 행동/성격 메모 입력
   → ./git-auto.sh "메인 화면 UI 컴포넌트 구현"

8. [F-104] Gemini AI 멀티모달 분석 API (/api/analyze)
   → ./git-auto.sh "Gemini AI 분석 API 구현"

9. [F-201] 무료 횟수 조회 (디바이스 ID + Supabase)
10. [F-202] 3회 무료 / 4회부터 유료 분기 로직
11. [F-203] 포트원 결제 연동 (클라이언트)
12. [F-204] 결제 서버 검증 API (/api/payment/verify)
13. [F-205] 분석 횟수 카운트 업데이트
    → ./git-auto.sh "3회 무료 분석 및 포트원 결제 연동"

14. [F-105] 분석 결과 렌더링
15. [F-106] 로딩 애니메이션
    → ./git-auto.sh "결과 화면 및 로딩 애니메이션 구현"

16. [F-303] 사주 확장용 컬럼 확인
17. 통합 테스트 및 배포
    → ./git-auto.sh "통합 테스트 및 배포 준비 완료"
```

---

## 13. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|-------|----------|
| Gemini API 응답 지연 | 높음 | 타임아웃 15초 설정, 로딩 UX로 체감 시간 단축 |
| 결제 검증 실패 | 높음 | 재시도 로직 + 수동 확인 가능한 로그 기록 |
| 디바이스 ID 우회 | 중간 | fingerprint 보강, 허용 범위로 수용 |
| 이미지 Base64 크기 | 중간 | 클라이언트에서 리사이즈 후 변환 (max 1024px) |
| 한국어 특수 패턴 인식 오류 | 낮음 | mbti_skills.md에 상세 가이드라인 포함 |

---

## 14. 성공 기준

- [ ] 카카오톡 캡처 업로드 → AI 분석 → 결과 표시 전체 플로우 동작
- [ ] 3회 무료 분석 후 4회차부터 결제창 정상 표시
- [ ] 포트원 결제 성공 시에만 분석 진행 (서버 검증 필수)
- [ ] 분석 결과에 MBTI 유형, 확신도, 지표별 근거 포함
- [ ] 이미지가 서버/DB에 저장되지 않음 확인
- [ ] 모든 커밋이 한글 메시지로 기록됨
- [ ] 글래스모피즘 디자인 일관성 유지
- [ ] Vercel 배포 후 정상 동작 확인
