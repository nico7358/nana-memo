import React, {lazy, Suspense} from "react";
import ReactDOM from "react-dom/client";

// メインのAppコンポーネントを遅延読み込みする
const App = lazy(() => import("@/App.tsx"));

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Reactが#rootにマウントされると、index.html内の初期スピナーは自動的に置き換えられて消える
root.render(
  <React.StrictMode>
    {/* Suspenseのfallbackはnullにする。初期表示はindex.htmlのスピナーが担当するため */}
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </React.StrictMode>
);

// ✅ サービスワーカーの登録はindex.htmlのインラインスクリプトで早期に実行されるため、ここでの二重登録は不要。
// if ('serviceWorker' in navigator) { ... }
