# MBTI Analyzer

카카오톡 대화 캡처와 프로필 사진을 분석하여 MBTI를 추론하는 웹 애플리케이션입니다.

## 기술 스택

- Next.js (App Router)
- Tailwind CSS
- Supabase
- Gemini API

## 주요 기능

- 카카오톡 대화 스크린샷 업로드 및 분석
- 프로필 사진 기반 시각적 분석
- 행동/성격 텍스트 입력
- 무료 횟수 제한 및 포트원 결제 연동

## 시작하기

1. 의존성 설치: `npm install`
2. `.env.example`을 참고하여 `.env` 파일 생성
3. 개발 서버 실행: `npm run dev`

## 개발 중 `Hydration failed` (메타 경계 / 확장 프로그램)

콘솔에 `__next_metadata_boundary__`, `__endic_crx__`, `data-wxt-integrated`가 보이면 브라우저 확장이 `<head>` 근처 DOM을 바꾼 경우가 많습니다. 이 프로젝트는 `next.config.mjs`의 `htmlLimitedBots`와 루트 `layout`의 수동 `<head>`로 완화합니다. 그래도 뜨면 사전·WXT 계열 확장을 끄거나 시크릿 창에서 `localhost`를 여세요.

## 라이선스

MIT
