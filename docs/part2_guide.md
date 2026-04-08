## 작업 지시: 2단계 - 입력 구조를 필수 선택형으로 개편

### 현재 상황 (구현 반영)

MemoCard·관계·**행동 관찰 문항 7개**·메모(선택) 구조로 동작합니다. 문항·라벨의 **원본은 코드**입니다.

| 구역 | 소스 파일 |
|------|-----------|
| 관계 옵션 | `src/constants/mbti-data.js` → `RELATIONSHIP_OPTIONS` |
| 행동 문항 7개 | `src/constants/behavior-questions.js` → `BEHAVIOR_QUESTIONS` |
| UI | `RelationshipSelect.jsx`, `BehaviorQuestions.jsx` |
| API 검증·프롬프트 요약 | `src/app/api/analyze/route.js`, `src/lib/format-behavior-answers.js` |

---

### 전체 흐름

- **기존(가이드 초안)**: 이미지 → 메모(선택) → 태그(선택) → 분석  
- **현재**: 이미지 업로드 → **관계(필수)** → **행동 문항 7개(필수)** → 메모(선택, 프리미엄) → 분석  

분석 버튼: 관계 선택 + **7문항** 모두 답해야 활성화 (`skip` 포함).

---

### 1. 관계 선택 UI (필수)

- 제목: "이 사람과의 관계" / 부제: "관계에 따라 분석 기준이 달라져요"  
- 칩 라디오, 미선택 시 행동 문항 비활성화  
- 값·라벨: `RELATIONSHIP_OPTIONS` 와 동일하게 유지

---

### 2. 행동 관찰 문항 7개 (필수)

- 제목: "이 사람은 평소에 어떤 편인가요?" / 부제: "느낌대로 골라주세요, 정답은 없어요"  
- 카드 리스트 + 🅰 / 🅱 / ⏭ 모르겠어요  
- 진행: `{answeredCount}/{BEHAVIOR_QUESTIONS.length} 답변 완료`  

**제거된 문항(구 10개 대비)**  
카톡 시간 패턴(q7), 즉시판단/여지(q8), 칭찬 스타일(q10)은 **제외**. 마무리 스타일은 **q7**로 유지.

문항 전문은 **`behavior-questions.js`**를 수정하면 UI·API·프롬프트 요약이 함께 맞춰집니다. `format-behavior-answers.js`의 `questionMap`은 Gemini용 **짧은 한 줄 라벨**이므로 문항 의미가 바뀌면 같이 고칩니다.

---

### 3. 메모 (선택)

- 프리미엄 탭에서만 사용. 문항 아래 `MemoCard`.  
- 제목·플레이스홀더는 컴포넌트 기준.

---

### 4. 분석 버튼 활성화

```text
이미지 1장 이상 + relationship !== null + 7문항 전부 응답 (A/B/skip)
```

비활성 안내: "관계 선택과 7개 문항에 모두 답해주세요"

---

### 5. API 요청 body (요지)

`deviceId`, `targetName`, `images`, `relationship`, `behaviorAnswers` (`q1`…`q7`), `memo`, `mode`, `paymentId` 등 — 실제 필드는 `useAnalysis` → `POST /api/analyze` 참고.

---

### 6. 프롬프트 반영

- `sanitizeBehaviorAnswers` → `formatBehaviorAnswers` → `callGemini` 사용자 메시지에 **관찰자 행동 문항 요약**으로 삽입.  
- 관계 라벨은 `getRelationshipLabel` + 프롬프트 맥락 문장.

---

### 디자인 가이드 (요약)

- 모바일 우선, 기존 글래스/포인트 컬러와 통일  
- 관계: 칩 flex-wrap, 선택 시 포인트 배경  
- 문항: 카드 `border-radius` ~12px, 선택 버튼 포인트 테두리  
- 분석 버튼: 비활성 시 회색 + 위 안내 문구  

---

### 주의사항

- `axis`, `weightA`, `weightB`는 UI에 표시하지 않음  
- 문항 개수를 바꾸면 `behavior-questions.js` + `format-behavior-answers.js` + API 검증 메시지를 일치시킬 것  
- Quick Tags 기반 입력은 본 구조로 대체됨  
