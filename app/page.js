"use client";

import { useState } from "react";

const MAX_IMAGES = 5;
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.75;

export default function Home() {
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function resizeAndCompress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
          const [, data] = dataUrl.split(",");
          resolve({ mediaType: "image/jpeg", data, previewUrl: dataUrl });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES);
    if (files.length === 0) {
      setImages([]);
      return;
    }
    Promise.all(files.map(resizeAndCompress)).then(setImages);
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          images: images.map((img) => ({ mediaType: img.mediaType, data: img.data })),
        }),
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 413 || /entity too large/i.test(rawText)
            ? "요청 용량이 너무 큽니다. 이미지 개수를 줄이거나 더 작은 이미지로 다시 시도해주세요."
            : `서버 오류 (status ${res.status}): ${rawText.slice(0, 200)}`
        );
      }

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
        Vercel에 자동으로 배포합니다. 참고할 이미지(디자인 시안, 스크린샷 등)를
        최대 {MAX_IMAGES}장까지 같이 첨부할 수도 있습니다 (자동으로 크기가
        줄어들어 업로드됩니다).
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

        <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#555" }}>
          참고 이미지 (선택, 최대 {MAX_IMAGES}장)
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={handleImageChange}
          style={{ marginBottom: 12, display: "block" }}
        />

        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={img.previewUrl}
                  alt={`첨부 이미지 ${i + 1} 미리보기`}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="이미지 제거"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "#333",
                    color: "#fff",
                    fontSize: 12,
                    lineHeight: "20px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

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
            배포 URL (지금 바로 접속 가능):{" "}
            <a href={result.previewUrl} target="_blank" rel="noreferrer">
              {result.previewUrl}
            </a>
          </p>
          {result.productionUrl && (
            <p>
              정식 도메인 (연결까지 몇 분 걸릴 수 있음):{" "}
              <a href={result.productionUrl} target="_blank" rel="noreferrer">
                {result.productionUrl}
              </a>
            </p>
          )}
          <p>Firestore 데이터 경로: {result.firestorePath}</p>
          {result.debug && (
            <p style={{ color: "#888", fontSize: 13 }}>
              [진단] stopReason: {String(result.debug.stopReason)} / outputTokens: {String(result.debug.outputTokens)} / htmlLength: {String(result.debug.htmlLength)}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
