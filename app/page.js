"use client";

import { useState } from "react";

export default function Home() {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "알 수 없는 오류");
      }

      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>App Builder MVP</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>
        만들고 싶은 앱을 설명하면, AI가 코드를 생성하고 GitHub에 푸시한 뒤
        Vercel에 자동으로 배포합니다.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 할 일 목록을 추가/삭제할 수 있는 투두 앱"
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 15,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            padding: "10px 20px",
            fontSize: 15,
            cursor: status === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {status === "loading" ? "생성 중... (최대 1분 소요)" : "앱 생성하기"}
        </button>
      </form>

      {status === "error" && (
        <p style={{ color: "crimson", marginTop: 24 }}>오류: {error}</p>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 32, lineHeight: 1.8 }}>
          <p>
            GitHub 레포:{" "}
            <a href={result.repoUrl} target="_blank" rel="noreferrer">
              {result.repoUrl}
            </a>
          </p>
          <p>
            배포 URL (빌드 완료까지 30초~1분 소요될 수 있습니다):{" "}
            <a href={result.previewUrl} target="_blank" rel="noreferrer">
              {result.previewUrl}
            </a>
          </p>
          <p>Firestore 데이터 경로: {result.firestorePath}</p>
        </div>
      )}
    </main>
  );
}
