# MBTI Analyzer 리팩토링 가이드

> **브랜치**: `rev.3` 기준 작업  
> **방식**: 하나의 브랜치에서 4단계 순차 진행, 단계별 커밋  
> **원칙**: 기존 흐름(UploadCard → MemoCard → AnalyzeButton → /api/analyze → ResultScreen) 유지하면서 엔진과 표현만 교체

---

## 수정 대상 파일 맵

| 단계 | 수정 파일 | 내용 |
|------|----------|------|
| 1단계 | `kakao-mbti-scanner.jsx` 또는 해당 페이지 컴포넌트 | startAnalysis() 랜덤 제거, API 연결 |
| 1단계 | `src/app/api/analyze/route.js` (또는 해당 API 라우트) | Gemini 호출 확인/수정 |
| 2단계 | MemoCard 컴포넌트 | 행동형 태그, 관계/맥락 선택 추가 |
| 3단계 | API 라우트 + `mbti_skills.md` | 프롬프트 개편, 응답 스키마 변경 |
| 4단계 | ResultScreen / MbtiCard 컴포넌트 | 결과 화면 순서 변경 |

---

## 1단계: 가짜 결과 제거 + 실제 API 연결

### 목표
- `startAnalysis()` 안의 `Math.random()` 랜덤 결과 코드를 제거
- 실제 `/api/analyze` API 호출로 교체
- 응답 JSON을 `setResult()`에 연결
- 실패 시 에러 화면 표시

### 커밋 메시지
```
step1: 랜덤 결과 제거, 실제 API 연결
```

### Cursor 프롬프트 (복붙용)

```
## 작업 지시: 1단계 - 랜덤 결과 제거 + 실제 API 연결

### 현재 상황
kakao-mbti-scanner.jsx의 startAnalysis() 함수에서 분석 완료 후
setResult(MBTI_DATA[Math.floor(Math.random() * MBTI_DATA.length)])
로 랜덤 결과를 넣고 있음. 즉 현재는 데모 모드임.

### 해야 할 일

1. startAnalysis() 함수에서 랜덤 결과 코드(MBTI_DATA에서 Math.random으로 뽑는 부분)를 완전히 제거해줘.

2. 대신 아래 흐름으로 교체해줘:
   - 사용자가 업로드한 이미지(카카오톡 스크린샷, 프로필 사진)와 메모 텍스트, 선택한 태그를 수집
   - fetch("/api/analyze")로 POST 요청 전송
   - body에 images(base64), memo, tags를 JSON으로 담아서 보내기
   - 로딩 상태는 기존 로딩 UI 그대로 유지

3. API 응답 처리:
   - 성공 시: const data = await response.json(); setResult(data);
   - 실패 시: setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.") 같은 에러 상태 추가
   - 에러 상태를 위한 state 변수 추가: const [error, setError] = useState(null);

4. 에러 화면 컴포넌트 추가:
   - 결과 화면 영역에 error가 있으면 에러 메시지와 "다시 시도" 버튼 표시
   - 다시 시도 버튼 클릭 시 setError(null)로 초기화

5. /api/analyze 라우트 파일도 확인해줘:
   - Gemini API 호출이 정상적으로 되어 있는지
   - 요청에서 images, memo, tags를 받아서 프롬프트에 포함하는지
   - 응답 JSON 형식이 프론트에서 받을 수 있는 구조인지

### 주의사항
- MBTI_DATA 배열과 관련 import가 있으면 제거하지 말고 남겨둬 (나중에 폴백용으로 쓸 수도 있음)
- 기존 로딩 애니메이션, UI 흐름은 건드리지 마
- 이미지 → base64 변환 로직이 이미 있으면 그대로 활용, 없으면 추가
- 환경변수(GEMINI_API_KEY 등)가 .env에 설정되어 있다고 가정하고 진행
```

---

## 2단계: 입력 품질 개선

### 목표
- Quick Tags를 "해석형"에서 "행동형"으로 교체
- 관계 유형 선택 UI 추가
- 대화 맥락 선택 UI 추가
- 이 정보들을 API 요청에 포함

### 커밋 메시지
```
step2: 입력폼 개편 - 행동형 태그, 관계/맥락 선택
```

### Cursor 프롬프트 (복붙용)

```
## 작업 지시: 2단계 - 입력 구조 개편

### 현재 상황
MemoCard(또는 메모 입력 영역)에 Quick Tags가 있는데,
현재 태그가 "말이 많아요", "감정 표현 잘 함", "논리적으로 말함", "계획적인 편"
같은 해석형 태그임. 이러면 사용자가 MBTI 방향으로 편향된 힌트를 넣게 됨.

### 해야 할 일

#### 1. Quick Tags를 행동형 태그로 교체
기존 태그를 모두 제거하고 아래 태그로 교체해줘:

```javascript
const BEHAVIOR_TAGS = [
  "먼저 연락을 자주 함",
  "한 번에 길게 답함",
  "답장이 짧고 빠름",
  "위로보다 해결책을 말함",
  "약속 시간을 구체적으로 정함",
  "약속이 자주 바뀜",
  "이모티콘/ㅋㅋ를 많이 씀",
  "감정 표현이 적음",
  "질문을 자주 던짐",
  "말을 돌려서 함"
];
```

#### 2. 관계 유형 선택 UI 추가
MemoCard 위에 또는 안에 관계 선택 UI를 넣어줘:

```javascript
const RELATIONSHIP_OPTIONS = [
  { value: "friend", label: "친구" },
  { value: "some", label: "썸" },
  { value: "lover", label: "연인" },
  { value: "coworker", label: "직장동료" },
  { value: "family", label: "가족" },
  { value: "other", label: "기타" }
];
```

- 가로로 나열된 선택 버튼(칩) 형태
- 하나만 선택 가능
- 선택하면 배경색 변경으로 선택 표시
- state: const [relationship, setRelationship] = useState(null);

#### 3. 대화 맥락 선택 UI 추가
관계 선택 바로 아래에 대화 맥락 선택:

```javascript
const CONTEXT_OPTIONS = [
  { value: "daily", label: "일상" },
  { value: "work", label: "업무" },
  { value: "conflict", label: "갈등" },
  { value: "comfort", label: "위로" },
  { value: "plan", label: "약속" },
  { value: "casual", label: "잡담" }
];
```

- 같은 칩 스타일
- 하나만 선택 가능
- state: const [chatContext, setChatContext] = useState(null);

#### 4. API 요청에 포함
startAnalysis()에서 /api/analyze 호출 시 body에 추가:
```javascript
body: JSON.stringify({
  images,
  memo,
  tags: selectedTags,        // 행동형 태그
  relationship,              // 새로 추가
  chatContext,               // 새로 추가
})
```

#### 5. API 라우트에서 프롬프트에 반영
/api/analyze에서 받은 relationship과 chatContext를 Gemini 프롬프트에 포함:
- "이 대화는 {relationship} 관계에서의 {chatContext} 맥락 대화입니다."
- "업무 맥락에서는 평소 F도 T처럼 보일 수 있으므로 맥락을 고려하세요."

### 디자인 가이드
- 기존 앱의 색상/스타일과 일관되게
- 관계, 맥락 섹션에 작은 제목 추가: "관계", "대화 분위기"
- 태그는 여러 개 선택 가능(기존과 동일), 관계/맥락은 하나만 선택
- 모바일에서도 잘 보이도록 flex-wrap 적용
```

---

## 3단계: 프롬프트/스키마 개편

### 목표
- 단일 MBTI 확정 → 후보 2~3개 제시로 변경
- 축별 찬성/반대 근거 동시 출력
- candidateTypes, boundaryNote, analysisLimitations 추가
- 맥락 기반 추론 순서로 재설계

### 커밋 메시지
```
step3: 프롬프트 개편 - 후보 3개, 근거 기반 추론
```

### Cursor 프롬프트 (복붙용)

```
## 작업 지시: 3단계 - API 프롬프트와 응답 스키마 개편

### 현재 상황
/api/analyze에서 Gemini에게 "이 사람 MBTI 분석해줘" 식으로 요청하고,
단일 MBTI 유형 + 확신도를 바로 출력하게 하고 있음.
mbti_skills.md에 이미 좋은 판단 기준이 있지만, 출력 목표가 "하나를 맞히기"에 치중됨.

### 해야 할 일

#### 1. Gemini 프롬프트 재설계
기존 시스템 프롬프트를 아래 분석 순서로 바꿔줘:

```
당신은 카카오톡 대화를 분석하여 MBTI를 추론하는 심리언어학 분석 전문가입니다.

## 분석 순서 (반드시 이 순서를 따를 것)
1. 대상 인물의 말풍선과 입력 데이터를 식별
2. 관찰 가능한 언어/행동 신호를 추출 (최소 5개)
3. 제공된 맥락 정보(관계, 대화 분위기)를 판별하고 분석에 반영
4. E/I, S/N, T/F, J/P 4축 각각에 대해 해석
5. 가장 유력한 MBTI 후보 3개를 제시
6. 판단이 애매한 축과 오판 가능성을 명시

## 핵심 규칙
- 단일 MBTI를 확정하지 말 것
- 항상 후보 2~3개를 제시할 것
- 각 축마다 찬성 근거와 반대 근거를 함께 적을 것
- 프로필 이미지는 보조 신호로만 사용할 것
- 사용자 메모가 인상 평가("차가워 보임" 등)이면 가중치를 50%로 낮출 것
- 분석 한계를 반드시 명시할 것
- 업무 맥락 대화에서는 T/F, J/P 판단에 특히 주의할 것

## 맥락 정보
- 관계: {relationship}
- 대화 분위기: {chatContext}
- 사용자 메모: {memo}
- 행동 태그: {tags}
```

#### 2. 응답 JSON 스키마 변경
기존 응답 구조에서 아래로 변경:

```json
{
  "observedFeatures": [
    "감정보다 정리형 반응이 자주 보임",
    "이모티콘 사용이 거의 없음",
    "약속을 구체적으로 제안함",
    "먼저 연락하는 빈도가 낮음",
    "한 번에 길고 완결된 메시지를 보냄"
  ],
  "axisAnalysis": {
    "EI": {
      "result": "I",
      "confidence": 78,
      "forEvidence": ["답장 위주, 먼저 연락 드묾", "1인칭 단수 표현 多"],
      "againstEvidence": ["특정 주제에서는 길게 연속 메시지"]
    },
    "SN": {
      "result": "N",
      "confidence": 65,
      "forEvidence": ["추상적 표현 사용", "미래 시제 가정법 多"],
      "againstEvidence": ["구체적 약속 시간 제시"]
    },
    "TF": {
      "result": "T",
      "confidence": 60,
      "forEvidence": ["감정어 적음", "해결책 중심 반응"],
      "againstEvidence": ["친한 상대와 대화라 편하게 표현했을 가능성"]
    },
    "JP": {
      "result": "J",
      "confidence": 72,
      "forEvidence": ["약속 구체적 제안", "완결된 문장"],
      "againstEvidence": ["일부 열린 결말 표현"]
    }
  },
  "candidateTypes": [
    { "type": "INTJ", "rank": 1, "reason": "I+N+T+J 모두 일치, T축만 약간 불확실" },
    { "type": "INFJ", "rank": 2, "reason": "T/F 축이 60%로 낮아 F 가능성 존재" },
    { "type": "INTP", "rank": 3, "reason": "J/P도 완전히 확실하지 않음" }
  ],
  "boundaryNote": "T/F 축이 60%로 가장 불확실합니다. 친한 관계의 일상 대화라 평소보다 감정 표현이 적을 수 있습니다.",
  "analysisLimitations": "메시지 수가 15개로 중간 수준이며, 한 명의 대화 상대와의 대화만으로 판단했습니다. 다른 상대와의 대화를 추가하면 정확도가 높아집니다.",
  "communicationTips": [
    "이 사람에게는 감정보다 논리적 근거를 먼저 제시하는 것이 효과적입니다",
    "약속을 잡을 때 구체적인 옵션을 2-3개 제시하면 빠르게 결정합니다",
    "긴 이야기는 핵심 요약 → 상세 순서로 전달하세요"
  ],
  "profileImageNote": "풍경 사진, 차분한 색감 → I 보조 신호 (참고용)"
}
```

#### 3. Gemini 호출 시 JSON 모드 강제
응답을 반드시 위 스키마의 JSON으로만 받도록 설정:
- Gemini의 responseMimeType을 "application/json"으로 설정
- 또는 프롬프트 끝에 "위 JSON 스키마에 맞춰 응답하세요. JSON만 출력하세요." 추가

#### 4. mbti_skills.md 업데이트
기존 내용은 유지하되, Part 6(출력 템플릿)을 새 JSON 스키마에 맞게 수정.
candidateTypes, boundaryNote, analysisLimitations 섹션 추가.

### 주의사항
- 기존 mbti_skills.md의 점수 계산, 충돌 규칙, 가중치 체계는 그대로 유지
- 프롬프트에서 참조하는 방식만 변경
- 프론트엔드는 이 단계에서 건드리지 않음 (4단계에서 처리)
```

---

## 4단계: 결과 화면 근거 중심 개편

### 목표
- MBTI 카드 중심 → 관찰 특징 먼저
- 축별 근거 카드
- 후보 3개 비교
- 소통 팁 + 작은 MBTI 카드로 마무리

### 커밋 메시지
```
step4: 결과 화면 근거 중심 개편
```

### Cursor 프롬프트 (복붙용)

```
## 작업 지시: 4단계 - 결과 화면을 근거 중심으로 개편

### 현재 상황
결과 화면이 큰 MBTI 카드(예: "INFP") → 태그 → 프로필 분석 → 말투 특징 순서.
사용자가 MBTI 네 글자를 먼저 보고 "맞나?" 판단부터 해서 신뢰도가 떨어짐.

### 새 결과 화면 순서
3단계에서 변경한 API 응답 JSON 스키마(observedFeatures, axisAnalysis, candidateTypes, boundaryNote, analysisLimitations, communicationTips, profileImageNote)를 기반으로 결과 화면을 아래 순서로 재구성해줘:

#### 1. 관찰된 대화 특징 (맨 위)
- observedFeatures 배열을 카드 리스트로 표시
- 아이콘 + 텍스트 형태
- 제목: "대화에서 발견된 특징"
- 예: "💬 감정보다 정리형 반응이 자주 보였어요"

#### 2. 축별 해석 카드 (E/I, S/N, T/F, J/P)
- axisAnalysis 객체를 4개의 카드로 표시
- 각 카드 구성:
  - 축 이름과 결과 (예: "E / **I**")
  - 확신도 바 (confidence를 프로그레스 바로)
  - ✅ 찬성 근거 리스트 (forEvidence)
  - ⚠️ 반대 근거 리스트 (againstEvidence)
- 확신도가 65% 미만인 축은 "판단 애매" 배지 표시

#### 3. 후보 MBTI 3개 비교
- candidateTypes 배열을 가로 카드 3개로 표시
- 1순위는 크게, 2·3순위는 작게
- 각 카드에 rank, type, reason 표시
- 1순위 카드에만 강조 테두리

#### 4. 왜 헷갈리는지
- boundaryNote를 부드러운 톤의 설명 박스로 표시
- 배경색을 약간 다르게 (경고가 아닌 참고 느낌)
- 예: "💡 T/F 축이 60%로 가장 불확실합니다..."

#### 5. 이 사람과 대화할 때 팁
- communicationTips 배열을 넘버링 리스트로 표시
- 제목: "이 사람과 소통하는 팁"
- 실용적인 느낌으로

#### 6. 분석 한계
- analysisLimitations를 작은 글씨의 회색 박스로
- "이 분석은 제한된 데이터를 기반으로 한 추정입니다" 문구 포함

#### 7. 프로필 인상 (참고용)
- profileImageNote를 맨 아래에 작게
- "📸 참고: 프로필 사진 인상" 정도

#### 8. 작은 MBTI 카드 (맨 아래)
- 기존의 큰 MBTI 카드를 축소 버전으로 맨 아래에 배치
- 1순위 후보의 type을 표시
- 사이즈를 기존의 50% 정도로 줄이기
- 밑에 "가장 유력한 후보입니다" 텍스트

### 디자인 가이드
- 기존 앱의 색상 테마 유지
- 카드 사이에 적절한 간격
- 모바일 우선 레이아웃 (세로 스크롤)
- 축별 카드는 아코디언이 아닌 모두 펼친 상태
- 각 섹션 사이에 얇은 구분선 또는 여백
- 부드럽게 fade-in 애니메이션 적용하면 좋겠음

### 기존 컴포넌트 처리
- MbtiCard: 축소 버전으로 재활용
- IndicatorDetail: axisAnalysis 카드로 대체
- ChatPatterns: observedFeatures로 대체
- ProfileAnalysis: profileImageNote로 축소
- Disclaimer: analysisLimitations로 통합

### 데이터 연결
- 3단계에서 변경한 API 응답 JSON을 그대로 사용
- result 상태에서 각 필드를 구조분해 할당으로 가져오기:
```javascript
const {
  observedFeatures,
  axisAnalysis,
  candidateTypes,
  boundaryNote,
  analysisLimitations,
  communicationTips,
  profileImageNote
} = result;
```

### 주의사항
- API 응답이 아직 이전 형식일 수 있으므로 fallback 처리도 해줘
  (candidateTypes가 없으면 기존 mbtiType으로 표시)
- 에러 상태 처리는 1단계에서 이미 추가했으므로 그대로 유지
```

---

## 작업 순서 체크리스트

- [ ] `git checkout rev.3` (rev.3 브랜치로 이동)
- [ ] **1단계** 실행 → 테스트 → `git commit -m "step1: 랜덤 결과 제거, 실제 API 연결"`
- [ ] **2단계** 실행 → 테스트 → `git commit -m "step2: 입력폼 개편 - 행동형 태그, 관계/맥락 선택"`
- [ ] **3단계** 실행 → 테스트 → `git commit -m "step3: 프롬프트 개편 - 후보 3개, 근거 기반 추론"`
- [ ] **4단계** 실행 → 테스트 → `git commit -m "step4: 결과 화면 근거 중심 개편"`
- [ ] `git push origin rev.3`
- [ ] Vercel Preview URL에서 최종 테스트
- [ ] 만족하면 → `git checkout main && git merge rev.3 && git push` (라이브 반영)
- [ ] 또는 별도 URL → Vercel에서 새 프로젝트로 rev.3 브랜치 연결

---

## 각 단계별 테스트 체크포인트

### 1단계 테스트
- [ ] 이미지 업로드 후 분석 버튼 클릭 시 로딩 표시
- [ ] 로딩 후 실제 Gemini API 응답이 화면에 표시
- [ ] API 키 없거나 에러 시 에러 메시지 표시
- [ ] 다시 시도 버튼 동작

### 2단계 테스트
- [ ] 행동형 태그 10개 표시 및 다중 선택 동작
- [ ] 관계 선택 UI 표시 및 단일 선택 동작
- [ ] 대화 맥락 선택 UI 표시 및 단일 선택 동작
- [ ] 선택한 관계/맥락이 API 요청에 포함되는지 확인 (개발자도구 Network 탭)

### 3단계 테스트
- [ ] API 응답에 candidateTypes 배열(3개)이 포함
- [ ] axisAnalysis에 forEvidence, againstEvidence 포함
- [ ] boundaryNote, analysisLimitations 포함
- [ ] communicationTips 포함

### 4단계 테스트
- [ ] 결과 화면 순서: 특징 → 축별 → 후보 → 헷갈리는 점 → 팁 → 한계 → 프로필 → 작은 카드
- [ ] 축별 확신도 바 표시
- [ ] 후보 3개 카드 표시
- [ ] 모바일에서 레이아웃 깨지지 않는지
