import { NextResponse } from "next/server";
import { generateStaticApp } from "../../../lib/generate";
import { createRepo, pushFile } from "../../../lib/github";
import { createVercelProject, triggerDeployment } from "../../../lib/vercel";
import { createAppSpace } from "../../../lib/firebase";

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
    const collectionPath = await createAppSpace(repoName, description);

    const { html, stopReason, outputTokens } = await generateStaticApp(description, {
      firebaseConfig: firebaseClientConfig,
      collectionPath,
    });

    const repo = await createRepo(repoName);

    const vercelProject = await createVercelProject(
      repoName,
      repo.full_name
    );

    await pushFile(
      repo.owner.login,
      repo.name,
      "index.html",
      html,
      "feat: AI가 생성한 초기 앱 코드 (Firebase 연동 포함)"
    );

    await triggerDeployment(vercelProject.id, repoName, repo.id, "main");

    return NextResponse.json({
      repoUrl: repo.html_url,
      vercelProjectName: vercelProject.name,
      firestorePath: collectionPath,
      previewUrl: `https://${vercelProject.name}.vercel.app`,
      debug: {
        stopReason,
        outputTokens,
        htmlLength: html.length,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "빌드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
