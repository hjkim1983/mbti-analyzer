# GitHub 업로드 가이드

## 1단계: GitHub에서 새 저장소 생성

1. [GitHub](https://github.com) 로그인
2. 우측 상단 **+** → **New repository** 클릭
3. 다음 설정:
   - **Repository name**: `mbti-analyzer` (또는 원하는 이름)
   - **Description**: (선택) MBTI 분석 웹앱
   - **Public** 선택
   - ⚠️ **Add a README file** 체크 해제 (이미 로컬에 있음)
   - **Create repository** 클릭

## 2단계: 로컬 저장소와 연결 후 푸시

GitHub 저장소 생성 후 표시되는 URL을 사용합니다.

```powershell
cd c:\Users\User\00webapp_test\mbti-analyzer

# GitHub 저장소 URL로 교체하세요 (예: https://github.com/사용자명/mbti-analyzer.git)
git remote add origin https://github.com/사용자명/mbti-analyzer.git

# main 브랜치로 푸시 (GitHub 기본 브랜치)
git branch -M main
git push -u origin main
```

## 3단계: 이후 업데이트 방법

```powershell
cd c:\Users\User\00webapp_test\mbti-analyzer
git add .
git commit -m "커밋 메시지"
git push
```

또는 `git-auto.sh` 스크립트 사용:
```bash
./git-auto.sh "커밋 메시지"
git push
```
