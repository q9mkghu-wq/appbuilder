import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env 파일에서는 개행문자가 \n 문자열로 저장되므로 실제 개행으로 변환
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * 새로 생성되는 앱을 위한 전용 Firestore 공간(컬렉션)을 만듭니다.
 * 공용 Firebase 프로젝트 하나 안에서 앱마다 독립된 컬렉션을 쓰는 방식이라,
 * 사용자별 Firebase 프로젝트를 매번 새로 만드는 복잡함 없이 빠르게 시작할 수 있습니다.
 *
 * 실제 서비스로 갈 때는 Firestore 보안 규칙에서
 * "각 컬렉션은 해당 앱의 API 키로만 쓰기 가능" 등으로 접근을 제한해야 합니다.
 */
export async function createAppSpace(appId, description) {
  const db = getFirestore(getAdminApp());
  const docRef = db.collection("apps").doc(appId);

  await docRef.set({
    description,
    createdAt: new Date().toISOString(),
  });

  // 생성된 앱 코드가 실제로 데이터를 저장할 하위 컬렉션 경로
  return `apps/${appId}/items`;
}
