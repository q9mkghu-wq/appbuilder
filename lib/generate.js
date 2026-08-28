import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 사용자의 설명을 받아서 배포 가능한 단일 페이지 정적 웹앱(HTML/CSS/JS)을
 * 하나의 index.html 파일로 생성합니다.
 *
 * MVP 단계에서는 "단일 정적 페이지"로 범위를 좁혀서
 * GitHub -> Vercel 파이프라인 검증에 집중합니다.
 * 이후 Next.js 풀스택 템플릿, 여러 파일 생성 등으로 확장할 수 있습니다.
 */
export async function generateStaticApp(description, firebaseOptions) {
  const { firebaseConfig, collectionPath } = firebaseOptions || {};

  const firebaseInstruction = firebaseConfig
    ? `
이 앱은 Firebase Firestore를 데이터 저장소로 사용해야 한다. 아래 지침을 반드시 따를 것:
- <head> 안에 다음 두 CDN 스크립트를 그대로 포함할 것:
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
- 아래 설정 그대로 firebase.initializeApp()을 호출할 것 (값을 수정하지 말 것):
  const firebaseConfig = ${JSON.stringify(firebaseConfig)};
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
- 데이터를 저장/조회할 때는 반드시 다음 컬렉션 경로를 사용할 것: "${collectionPath}"
  예: db.collection("${collectionPath}").add({...}), db.collection("${collectionPath}").onSnapshot(...)
- 앱의 핵심 기능(추가, 삭제, 목록 조회 등)은 새로고침해도 데이터가 남도록 반드시 이 Firestore 컬렉션을 통해 구현할 것 (localStorage나 메모리 변수만으로 구현하지 말 것)`
    : "";

  const systemPrompt = `너는 웹 개발자다. 사용자가 설명한 앱을 하나의 완전한 index.html 파일로 만들어라.
규칙:
- HTML, CSS, JavaScript를 전부 하나의 index.html 파일 안에 인라인으로 포함할 것
- 외부 빌드 도구나 npm 패키지 없이 순수 HTML/CSS/JS만 사용할 것 (CDN 스크립트는 허용)
- 반드시 완전하고 동작하는 코드만 출력할 것
- 설명, 코드 블록 마크다운(\`\`\`) 없이 순수 HTML 코드만 출력할 것 (<!DOCTYPE html>로 시작)
${firebaseInstruction}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `다음 앱을 만들어줘: ${description}`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // 혹시 모델이 코드 펜스를 붙였을 경우 제거
  return text.replace(/^```html\n?/i, "").replace(/```$/i, "").trim();
}
