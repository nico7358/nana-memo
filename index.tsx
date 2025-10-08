import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
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