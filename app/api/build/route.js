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
  const { description, images } = await request.json();

  if (!description || description.trim().length < 3) {
    return NextResponse.json(
      { error: "앱 설명을 조금 더 자세히 입력해주세요." },
      { status: 400 }
    );
  }

  const slug = slugify(description);
  const repoName = `app-${slug ? slug + "-" : ""}${Date.now().toString(36)}`
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const collectionPath = await createAppSpace(repoName, description);

    const { html, stopReason, outputTokens } = await generateStaticApp(description, {
      firebaseConfig: firebaseClientConfig,
      collectionPath,
      images,
    });

    if (stopReason === "max_tokens") {
      throw new Error(
        `요청하신 앱이 너무 복잡해서 코드가 완성되지 못하고 중간에 잘렸습니다 (생성된 토큰: ${outputTokens}개). ` +
        `설명을 좀 더 단순하게 줄이거나, 기능을 나눠서 요청해보세요.`
      );
    }

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

    const deployment = await triggerDeployment(vercelProject.id, repoName, repo.id, "main");

    return NextResponse.json({
      repoUrl: repo.html_url,
      vercelProjectName: vercelProject.name,
      firestorePath: collectionPath,
      previewUrl: `https://${deployment.url}`,
      productionUrl: `https://${vercelProject.name}.vercel.app`,
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
