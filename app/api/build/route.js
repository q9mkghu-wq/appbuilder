import { NextResponse } from "next/server";
import { generateStaticApp } from "../../../lib/generate";
import { createRepo, pushFile } from "../../../lib/github";
import { createVercelProject } from "../../../lib/vercel";
import { createAppSpace } from "../../../lib/firebase";

// 생성된 앱이 브라우저에서 Firestore에 접근할 때 쓰는 "클라이언트" 설정.
// Admin SDK 키와 달리 이 값들은 공개되어도 안전하도록 설계되어 있으며
// (Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱에서 확인 가능),
// 실제 접근 제어는 Firestore 보안 규칙에서 처리합니다.
const firebaseClientConfig = {
  apiKey: process.env.FIREBASE_CLIENT_API_KEY,
  authDomain: process.env.FIREBASE_CLIENT_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_CLIENT_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_CLIENT_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_CLIENT_APP_ID,
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(request) {
  const { description } = await request.json();

  if (!description || description.trim().length < 3) {
    return NextResponse.json(
      { error: "앱 설명을 조금 더 자세히 입력해주세요." },
      { status: 400 }
    );
  }

  const repoName = `app-${slugify(description)}-${Date.now().toString(36)}`;

  try {
    // 1. Firebase에 이 앱 전용 공간(컬렉션) 생성
    const collectionPath = await createAppSpace(repoName, description);

    // 2. AI로 코드 생성 (Firebase 연결 코드까지 포함해서 생성)
    const html = await generateStaticApp(description, {
      firebaseConfig: firebaseClientConfig,
      collectionPath,
    });

    // 3. GitHub 레포 생성
    const repo = await createRepo(repoName);

    // 4. 생성된 코드를 레포에 푸시
    await pushFile(
      repo.owner.login,
      repo.name,
      "index.html",
      html,
      "feat: AI가 생성한 초기 앱 코드 (Firebase 연동 포함)"
    );

    // 5. Vercel 프로젝트 생성 (GitHub 레포와 연결 -> 자동 배포 트리거)
    const vercelProject = await createVercelProject(
      repoName,
      repo.full_name
    );

    return NextResponse.json({
      repoUrl: repo.html_url,
      vercelProjectName: vercelProject.name,
      firestorePath: collectionPath,
      // Vercel의 기본 배포 도메인 패턴 (프로젝트명.vercel.app). 최초 빌드는
      // 완료까지 몇 십 초 정도 걸리므로, 실제 서비스에서는 상태를 폴링해서
      // 빌드 완료 후 안내하는 것을 권장합니다.
      previewUrl: `https://${vercelProject.name}.vercel.app`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "빌드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
