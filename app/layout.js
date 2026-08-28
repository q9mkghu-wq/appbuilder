export const metadata = {
  title: "App Builder MVP",
  description: "설명 한 줄로 앱을 생성하고 GitHub + Vercel에 자동 배포합니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
