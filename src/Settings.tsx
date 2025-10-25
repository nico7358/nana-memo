import React, {useState, useEffect, useRef} from "react";
import {type Note, parseMimiNoteBackup} from "@/App.tsx";

// --- 型定義 ---
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// File System Access APIの型が標準ライブラリに含まれていない場合があるため、グローバルで定義します。
declare global {
  interface Window {
    showOpenFilePicker(
      options?: OpenFilePickerOptions
    ): Promise<FileSystemFileHandle[]>;
  }
  interface OpenFilePickerOptions {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: {
      description?: string;
      accept: Record<string, string | string[]>;
    }[];
  }
  interface FileSystemFileHandle {
    getFile(): Promise<File>;
  }
}

// --- ファイル読み込みヘルパー (FileReaderを使用) ---
// Android等の一部環境でファイルが空になる問題への対策として、
// より堅牢なreadAsDataURLを使用し、Base64からArrayBufferに変換します。
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("ファイルが指定されていません。"));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      try {
        const base64String = result.substring(result.indexOf(",") + 1);
        if (!base64String) {
          throw new Error("ファイルが空か、読み込みに失敗しました。");
        }
        const binaryString = atob(base64String);
        const len = binaryString.length;
        // FIX: Explicitly create an ArrayBuffer to resolve the ArrayBufferLike type error.
        const buffer = new ArrayBuffer(len);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        if (buffer.byteLength === 0) {
          throw new Error("ファイルが空か、読み込みに失敗しました。");
        }
        resolve(buffer);
      } catch (e) {
        console.error("Failed to process data URL", e);
        reject(new Error("データURLからのファイル読み込みに失敗しました。"));
      }
    };
    reader.onerror = (e) => {
      console.error("FileReader error", e);
      reject(new Error("ファイルリーダーでエラーが発生しました。"));
    };
    reader.readAsDataURL(file);
  });
}

// --- アイコンコンポーネント ---
const ChevronLeftIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
));
const DownloadIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
));
const UploadIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </svg>
));
const PaletteIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
));
const SortIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
  </svg>
));
const LinkIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
));
const ConvertIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
  </svg>
));
const InfoIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
));
const InstallIcon = React.memo<{className?: string}>(({className}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 15l-4-4h2.5V8h3v4H16l-4 4z" />
  </svg>
));

// --- UI部品 ---
const SettingsCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 shadow-md transition-colors duration-300">
    <h2 className="flex items-center text-lg font-bold mb-4 text-rose-500 dark:text-rose-400 font-kiwi">
      {icon}
      <span className="ml-2">{title}</span>
    </h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const ToggleSwitch = ({
  enabled,
  setEnabled,
}: {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={() => setEnabled(!enabled)}
    className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${
      enabled
        ? "bg-rose-500 text-white hover:bg-rose-600"
        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
    }`}
  >
    {enabled ? "オン" : "オフ"}
  </button>
);

// --- 設定ページ本体 ---
type SettingsProps = {
  notes: Note[];
  setNotes: (notes: React.SetStateAction<Note[]>) => void;
  onClose: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  installPrompt: BeforeInstallPromptEvent | null;
  showToast: (message: string, duration?: number) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  isListLinkifyEnabled: boolean;
  setIsListLinkifyEnabled: (enabled: boolean) => void;
  isEditorLinkifyEnabled: boolean;
  setIsEditorLinkifyEnabled: (enabled: boolean) => void;
};

export default function Settings({
  notes,
  setNotes,
  onClose,
  isDarkMode,
  setIsDarkMode,
  installPrompt,
  showToast,
  sortBy,
  setSortBy,
  isListLinkifyEnabled,
  setIsListLinkifyEnabled,
  isEditorLinkifyEnabled,
  setIsEditorLinkifyEnabled,
}: SettingsProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<{
    buffer: ArrayBuffer;
    name: string;
  } | null>(null);
  const [, setShowBackupBadge] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filePromiseRef = useRef<{
    resolve: (file: File) => void;
    reject: (reason?: unknown) => void;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (filePromiseRef.current) {
      if (event.target.files && event.target.files.length > 0) {
        filePromiseRef.current.resolve(event.target.files[0]);
      } else {
        filePromiseRef.current.reject(
          new DOMException("No file selected.", "AbortError")
        );
      }
      filePromiseRef.current = null;
    }
    // Always reset the input value to allow re-selecting the same file
    if (event.target) {
      event.target.value = "";
    }
  };

  const triggerFilePicker = (accept: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (filePromiseRef.current) {
        filePromiseRef.current.reject(
          new DOMException("A new file picker was opened.", "AbortError")
        );
      }
      filePromiseRef.current = {resolve, reject};

      const fileInput = fileInputRef.current;
      if (fileInput) {
        fileInput.accept = accept;

        const onFocus = () => {
          window.removeEventListener("focus", onFocus);
          setTimeout(() => {
            if (filePromiseRef.current) {
              filePromiseRef.current.reject(
                new DOMException(
                  "File picker was cancelled by the user.",
                  "AbortError"
                )
              );
              filePromiseRef.current = null;
            }
          }, 300);
        };

        window.addEventListener("focus", onFocus);
        fileInput.click();
      } else {
        reject(new Error("File input element not found."));
      }
    });
  };

  const openFileWithFallback = async (
    options: OpenFilePickerOptions
  ): Promise<File> => {
    if ("showOpenFilePicker" in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker(options);
        return await fileHandle.getFile();
      } catch (err) {
        if ((err as DOMException).name === "AbortError") {
          console.log("showOpenFilePicker was cancelled by the user.");
          throw err;
        }
        console.warn("showOpenFilePicker failed, falling back to input.", err);
      }
    }

    console.log('Using static <input type="file"> fallback.');
    const accept =
      options.types
        ?.flatMap((type) => Object.values(type.accept).flat())
        .join(",") ?? "";

    return triggerFilePicker(accept);
  };

  useEffect(() => {
    const lastBackupTime = parseInt(
      localStorage.getItem("nana-memo-last-backup-timestamp") || "0",
      10
    );
    const needsBackup = Date.now() - lastBackupTime > 7 * 24 * 60 * 60 * 1000;
    setShowBackupBadge(needsBackup);
  }, [notes]);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(({outcome}) => {
      if (outcome === "accepted") {
        showToast("アプリをインストールしました！", 3000);
      }
    });
  };

  const handleBackup = () => {
    const formattedDate = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const filename = `nanamemo_backup_${formattedDate}.json`;
    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], {type: "application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement("a");
    linkElement.href = url;
    linkElement.download = filename;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);

    localStorage.setItem(
      "nana-memo-last-backup-timestamp",
      Date.now().toString()
    );
    setShowBackupBadge(false);
    onClose();
    showToast("バックアップファイルを保存しました。");
  };

  const handleRestore = async () => {
    try {
      const file = await openFileWithFallback({
        types: [
          {
            description: "Backup Files",
            accept: {
              ".json": ".json",
              ".mimibk": ".mimibk",
              ".db": ".db",
            },
          },
        ],
        multiple: false,
      });
      const buffer = await readFileAsArrayBuffer(file);
      setShowRestoreConfirm({buffer, name: file.name});
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        console.log("File picker was cancelled by the user.");
      } else {
        console.error("File picker error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "ファイルの読み込みに失敗しました。";
        showToast(message, 5000);
      }
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    showToast("ミミノートの変換を開始します...", 3000);

    try {
      const file = await openFileWithFallback({
        types: [
          {
            description: "Database Files",
            accept: {
              ".mimibk": ".mimibk",
              ".db": ".db",
              ".sqlite": ".sqlite",
              ".sqlite3": ".sqlite3",
            },
          },
        ],
        multiple: false,
      });
      const buffer = await readFileAsArrayBuffer(file);
      const notes = await parseMimiNoteBackup(buffer);

      if (notes.length === 0) {
        showToast("変換対象のメモが見つかりませんでした。", 3000);
        return;
      }

      const jsonString = JSON.stringify(notes, null, 2);
      const blob = new Blob([jsonString], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const originalFileName = file.name.replace(/\.[^/.]+$/, "");
      a.download = `${originalFileName}_nanamemo.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(
        `${notes.length}件のメモを変換し、ダウンロードしました！`,
        5000
      );
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        console.log("File picker was cancelled by the user.");
      } else {
        console.error("ミミノートの変換に失敗しました:", error);
        const message = error instanceof Error ? error.message : String(error);
        showToast(`ミミノートの変換に失敗しました: ${message}`, 5000);
      }
    } finally {
      setIsConverting(false);
    }
  };

  const proceedWithRestore = async (
    restoreData: {buffer: ArrayBuffer; name: string} | null
  ) => {
    setShowRestoreConfirm(null);
    if (!restoreData || restoreData.buffer.byteLength === 0) {
      showToast(`復元に失敗しました: ファイルが空です。`, 5000);
      return;
    }

    const {buffer, name} = restoreData;
    showToast("バックアップファイルを解析中...", 10000);

    try {
      let importedNotes: Note[];
      const fileName = name.toLowerCase();

      if (fileName.endsWith(".json")) {
        const text = new TextDecoder().decode(buffer);
        const parsedData = JSON.parse(text);
        if (
          Array.isArray(parsedData) &&
          (parsedData.length === 0 || "content" in parsedData[0])
        ) {
          importedNotes = parsedData.map((n: Partial<Note>) => ({
            id: n.id || String(Date.now() + Math.random()),
            content: n.content || "",
            createdAt: n.createdAt || Date.now(),
            updatedAt: n.updatedAt || Date.now(),
            isPinned: n.isPinned || false,
            color: n.color || "text-slate-800 dark:text-slate-200",
            font: n.font || "font-sans",
            fontSize: n.fontSize || "text-lg",
          }));
        } else {
          throw new Error("無効なJSONファイル形式です。");
        }
      } else if (fileName.endsWith(".mimibk") || fileName.endsWith(".db")) {
        importedNotes = await parseMimiNoteBackup(buffer);
      } else {
        throw new Error("サポートされていないファイル形式です。");
      }

      setNotes((currentNotes) => {
        const notesMap = new Map<string, Note>();
        for (const note of currentNotes) {
          notesMap.set(note.id, note);
        }
        for (const importedNote of importedNotes) {
          const existingNote = notesMap.get(importedNote.id);
          if (
            !existingNote ||
            importedNote.updatedAt >= existingNote.updatedAt
          ) {
            notesMap.set(importedNote.id, importedNote);
          }
        }
        return Array.from(notesMap.values());
      });

      onClose();
      showToast(`${importedNotes.length}件のメモを復元・追加しました。`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showToast(`復元に失敗しました: ${errorMessage}`, 5000);
      console.error("Failed to restore notes:", error);
    }
  };

  const cancelRestore = () => {
    setShowRestoreConfirm(null);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
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

        <main className="flex-grow overflow-y-auto p-4 space-y-8">
          {installPrompt && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 shadow-md">
              <h2 className="flex items-center text-lg font-bold mb-3 text-blue-600 dark:text-blue-400 font-kiwi">
                <InstallIcon className="w-5 h-5 mr-2" />
                <span>ホーム画面に追加</span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                アプリとしてインストールすると、ワンタップでアクセスでき、さらに快適にメモが取れます。
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center px-4 py-3 text-base font-bold bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              >
                <InstallIcon className="w-5 h-5 mr-2" />
                インストール
              </button>
            </div>
          )}

          <SettingsCard
            title="バックアップと復元"
            icon={<DownloadIcon className="w-5 h-5" />}
          >
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                バックアップを作成
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">
                現在の全てのメモを、安全な場所に保管するためのファイルを作成します。
              </p>
              <button
                onClick={handleBackup}
                className="w-full flex items-center justify-center h-14 px-4 text-base font-bold bg-rose-500 text-white rounded-lg shadow-md hover:bg-rose-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-rose-300 dark:focus:ring-rose-700"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                バックアップファイルを作成
              </button>
            </div>

            <hr className="my-6 border-slate-200 dark:border-slate-700" />

            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                データを取り込む
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-4">
                以前のバックアップファイルや、他のメモアプリのデータから復元します。
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleRestore}
                  className="w-full flex items-center text-left p-4 text-base font-medium bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-blue-500"
                >
                  <UploadIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-bold">バックアップから復元</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      nanamemo (.json) / ミミノート (.mimibk)
                    </span>
                  </div>
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="w-full flex items-center text-left p-4 text-base font-medium bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-yellow-600 dark:text-yellow-400 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-yellow-300 dark:hover:border-yellow-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ConvertIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                  <div>
                    <span className="font-bold">
                      {isConverting
                        ? "変換中..."
                        : "ミミノートをnanamemo形式に変換"}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      .mimibk, .db → .json ファイルを生成
                    </span>
                  </div>
                </button>
              </div>
              <div className="flex items-start p-3 mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                <InfoIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>
                  「バックアップから復元」は直接メモを取り込みます。「ミミノートを変換」はnanamemo形式の.jsonファイルを生成して保存します。
                </p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="表示設定"
            icon={<PaletteIcon className="w-5 h-5" />}
          >
            <div className="flex justify-between items-center p-3 rounded-lg">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                テーマ
              </span>
              <div className="relative flex w-32 items-center rounded-full bg-rose-100 dark:bg-slate-700 p-1 transition-colors duration-300">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`relative z-10 flex-1 py-1 text-sm font-bold rounded-full transition-colors duration-300 focus:outline-none ${
                    !isDarkMode
                      ? "text-white"
                      : "text-rose-500 dark:text-rose-300"
                  }`}
                >
                  ライト
                </button>
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`relative z-10 flex-1 py-1 text-sm font-bold rounded-full transition-colors duration-300 focus:outline-none ${
                    isDarkMode
                      ? "text-white"
                      : "text-rose-500 dark:text-rose-300"
                  }`}
                >
                  ダーク
                </button>
                <span
                  className={`absolute inset-1 w-1/2 rounded-full bg-rose-500 shadow-md transform transition-transform duration-300 ${
                    isDarkMode ? "translate-x-full" : "translate-x-0"
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-amber-100/50 dark:hover:bg-slate-700/50">
              <label
                htmlFor="sort-order"
                className="font-medium text-slate-700 dark:text-slate-300 flex items-center"
              >
                <SortIcon className="w-5 h-5 mr-2" />
                メモの並び順
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

            <div className="border-t border-amber-200/50 dark:border-slate-700/50 my-2"></div>

            <div className="p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  メモ一覧のリンク
                </span>
                <ToggleSwitch
                  enabled={isListLinkifyEnabled}
                  setEnabled={setIsListLinkifyEnabled}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-7">
                URLやメールアドレスを自動でリンクにします。
              </p>
            </div>

            <div className="p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  編集画面のリンク
                </span>
                <ToggleSwitch
                  enabled={isEditorLinkifyEnabled}
                  setEnabled={setIsEditorLinkifyEnabled}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-7">
                編集画面でもリンクをタップで開けるようにします。（誤操作防止のため、オフを推奨）
              </p>
            </div>
          </SettingsCard>

          <SettingsCard
            title="アプリ情報"
            icon={<InfoIcon className="w-5 h-5" />}
          >
            <div className="flex justify-between items-center p-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                バージョン
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                v1.5.0
              </span>
            </div>
            <a
              href="https://github.com/nico7358"
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
      {showRestoreConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={cancelRestore}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-4">
              メモの復元
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
              バックアップから復元しますか？
              <br />
              <strong className="text-rose-500 dark:text-rose-400">
                既存のメモは保持され、バックアップのメモが追加されます。
              </strong>
              同じメモがある場合は、更新日時が新しい方で上書きされます。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRestore}
                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-slate-400"
              >
                キャンセル
              </button>
              <button
                onClick={() => proceedWithRestore(showRestoreConfirm)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-blue-500"
              >
                復元
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
