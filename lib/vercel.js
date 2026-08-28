const VERCEL_API = "https://api.vercel.com";

function withTeamQuery(url) {
  if (!process.env.VC_TEAM_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}teamId=${process.env.VC_TEAM_ID}`;
}

export async function createVercelProject(projectName, githubRepoFullName) {
  const res = await fetch(withTeamQuery(`${VERCEL_API}/v11/projects`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VC_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      gitRepository: {
        type: "github",
        repo: githubRepoFullName,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Vercel 프로젝트 생성 실패: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function triggerDeployment(projectId, projectName, repoId, ref = "main") {
  const url = withTeamQuery(
    `${VERCEL_API}/v13/deployments?skipAutoDetectConfirmation=1`
  );
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VC_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      project: projectId,
      target: "production",
      gitSource: {
        type: "github",
        repoId,
        ref,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Vercel 배포 트리거 실패: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function getLatestDeployment(projectName) {
  const res = await fetch(
    withTeamQuery(
      `${VERCEL_API}/v6/deployments?projectId=${projectName}&limit=1`
    ),
    {
      headers: { Authorization: `Bearer ${process.env.VC_TOKEN}` },
    }
  );
  const data = await res.json();
  return data.deployments?.[0] || null;
}
