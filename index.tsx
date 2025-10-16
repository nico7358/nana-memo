import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// メインのAppコンポーネントを遅延読み込みする
const App = lazy(() => import('./App'));

const rootElement = document.getElementById('root');
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

// ✅ サービスワーカーを登録して通知機能を有効化
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('/sw.js', window.location.href).href)
      .then(() => console.log('✅ Service Worker registered successfully'))
      .catch((err) => console.error('❌ Service Worker registration failed:', err));
  });
}
