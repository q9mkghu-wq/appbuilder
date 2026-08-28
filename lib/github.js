import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

/**
 * 새 GitHub 레포지토리를 생성합니다. 이미 존재하는 이름이면 에러가 납니다.
 */
export async function createRepo(repoName) {
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    private: false,
    auto_init: true, // README와 함께 초기 커밋 생성 (빈 레포에 파일 푸시하려면 필요)
  });
  return data; // data.full_name, data.html_url 등
}

/**
 * 레포에 파일 하나를 생성/업데이트합니다 (Contents API 사용).
 */
export async function pushFile(owner, repo, path, content, message) {
  // 파일이 이미 있으면 sha가 필요하므로 먼저 조회 시도
  let sha;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path });
    sha = existing.data.sha;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    sha,
  });
  return data;
}
