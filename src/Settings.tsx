import React, { useCallback, useState } from "react";

// --- 型定義 ---
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// --- アイコンコンポーネント ---
const ChevronLeftIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
));
const DownloadIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
));
const UploadIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </svg>
));
const PaletteIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
));
const SortIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
  </svg>
));
const LinkIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
));
const ConvertIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
  </svg>
));
const InfoIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
));
const InstallIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 15l-4-4h2.5V8h3v4H16l-4 4z" />{" "}
  </svg>
));

// --- UI部品 ---

// 設定セクションのカード
const SettingsCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md transition-colors duration-300">
    <h2 className="flex items-center text-lg font-bold mb-4 text-rose-500 dark:text-rose-400 font-kiwi">
      {icon}
      <span className="ml-2">{title}</span>
    </h2>
    <div className="space-y-4">{children}</div>
  </div>
);

// トグルスイッチ
const ToggleSwitch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex items-center h-6 rounded-full w-10 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-rose-400 dark:focus:ring-offset-slate-900 ${
      checked ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"
    }`}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

// --- 設定ページ本体 ---
type SettingsProps = {
  onClose: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  onBackup: () => void;
  onRestoreTrigger: () => void;
  installPrompt: BeforeInstallPromptEvent | null;
  showToast: (message: string, duration?: number) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
};

export default function Settings({
  onClose,
  isDarkMode,
  setIsDarkMode,
  onBackup,
  onRestoreTrigger,
  installPrompt,
  sortBy,
  setSortBy,
}: SettingsProps) {
  const [isLinkifyEnabled, setIsLinkifyEnabled] = useState(true); // UI state only for now

  const handleInstallClick = useCallback(() => {
    if (!installPrompt) return;
    installPrompt.prompt();
  }, [installPrompt]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-amber-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
      <header className="flex-shrink-0 flex items-center justify-between p-2 border-b border-amber-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="メモ一覧に戻る"
        >
          <ChevronLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold font-kiwi text-slate-700 dark:text-slate-200">
          設 定
        </h1>
        <div className="w-10 h-10" /> {/* 中央揃えのためのスペーサー */}
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-6">
        <SettingsCard
          title="バックアップ"
          icon={<DownloadIcon className="w-5 h-5" />}
        >
          <button
            onClick={onBackup}
            className="w-full flex items-center justify-center h-16 px-4 py-16 text-base font-bold bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            バックアップを作成
          </button>

          <button
            onClick={onRestoreTrigger}
            className="w-full flex items-center justify-center h-16 px-4 py-16 text-base font-bold bg-pink-500 text-white rounded-lg shadow dark:hover:bg-pink-700 transition-all duration-300 transform hover:scale-105"
          >
            <UploadIcon className="w-5 h-5 mr-2" />
            バックアップから復元
          </button>
          <hr className="my-2 border-slate-200 dark:border-slate-700" />
          <div className="flex items-start p-2">
            <ConvertIcon className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
            <div>
              <h3 className="font-bold text-slate-700 dark:text-slate-300">
                バックアップファイル変換ツール
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                ミミノートのバックアップファイル(.mimibk)をnanamemoで復元できるようになりました！
                <br />
                「バックアップから復元」ボタンから .mimibk
                ファイルを選択してください。
              </p>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="表示設定"
          icon={<PaletteIcon className="w-5 h-5" />}
        >
          <div className="flex justify-between items-center p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              テーマ
            </span>
            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-semibold transition-colors ${
                  !isDarkMode
                    ? "text-rose-500 dark:text-rose-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                ライト
              </span>
              <ToggleSwitch checked={isDarkMode} onChange={setIsDarkMode} />
              <span
                className={`text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? "text-rose-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                ダーク
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700">
            <label
              htmlFor="sort-order"
              className="font-medium text-slate-700 dark:text-slate-300 flex items-center"
            >
              <SortIcon className="w-5 h-5 mr-2" />
              ソート方法
            </label>
            <select
              id="sort-order"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 px-2 text-sm rounded-md bg-white border border-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none text-right"
            >
              <option value="updatedAt_desc">更新日時の新しい順</option>
              <option value="updatedAt_asc">更新日時の古い順</option>
              <option value="createdAt_desc">作成日時の新しい順</option>
              <option value="createdAt_asc">作成日時の古い順</option>
            </select>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700">
            <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
              <LinkIcon className="w-5 h-5 mr-2" />
              テキストリンク
            </span>
            <ToggleSwitch
              checked={isLinkifyEnabled}
              onChange={setIsLinkifyEnabled}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="nanamemo公式情報"
          icon={<InfoIcon className="w-5 h-5" />}
        >
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center px-4 py-4 text-base font-bold bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
            >
              <InstallIcon className="w-5 h-5 mr-2" />
              アプリをインストール
            </button>
          )}
          <div className="flex justify-between items-center p-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              バージョン
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              v1.4.0
            </span>
          </div>
          <a
            href="https://github.com/Nana-music-app/nanamemo"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center mt-2 p-2 font-medium text-blue-500 dark:text-blue-400 hover:underline"
          >
            開発者情報を確認する
          </a>
        </SettingsCard>
      </main>

      <footer className="flex-shrink-0 border-t border-amber-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="w-full h-16 flex items-center justify-center px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-200"
          aria-label="メモ一覧に戻る"
        >
          <ChevronLeftIcon className="w-6 h-6 mr-1" />
          <span>メモ一覧に戻る</span>
        </button>
      </footer>
    </div>
  );
}
