import React, {Suspense} from "react";
import ReactDOM from "react-dom/client";

// メインのAppコンポーネントを遅延読み込みしないように変更
import App from "@/App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Reactが#rootにマウントされると、index.html内の初期スピナーは自動的に置き換えられて消える
root.render(
  <React.StrictMode>
    {/* Suspenseのfallbackは不要になったためAppを直接レンダリング */}
    <App />
  </React.StrictMode>
);

// ✅ サービスワーカーの登録はindex.htmlのインラインスクリプトで早期に実行されるため、ここでの二重登録は不要。
// if ('serviceWorker' in navigator) { ... }
