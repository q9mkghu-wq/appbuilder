# App Builder MVP

설명 한 줄 → **Firebase에 앱 전용 공간 생성** → AI 코드 생성(Firebase 연동 포함)
→ GitHub 레포 자동 생성/푸시 → Vercel 자동 배포까지 이어지는 파이프라인을
검증하기 위한 최소 기능 스캐폴딩입니다.

이 버전은 **단일 운영자 토큰**을 사용하는 구조입니다 (모든 레포가 여러분의
GitHub 계정에, 모든 프로젝트가 여러분의 Vercel 계정에 생성됩니다).
여러 사용자가 각자의 계정에 결과물을 받는 진짜 멀티테넌트 서비스로 가려면
"다음 단계" 섹션을 참고하세요.

## 1. 준비물

- Node.js 18 이상
- GitHub 계정 + [Personal Access Token](https://github.com/settings/tokens) (`repo` 권한)
- Vercel 계정 + [Access Token](https://vercel.com/account/tokens)
- Anthropic API 키 ([console.anthropic.com](https://console.anthropic.com))
- Firebase 프로젝트 하나 ([console.firebase.google.com](https://console.firebase.google.com)에서
  "프로젝트 추가"로 생성, 무료 Spark 요금제로 충분합니다)
  - **Admin 자격 증명**: 프로젝트 설정 > 서비스 계정 > "새 비공개 키 생성" →
    다운로드된 JSON 파일 안의 `project_id`, `client_email`, `private_key` 값을
    `.env.local`에 옮겨 적습니다
  - **클라이언트 설정**: 프로젝트 설정 > 일반 > "내 앱"에서 웹 앱을 하나 추가하면
    나오는 `apiKey`, `authDomain` 등의 값을 `.env.local`에 옮겨 적습니다
  - Firestore Database를 아직 안 만들었다면 콘솔에서 "Firestore Database 만들기"를
    한 번 눌러 활성화해야 합니다 (테스트 모드로 시작해도 됩니다)
  - `firestore.rules` 파일 내용을 Firebase 콘솔의 Firestore > 규칙 탭에 붙여넣고
    게시하면 이 프로젝트의 기본 보안 규칙이 적용됩니다
- (선택) 위 GitHub 계정과 Vercel 계정이 GitHub App으로 서로 연동되어 있어야
  Vercel이 레포를 인식합니다 — Vercel 대시보드에서 한 번 GitHub 연동을
  해두면 이후 API 호출로 생성한 프로젝트도 정상적으로 연동됩니다.

## 2. 설치

```bash
npm install
cp .env.example .env.local
# .env.local 파일을 열어 토큰 값들을 채워 넣으세요
```

## 3. 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 앱 설명 입력 → "앱 생성하기" 클릭.

성공하면 GitHub 레포 링크와 Vercel 배포 URL이 화면에 표시됩니다.
Vercel 최초 빌드는 몇 십 초 정도 걸리므로, 배포 URL에 바로 접속했을 때
"404" 또는 빌드 중 화면이 보이면 잠시 후 새로고침 해보세요.

## 4. 지금 버전의 한계 (의도된 것)

- **정적 페이지만 생성**: 복잡한 풀스택 로직 대신 단일 `index.html`
  파일 하나만 생성하도록 범위를 좁혔습니다. 파이프라인 자체(생성 → GitHub
  → Vercel)가 안정적으로 도는지 먼저 검증하기 위함입니다.
- **Firebase는 프로젝트 하나를 공용으로 사용**: 앱마다 새 Firebase
  프로젝트를 만드는 대신, 하나의 프로젝트 안에서 `apps/{앱ID}/items`라는
  전용 컬렉션을 만들어 데이터를 격리합니다. Google Cloud 결제 계정 연동이
  필요한 "앱마다 완전히 별도인 Firebase 프로젝트"는 승인 절차가 복잡해서
  이 MVP 범위에서는 제외했습니다.
- **Firestore 규칙이 느슨함**: `firestore.rules`는 데모용으로 열려있게
  설정되어 있습니다. 실서비스에서는 앱별 접근 제어가 필요합니다.
- **단일 운영자 토큰**: 모든 사용자의 요청이 여러분의 GitHub/Vercel 계정에
  쌓입니다. 실제 서비스라면 사용자별 OAuth 연동이 필요합니다.
- **동기 처리**: 요청 하나가 끝날 때까지 응답을 기다립니다. 실제 서비스에서는
  작업 큐(예: BullMQ + Redis)로 비동기 처리하고, 진행 상황을 폴링이나
  웹소켓으로 보여줘야 합니다.
- **에러/재시도 처리 최소화**: GitHub/Vercel API 실패, 레이트리밋 등에 대한
  견고한 처리가 없습니다.

## 5. 다음 단계 (실서비스로 확장 시)

1. **사용자별 GitHub OAuth App 등록** → 각 사용자가 자기 GitHub 계정을
   연결해서 그 계정에 레포가 생성되도록 변경
2. **사용자별 Vercel Integration** → 마찬가지로 사용자의 Vercel 계정에
   프로젝트가 생성되도록 변경
3. **작업 큐 도입** (BullMQ, Inngest, Trigger.dev 등)으로 생성 작업을
   비동기 처리하고 진행 상태를 실시간으로 노출
4. **자체 사용자 DB** (Postgres 등)로 계정, 프로젝트 이력, 연결된 토큰
   관리
5. **Firestore 접근 제어 강화** — 앱마다 별도의 API 키나 App Check를 써서
   다른 앱의 데이터를 함부로 읽거나 쓰지 못하도록 보안 규칙을 좁히기
6. **여러 파일 / Next.js 템플릿 생성**으로 확장 — 지금은 `index.html`
   하나지만, 실제로는 여러 컴포넌트 파일을 만들고 `package.json`도
   함께 생성해야 진짜 앱다운 결과물이 나옵니다
7. **사용량 기반 과금 / 크레딧 시스템** — LLM 호출 비용과 API 레이트리밋을
   고려한 사용량 제한 설계
