const VERCEL_API = "https://api.vercel.com";

function withTeamQuery(url) {
  if (!process.env.VERCEL_TEAM_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}teamId=${process.env.VERCEL_TEAM_ID}`;
}

/**
 * GitHub 레포와 연결된 Vercel 프로젝트를 생성합니다.
 * 레포와 연결하는 즉시 Vercel이 기본 브랜치를 기준으로 첫 배포를 자동으로 시작합니다.
 */
export async function createVercelProject(projectName, githubRepoFullName) {
  const res = await fetch(withTeamQuery(`${VERCEL_API}/v11/projects`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      gitRepository: {
        type: "github",
        repo: githubRepoFullName, // 예: "my-username/my-repo"
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Vercel 프로젝트 생성 실패: ${JSON.stringify(data)}`);
  }
  return data; // data.id, data.name 등
}

/**
 * 프로젝트의 최신 배포 상태 및 URL을 조회합니다.
 * 레포 연결 직후에는 배포가 아직 큐에 있을 수 있어 폴링이 필요할 수 있습니다.
 */
export async function getLatestDeployment(projectName) {
  const res = await fetch(
    withTeamQuery(
      `${VERCEL_API}/v6/deployments?projectId=${projectName}&limit=1`
    ),
    {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    }
  );
  const data = await res.json();
  return data.deployments?.[0] || null;
}
