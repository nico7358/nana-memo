import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import initSqlJs from "sql.js";
import sqlWasm from "sql.js/dist/sql-wasm.wasm?url";

// -----------------------------------------------------------
// 💡 WASMロード前に実行し、Workerを完全に無効化
// -----------------------------------------------------------
(window as any).Module = { noInitialRun: true, noWorker: true };

// --- Type Definitions ---
type Note = {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  color: string;
  font: string;
  fontSize: string;
};

type DeleteConfirmation = {
  ids: string[];
  preview?: string;
};

// --- Custom Event Types for better type safety ---
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// --- Helper Functions ---
const formatDay = (timestamp: number) =>
  new Date(timestamp)
    .toLocaleDateString("ja-JP", { day: "2-digit" })
    .replace("日", "");
const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
const getPlainText = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};
const parseBackupDate = (dateInput: any): number | null => {
  if (dateInput === null || dateInput === undefined || dateInput === "")
    return null;
  if (typeof dateInput === "number") {
    return String(dateInput).length === 10 ? dateInput * 1000 : dateInput;
  }
  if (typeof dateInput === "string") {
    const timestamp = new Date(
      dateInput.includes(" ") && dateInput.includes(":")
        ? dateInput.replace(" ", "T")
        : dateInput
    ).getTime();
    return isNaN(timestamp) ? new Date(dateInput).getTime() : timestamp;
  }
  return null;
};

// --- ファイルを確実にバイナリで読み込む関数（スマホ対応版） ---
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        console.log(
          "[Debug] FileReader loaded buffer:",
          e.target.result.byteLength
        );
        resolve(e.target.result);
      } else {
        reject(new Error("ArrayBufferとして読み込めませんでした"));
      }
    };
    reader.onerror = (err) => {
      console.error("[Debug] FileReader error:", err);
      reject(err);
    };
    reader.readAsArrayBuffer(file); // ✅ スマホでも確実にバイナリで読む
  });
}

async function parseMimiNoteBackup(file: File): Promise<Note[]> {
  try {
    // 修正点：インポートしたURLを使って、環境に依存せず初期化する
    const SQL = await initSqlJs({ locateFile: () => sqlWasm });

    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    // これ以降の処理は変更ありません
    const tablesResult = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND (name = 'mimi_notes' OR name = 'notes');"
    );
    if (!tablesResult[0]?.values?.[0]?.[0]) {
      db.close();
      throw new Error("メモのテーブルが見つかりませんでした。");
    }
    const tableName = tablesResult[0].values[0][0] as string;
    const result = db.exec(`SELECT * FROM "${tableName}"`);
    db.close();
    if (!result.length) return [];

    const rows = result[0].values;
    const columns = result[0].columns;

    const parseDateString = (dateStr: string | null | undefined): number => {
      if (!dateStr || typeof dateStr !== "string") return Date.now();
      const isoStr = dateStr.replace(" ", "T");
      const date = new Date(isoStr);
      return isNaN(date.getTime()) ? Date.now() : date.getTime();
    };

    const importedNotes = rows
      .map((row: any[]) => {
        const noteData: { [key: string]: any } = {};
        columns.forEach((col, i) => (noteData[col] = row[i]));

        const createdAt = parseDateString(noteData.creation_date);
        const updatedAt = parseDateString(noteData.update_date);

        const title = String(noteData.title || "");
        const text = String(noteData.text || "");
        let content = "";
        if (title && text && title !== text) {
          content = `<b>${title}</b><br><br>${text}`;
        } else {
          content = text || title;
        }

        return {
          id: String(noteData._id || createdAt),
          content: content,
          createdAt: createdAt,
          updatedAt: updatedAt,
          isPinned: noteData.ear === 1,
          color: "text-slate-800 dark:text-slate-200",
          font: "font-sans",
          fontSize: "text-lg",
        };
      })
      .filter(Boolean);

    return importedNotes;
  } catch (error) {
    console.error("ミミノートの解析中にエラーが発生しました:", error);
    throw error;
  }
}

// --- Icon Components (Memoized) ---
const RabbitIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M83,59 C83,75.5,68.5,89,50,89 C31.5,89,17,75.5,17,59 C17,42.5,31.5,29,50,29 C68.5,29,83,42.5,83,59Z" />
      <path d="M35,35 C28,15,40,12,45,30" />
      <path d="M65,35 C72,15,60,12,55,30" />
      <path d="M40,59 A 4,4 0 0,0 46,59" />
      <path d="M54,59 A 4,4 0 0,0 60,59" />
      <path d="M49,67 L51,67" />
      <path d="M46,72 Q 48,74 50,72 Q 52,74 54,72" />
    </g>
  </svg>
));
const ThemeIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    enableBackground="new 0 0 24 24"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8v16z" />{" "}
  </svg>
));
const PlusIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />{" "}
  </svg>
));
const SearchIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />{" "}
  </svg>
));
const BookmarkIcon = React.memo<{ className?: string; isFilled?: boolean }>(
  ({ className, isFilled }) => (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {" "}
      {isFilled ? (
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
      ) : (
        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
      )}{" "}
    </svg>
  )
);
const ChevronLeftIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />{" "}
  </svg>
));
const TrashIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />{" "}
  </svg>
));
const CogIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />{" "}
  </svg>
));
const InstallIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 15l-4-4h2.5V8h3v4H16l-4 4z" />{" "}
  </svg>
));
const DownloadIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />{" "}
  </svg>
));
const UploadIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />{" "}
  </svg>
));
const BoldIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />{" "}
  </svg>
));
const UnderlineIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />{" "}
  </svg>
));
const MicrophoneIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />{" "}
  </svg>
));
const BellIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />{" "}
  </svg>
));
const BellIconFilled = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />{" "}
  </svg>
));
const CheckIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />{" "}
  </svg>
));
const CloseIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />{" "}
  </svg>
));
const ShareIcon = React.memo<{ className?: string }>(({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    {" "}
    <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L16.04,7.15C16.56,7.62 17.24,7.92 18,7.92C19.66,7.92 21,6.58 21,5C21,3.42 19.66,2 18,2C16.34,2 15,3.42 15,5C15,5.24 15.04,5.47 15.09,5.7L7.96,9.85C7.44,9.38 6.76,9.08 6,9.08C4.34,9.08 3,10.42 3,12C3,13.58 4.34,14.92 6,14.92C6.76,14.92 7.44,14.62 7.96,14.15L15.09,18.3C15.04,18.53 15,18.76 15,19C15,20.58 16.34,22 18,22C19.66,22 21,20.58 21,19C21,17.42 19.66,16.08 18,16.08Z" />{" "}
  </svg>
));
const StrikethroughIcon = React.memo<{ className?: string }>(
  ({ className }) => (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {" "}
      <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />{" "}
    </svg>
  )
);

// --- うさぎボーダーコンポーネント ---
const RabbitBorder = React.memo<{ isDarkMode: boolean }>(({ isDarkMode }) => {
  const svgString = (color: string) =>
    `<svg width="40" height="24" viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg"><path d="M-2,20 C5,-5 15,-5 20,20 C25,-5 35,-5 42,20" stroke="${color}" fill="none" stroke-width="3" stroke-linecap="round"/></svg>`;
  const lightColor = "#fde08a"; // amber-200
  const darkColor = "#334155"; // slate-700
  const svgUrl = `url("data:image/svg+xml,${encodeURIComponent(
    svgString(isDarkMode ? darkColor : lightColor)
  )}")`;
  return (
    <div
      className="h-6 w-full flex-shrink-0"
      style={{
        backgroundImage: svgUrl,
        backgroundRepeat: "repeat-x",
        backgroundSize: "32px 20px",
        backgroundPosition: "center bottom",
      }}
      aria-hidden="true"
    />
  );
});

// --- Constants ---
const FONT_OPTIONS = {
  "font-sans": "デフォルト",
  "font-dela": "デラゴシック",
  "font-kiwi": "キウイ丸",
};
const FONT_SIZE_OPTIONS = {
  "text-sm": "小",
  "text-base": "中",
  "text-lg": "大",
  "text-xl": "特大",
};
const COLOR_OPTIONS = {
  "text-slate-800 dark:text-slate-200": "デフォルト",
  "text-rose-600 dark:text-rose-400": "ローズ",
  "text-blue-600 dark:text-blue-400": "ブルー",
  "text-green-600 dark:text-green-400": "グリーン",
  "text-yellow-600 dark:text-yellow-400": "イエロー",
  "text-purple-600 dark:text-purple-400": "パープル",
};
const COLOR_HEX_MAP_LIGHT: { [key: string]: string } = {
  "text-slate-800 dark:text-slate-200": "#1e293b",
  "text-rose-600 dark:text-rose-400": "#e11d48",
  "text-blue-600 dark:text-blue-400": "#2563eb",
  "text-green-600 dark:text-green-400": "#16a3a",
  "text-yellow-600 dark:text-yellow-400": "#ca8a04",
  "text-purple-600 dark:text-purple-400": "#9333ea",
};
const COLOR_HEX_MAP_DARK: { [key: string]: string } = {
  "text-slate-800 dark:text-slate-200": "#e2e8f0",
  "text-rose-600 dark:text-rose-400": "#fb7185",
  "text-blue-600 dark:text-blue-400": "#60a5fa",
  "text-green-600 dark:text-green-400": "#4ade80",
  "text-yellow-600 dark:text-yellow-400": "#facc15",
  "text-purple-600 dark:text-purple-400": "#c084fc",
};
const FONT_SIZE_COMMAND_MAP: { [key: string]: string } = {
  "text-sm": "2",
  "text-base": "3",
  "text-lg": "4",
  "text-xl": "5",
};

// --- Custom Hooks ---
const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [isStorageLoaded, setIsStorageLoaded] = useState(false); // ✅ NEW: State to track initial load
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effect for loading notes from localStorage on initial mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("nana-memo-notes");
      if (savedNotes) setNotes(JSON.parse(savedNotes));
    } catch (error) {
      console.error("Failed to load notes", error);
    }
    setIsStorageLoaded(true); // ✅ Mark storage as loaded
  }, []);

  // Effect for saving notes to localStorage whenever they change
  useEffect(() => {
    // ✅ FIX: Only save after the initial load from storage is complete.
    // This prevents overwriting storage with an empty array on first render
    // and correctly saves an empty array when the user deletes the last note.
    if (!isStorageLoaded) return;

    localStorage.setItem("nana-memo-notes", JSON.stringify(notes));
    setSaveStatus("saved");
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => {
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    };
  }, [notes, isStorageLoaded]); // Depend on isStorageLoaded as well

  const createNote = useCallback((startWithVoice = false): string => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      color: "text-slate-800 dark:text-slate-200",
      font: "font-sans",
      fontSize: "text-lg",
    };
    setNotes((prev) => [newNote, ...prev]);
    return newNote.id;
  }, []);

  const updateNote = useCallback(
    (id: string, updates: Partial<Omit<Note, "id" | "createdAt">>) => {
      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
        )
      );
    },
    []
  );

  const deleteNotesByIds = useCallback((ids: string[]) => {
    setNotes((prev) => prev.filter((note) => !ids.includes(note.id)));
  }, []);

  const replaceAllNotes = useCallback(
    (newNotes: React.SetStateAction<Note[]>) => {
      setNotes(newNotes);
    },
    []
  );

  return {
    notes,
    setNotes: replaceAllNotes,
    createNote,
    updateNote,
    deleteNotesByIds,
    saveStatus,
  };
};

// --- UI Components ---
const NoteItem = React.memo<{
  note: Note;
  isSelected: boolean;
  isSelectionMode: boolean;
  onClick: (id: string) => void;
  onPointerDown: (id: string) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
}>(
  ({
    note,
    isSelected,
    isSelectionMode,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
  }) => {
    const plainTextContent = useMemo(
      () => getPlainText(note.content) || "新規メモ",
      [note.content]
    );
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(note.id)}
        onPointerDown={() => onPointerDown(note.id)}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={(e) => onContextMenu(e, note.id)}
        className="relative flex w-full text-left rounded-lg shadow-md bg-white dark:bg-slate-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
      >
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 p-4 border-r border-slate-100 dark:border-slate-600">
          <span className="text-4xl font-bold text-rose-500 dark:text-rose-400 font-sans">
            {formatDay(note.updatedAt)}
          </span>
          <span className="text-base font-kiwi text-slate-600 dark:text-slate-300 mt-1">
            {formatTime(note.updatedAt)}
          </span>
        </div>
        <div className="flex-grow p-4 min-w-0 flex items-center">
          <p
            className={`whitespace-pre-wrap break-words line-clamp-4 ${
              note.font
            } ${note.color} ${note.fontSize || "text-lg"}`}
          >
            {plainTextContent}
          </p>
        </div>
        {note.isPinned && (
          <div className="absolute top-0 right-0 w-8 h-8">
            <div
              className="absolute top-0 right-0 w-0 h-0 border-8 border-solid border-transparent border-t-rose-400 dark:border-t-rose-500 border-r-rose-400 dark:border-r-rose-500"
              style={{ borderTopRightRadius: "0.5rem" }}
            ></div>
          </div>
        )}
        {isSelectionMode && (
          <div
            className={`absolute inset-0 rounded-lg transition-all pointer-events-none ${
              isSelected ? "ring-2 ring-rose-500 ring-inset" : ""
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

const DeleteConfirmationModal = React.memo<{
  confirmation: DeleteConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}>(({ confirmation, onConfirm, onCancel }) => {
  if (!confirmation) return null;
  const { ids, preview } = confirmation;
  const itemCount = ids.length;
  const title = itemCount > 1 ? `${itemCount}件のメモを削除` : "メモの削除";
  const message =
    itemCount > 1
      ? "本当にこれらのメモを削除しますか？この操作は取り消せません。"
      : "本当にこのメモを削除しますか？";
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirmation-title"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-confirmation-title"
          className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-2"
        >
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4 text-center">
          {message}
        </p>
        {preview && (
          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md mb-6 max-h-24 overflow-y-auto">
            <p className="text-sm text-slate-700 dark:text-slate-300 break-words">
              {preview}
            </p>
          </div>
        )}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-slate-400"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-red-500"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
});

// --- Main App Component ---
export default function App() {
  const {
    notes,
    setNotes,
    createNote,
    updateNote,
    deleteNotesByIds,
    saveStatus,
  } = useNotes();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(
    new Set()
  );
  const [toastMessage, setToastMessage] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<File | null>(
    null
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [pinnedToNotificationIds, setPinnedToNotificationIds] = useState<
    Set<string>
  >(new Set());
  const [showBackupBadge, setShowBackupBadge] = useState(false);
  const [sortByPin, setSortByPin] = useState(true);
  const [startVoiceOnMount, setStartVoiceOnMount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsContainerRef = useRef<HTMLDivElement>(null);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId),
    [notes, activeNoteId]
  );
  const activeNoteRef = useRef(activeNote);
  activeNoteRef.current = activeNote;

  useEffect(() => {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("fade-out");
      setTimeout(() => loadingOverlay.remove(), 500);
    }
  }, []);

  useEffect(() => {
    const lastBackupTime = parseInt(
      localStorage.getItem("nana-memo-last-backup-timestamp") || "0",
      10
    );
    const needsBackup = Date.now() - lastBackupTime > 7 * 24 * 60 * 60 * 1000;
    setShowBackupBadge(needsBackup);
  }, [notes]);

  useEffect(() => {
    try {
      const savedPinnedIds = localStorage.getItem(
        "nana-memo-pinned-notification-ids"
      );
      if (savedPinnedIds)
        setPinnedToNotificationIds(new Set(JSON.parse(savedPinnedIds)));
    } catch (error) {
      console.error("Failed to load pinned notification IDs", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nana-memo-pinned-notification-ids",
      JSON.stringify(Array.from(pinnedToNotificationIds))
    );
  }, [pinnedToNotificationIds]);

  useEffect(() => {
    if (!("serviceWorker" in navigator && "Notification" in window)) return;
    const syncNotifications = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications();
        setPinnedToNotificationIds(
          new Set(notifications.map((n) => n.data?.noteId).filter(Boolean))
        );
      } catch (error) {
        console.error("Failed to sync notifications:", error);
      }
    };
    const timer = setTimeout(syncNotifications, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  useEffect(() => {
    if (notes.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get("noteId");
    if (noteId && notes.some((n) => n.id === noteId)) {
      setActiveNoteId(noteId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [notes]);

  // ✅ BUG FIX: Handle messages from service worker (e.g., notification clicks)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_NOTE" && event.data.noteId) {
        if (notes.some((note) => note.id === event.data.noteId)) {
          setActiveNoteId(event.data.noteId);
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSWMessage);
    };
  }, [notes]);

  // ✅ NEW: Handle clicks outside the settings menu to close it.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the click is outside the settings container, close the settings menu.
      if (
        settingsContainerRef.current &&
        !settingsContainerRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    // Add the event listener when the settings menu is shown.
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Remove the event listener on cleanup or when the menu is hidden.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]); // Re-run the effect when `showSettings` changes.

  const showToast = useCallback((message: string, duration: number = 3000) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), duration);
  }, []);

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition)
      return showToast("音声認識はこのブラウザではサポートされていません。");

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "ja-JP";
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed")
          showToast("マイクの使用が許可されていません");
        setIsListening(false);
      };
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const finalTranscript = Array.from(event.results)
          .slice(event.resultIndex)
          .map((result) => result[0].transcript)
          .join("");

        if (finalTranscript && activeNoteRef.current) {
          const currentNote = activeNoteRef.current;
          const separator =
            getPlainText(currentNote.content).trim().length > 0 ? "\n" : "";
          updateNote(currentNote.id, {
            content: currentNote.content + separator + finalTranscript,
          });
        }
      };
      recognitionRef.current = recognition;
    }

    if (isListening) recognitionRef.current.stop();
    else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition", e);
      }
    }
  }, [isListening, showToast, updateNote]);

  // ✅ OPTIMIZATION: More efficient sorting and filtering logic.
  const filteredNotes = useMemo(() => {
    const sortedNotes = [...notes].sort((a, b) => {
      if (sortByPin) {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return b.updatedAt - a.updatedAt;
    });

    if (!searchTerm) {
      return sortedNotes;
    }

    return sortedNotes.filter((n) =>
      getPlainText(n.content).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notes, searchTerm, sortByPin]);

  const handleCreateNote = useCallback(
    (startWithVoice = false) => {
      const newNoteId = createNote(startWithVoice);
      setActiveNoteId(newNoteId);
      if (startWithVoice) setStartVoiceOnMount(true);
    },
    [createNote]
  );

  const handleCloseEditor = useCallback(() => {
    if (activeNote && getPlainText(activeNote.content).trim() === "") {
      deleteNotesByIds([activeNote.id]);
    }
    setActiveNoteId(null);
  }, [activeNote, deleteNotesByIds]);

  const unpinFromNotification = useCallback(
    async (noteId: string, showToastOnSuccess = true) => {
      setPinnedToNotificationIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications({
          tag: `note-${noteId}`,
        });
        notifications.forEach((notification) => notification.close());
        if (showToastOnSuccess) showToast("通知の設定を解除しました。", 2000);
      } catch (error) {
        console.error("Failed to unpin notification:", error);
        setPinnedToNotificationIds((prev) => new Set(prev).add(noteId));
        if (showToastOnSuccess) showToast("通知の解除に失敗しました。");
      }
    },
    [showToast]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;
    const { ids } = deleteConfirmation;
    deleteNotesByIds(ids);
    ids.forEach((id) => unpinFromNotification(id, false));
    if (ids.includes(activeNoteId || "")) setActiveNoteId(null);
    setDeleteConfirmation(null);
    showToast(`${ids.length}件のメモを削除しました。`, 2000);
  }, [
    deleteConfirmation,
    activeNoteId,
    deleteNotesByIds,
    unpinFromNotification,
    showToast,
  ]);

  const handleBackup = useCallback(() => {
    const formattedDate = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const filename = `nanamemo_backup_${formattedDate}.json`;
    const dataStr = JSON.stringify(notes, null, 2);
    const linkElement = document.createElement("a");
    linkElement.href =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    linkElement.download = filename;
    linkElement.click();
    localStorage.setItem(
      "nana-memo-last-backup-timestamp",
      Date.now().toString()
    );
    setShowBackupBadge(false);
    setShowSettings(false);
    showToast("バックアップファイルを保存しました。");
  }, [notes, showToast]);

  const handleRestore = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setShowRestoreConfirm(file);
        setShowSettings(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const proceedWithRestore = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setShowRestoreConfirm(null);
      showToast("バックアップファイルを解析中...", 10000); // Give a long timeout for the toast

      try {
        let importedNotes: Note[];
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(".json")) {
          const parsedData = JSON.parse(await file.text());
          if (
            Array.isArray(parsedData) &&
            parsedData.length > 0 &&
            "content" in parsedData[0]
          ) {
            importedNotes = parsedData.map((n: any) => ({
              ...n,
              isPinned: n.isPinned || false,
              color: n.color || "text-slate-800 dark:text-slate-200",
              font: n.font || "font-sans",
              fontSize: n.fontSize || "text-lg",
            }));
          } else {
            throw new Error("無効なJSONファイル形式です。");
          }
        } else if (fileName.endsWith(".mimibk") || fileName.endsWith(".db")) {
          // ✅ REFACTOR: Worker logic is removed. Call main thread function directly.
          importedNotes = await parseMimiNoteBackup(file);
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

        showToast(`${importedNotes.length}件のメモを復元・追加しました。`);
      } catch (error: any) {
        let errorMessage = "復元に失敗しました。";
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError && parsedError.message) {
            errorMessage += `: ${parsedError.message}`;
          } else {
            errorMessage += `: ${error.message}`;
          }
        } catch (e) {
          errorMessage += `: ${error.message}`;
        }
        showToast(errorMessage, 5000);
        console.error("Failed to restore notes:", error);
      }
    },
    [setNotes, showToast]
  );

  if (activeNote) {
    return (
      <>
        <NoteEditor
          note={activeNote}
          isDarkMode={isDarkMode}
          pinnedToNotificationIds={pinnedToNotificationIds}
          saveStatus={saveStatus}
          isListening={isListening}
          onUpdate={updateNote}
          onClose={handleCloseEditor}
          onDelete={(id) =>
            setDeleteConfirmation({
              ids: [id],
              preview: getPlainText(activeNote.content),
            })
          }
          setPinnedToNotificationIds={setPinnedToNotificationIds}
          showToast={showToast}
          onVoiceInput={handleVoiceInput}
          startVoiceOnMount={startVoiceOnMount}
          setStartVoiceOnMount={setStartVoiceOnMount}
        />
        <DeleteConfirmationModal
          confirmation={deleteConfirmation}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirmation(null)}
        />
      </>
    );
  }

  return (
    <>
      <NoteList
        notes={filteredNotes}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showSearchBar={showSearchBar}
        setShowSearchBar={setShowSearchBar}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        installPrompt={installPrompt}
        handleBackup={handleBackup}
        handleRestore={handleRestore}
        fileInputRef={fileInputRef}
        settingsContainerRef={settingsContainerRef}
        showBackupBadge={showBackupBadge}
        sortByPin={sortByPin}
        setSortByPin={setSortByPin}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        selectedNoteIds={selectedNoteIds}
        setSelectedNoteIds={setSelectedNoteIds}
        onDelete={(ids, preview) => setDeleteConfirmation({ ids, preview })}
        showToast={showToast}
        onUpdateNotes={setNotes}
        onSetActiveNoteId={setActiveNoteId}
        longPressTimer={longPressTimer}
        longPressTriggered={longPressTriggered}
        createNote={handleCreateNote}
      />
      <DeleteConfirmationModal
        confirmation={deleteConfirmation}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmation(null)}
      />
      {showRestoreConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRestoreConfirm(null)}
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
                onClick={() => setShowRestoreConfirm(null)}
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
      <div
        className={`fixed top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 transition-opacity duration-300 ${
          toastMessage ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {toastMessage}
      </div>
    </>
  );
}

// --- NoteList Component ---
type NoteListProps = {
  notes: Note[];
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  showSearchBar: boolean;
  setShowSearchBar: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  installPrompt: BeforeInstallPromptEvent | null;
  handleBackup: () => void;
  handleRestore: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  settingsContainerRef: React.RefObject<HTMLDivElement>;
  showBackupBadge: boolean;
  sortByPin: boolean;
  setSortByPin: React.Dispatch<React.SetStateAction<boolean>>;
  isSelectionMode: boolean;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedNoteIds: Set<string>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onDelete: (ids: string[], preview?: string) => void;
  showToast: (message: string, duration?: number) => void;
  onUpdateNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  onSetActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  longPressTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  longPressTriggered: React.MutableRefObject<boolean>;
  createNote: (startWithVoice?: boolean) => void;
};
const NoteList = React.memo<NoteListProps>(
  ({
    notes,
    isDarkMode,
    setIsDarkMode,
    searchTerm,
    setSearchTerm,
    showSearchBar,
    setShowSearchBar,
    showSettings,
    setShowSettings,
    installPrompt,
    handleBackup,
    handleRestore,
    fileInputRef,
    settingsContainerRef,
    showBackupBadge,
    sortByPin,
    setSortByPin,
    isSelectionMode,
    setIsSelectionMode,
    selectedNoteIds,
    setSelectedNoteIds,
    onDelete,
    showToast,
    onUpdateNotes,
    onSetActiveNoteId,
    longPressTimer,
    longPressTriggered,
    createNote,
  }) => {
    const exitSelectionMode = useCallback(() => {
      setIsSelectionMode(false);
      setSelectedNoteIds(new Set());
    }, [setIsSelectionMode, setSelectedNoteIds]);
    const toggleNoteSelection = useCallback(
      (noteId: string) => {
        const newSelection = new Set(selectedNoteIds);
        newSelection.has(noteId)
          ? newSelection.delete(noteId)
          : newSelection.add(noteId);
        newSelection.size === 0
          ? exitSelectionMode()
          : setSelectedNoteIds(newSelection);
      },
      [selectedNoteIds, exitSelectionMode, setSelectedNoteIds]
    );
    const handlePointerDown = useCallback(
      (noteId: string) => {
        longPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
          if (!isSelectionMode) setIsSelectionMode(true);
          setSelectedNoteIds((prev: Set<string>) => new Set(prev).add(noteId));
          longPressTriggered.current = true;
        }, 500);
      },
      [
        isSelectionMode,
        setIsSelectionMode,
        setSelectedNoteIds,
        longPressTimer,
        longPressTriggered,
      ]
    );
    const handlePointerUp = useCallback(() => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, [longPressTimer]);
    const handleClick = useCallback(
      (noteId: string) => {
        if (longPressTriggered.current) return;
        isSelectionMode
          ? toggleNoteSelection(noteId)
          : onSetActiveNoteId(noteId);
      },
      [
        isSelectionMode,
        toggleNoteSelection,
        onSetActiveNoteId,
        longPressTriggered,
      ]
    );
    const handleContextMenu = useCallback(
      (e: React.MouseEvent, noteId: string) => {
        e.preventDefault();
        if (!isSelectionMode) setIsSelectionMode(true);
        setSelectedNoteIds((prev: Set<string>) => new Set(prev).add(noteId));
      },
      [isSelectionMode, setIsSelectionMode, setSelectedNoteIds]
    );
    const confirmBulkDelete = useCallback(() => {
      onDelete(Array.from(selectedNoteIds));
      exitSelectionMode();
    }, [onDelete, selectedNoteIds, exitSelectionMode]);

    const handleBulkPin = useCallback(() => {
      const shouldPin = notes.some(
        (note: Note) => selectedNoteIds.has(note.id) && !note.isPinned
      );
      if (shouldPin)
        localStorage.setItem("nana-memo-new-pin-since-backup", "true");
      onUpdateNotes((currentNotes: Note[]) =>
        currentNotes.map((note) =>
          selectedNoteIds.has(note.id)
            ? { ...note, isPinned: shouldPin, updatedAt: Date.now() }
            : note
        )
      );
      exitSelectionMode();
    }, [notes, selectedNoteIds, onUpdateNotes, exitSelectionMode]);

    const handleInstallClick = useCallback(() => {
      if (!installPrompt) return;
      installPrompt.prompt();
      installPrompt.userChoice.then(() => setShowSettings(false));
    }, [installPrompt]);

    const currentMonthNoteCount = useMemo(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      return notes.filter((note: Note) => {
        const noteDate = new Date(note.updatedAt);
        return noteDate.getFullYear() === year && noteDate.getMonth() === month;
      }).length;
    }, [notes]);

    return (
      <div className="flex flex-col h-screen bg-amber-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
        <header className="flex items-center justify-between p-4 border-b border-amber-200 dark:border-slate-700">
          {isSelectionMode ? (
            <>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exitSelectionMode}
                  className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
                <span className="font-bold text-lg text-slate-900 dark:text-white">
                  {selectedNoteIds.size}件選択中
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkPin}
                  className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <BookmarkIcon className="w-6 h-6" isFilled={true} />
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <TrashIcon className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <RabbitIcon className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                <h1 className="text-2xl font-dela text-rose-500 dark:text-rose-400">
                  nanamemo
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSortByPin((prev: boolean) => !prev)}
                  className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${
                    sortByPin
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                  title={
                    sortByPin ? "ピン留め優先ソート中" : "更新日時順ソート中"
                  }
                >
                  <BookmarkIcon className="w-6 h-6" isFilled={true} />
                </button>
                <button
                  onClick={() => {
                    if (showSearchBar) setSearchTerm("");
                    setShowSearchBar(!showSearchBar);
                  }}
                  className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <SearchIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ThemeIcon className="w-6 h-6 text-slate-600 dark:text-yellow-400" />
                </button>
                <div className="relative" ref={settingsContainerRef}>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="relative p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <CogIcon className="w-6 h-6" />
                    {showBackupBadge && (
                      <span className="absolute top-1 right-1 block w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-amber-50 dark:ring-slate-800"></span>
                    )}
                  </button>
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-10">
                      {installPrompt && (
                        <button
                          onClick={handleInstallClick}
                          className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <InstallIcon className="w-4 h-4" />
                          <span>アプリをインストール</span>
                        </button>
                      )}
                      <button
                        onClick={handleBackup}
                        className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        <span>今すぐバックアップ</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <UploadIcon className="w-4 h-4" />
                        <span>復元</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleRestore}
                        className="hidden"
                        accept=".json,.mimibk,.db"
                      />
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                      <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                        ヒント:
                        Safariでは「共有」→「ホーム画面に追加」でインストールできます。
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>
        {showSearchBar ? (
          <div className="p-4 border-b border-amber-200 dark:border-slate-700">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="メモを検索..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-amber-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
                autoFocus
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-baseline px-4 pt-2 text-slate-500 dark:text-slate-400">
              <h2 className="text-2xl font-kiwi font-bold">
                {new Date().getFullYear()} /{" "}
                {String(new Date().getMonth() + 1).padStart(2, "0")}
              </h2>
              <span className="text-sm font-medium">
                {currentMonthNoteCount}件のメモ
              </span>
            </div>
            <RabbitBorder isDarkMode={isDarkMode} />
          </>
        )}
        <main className="flex-grow p-4 overflow-y-auto">
          {notes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {notes.map((note: Note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteIds.has(note.id)}
                  isSelectionMode={isSelectionMode}
                  onClick={handleClick}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <RabbitIcon className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-400 dark:text-slate-500">
                {searchTerm ? "メモが見つかりません。" : "メモメモ、書き書き！"}
              </p>
            </div>
          )}
        </main>
        {!isSelectionMode && (
          <footer className="flex-shrink-0 p-4 border-t border-amber-200 dark:border-slate-700 bg-amber-50 dark:bg-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={() => createNote()}
                className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-amber-100 dark:bg-slate-700 hover:bg-amber-200/50 dark:hover:bg-slate-600/50 transition-colors"
              >
                <PlusIcon className="w-8 h-8 text-slate-600 dark:text-slate-200" />
              </button>
              <button
                onClick={() => createNote()}
                className="flex-grow h-16 text-left px-6 rounded-full bg-amber-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-amber-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 transition-colors text-lg"
              >
                {" "}
                &emsp;&emsp;メモを入力...
              </button>
              <button
                onClick={() => createNote(true)}
                className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-amber-100 dark:bg-slate-700 hover:bg-amber-200/50 dark:hover:bg-slate-600/50 transition-colors"
              >
                <MicrophoneIcon className="w-8 h-8 text-slate-600 dark:text-slate-200" />
              </button>
            </div>
          </footer>
        )}
      </div>
    );
  }
);

// --- NoteEditor Component ---
type NoteEditorProps = {
  note: Note;
  isDarkMode: boolean;
  pinnedToNotificationIds: Set<string>;
  setPinnedToNotificationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  saveStatus: "idle" | "saved";
  isListening: boolean;
  onUpdate: (
    id: string,
    updates: Partial<Omit<Note, "id" | "createdAt">>
  ) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  showToast: (message: string, duration?: number) => void;
  onVoiceInput: () => void;
  startVoiceOnMount: boolean;
  setStartVoiceOnMount: React.Dispatch<React.SetStateAction<boolean>>;
};
const NoteEditor = React.memo<NoteEditorProps>(
  ({
    note,
    isDarkMode,
    pinnedToNotificationIds,
    setPinnedToNotificationIds,
    saveStatus,
    isListening,
    onUpdate,
    onClose,
    onDelete,
    showToast,
    onVoiceInput,
    startVoiceOnMount,
    setStartVoiceOnMount,
  }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRangeRef = useRef<Range | null>(null);

    const saveSelection = useCallback(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          selectionRangeRef.current = range.cloneRange();
        }
      }
    }, []);

    useEffect(() => {
      document.addEventListener("selectionchange", saveSelection);
      return () =>
        document.removeEventListener("selectionchange", saveSelection);
    }, [saveSelection]);

    // ✅ OPTIMIZATION: More robust effect handling for contentEditable.
    // This prevents potential loops and separates concerns for better readability.
    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = note.content;
      }
      // Only run when switching to a different note.
    }, [note.id]);

    useEffect(() => {
      if (startVoiceOnMount && editorRef.current) {
        editorRef.current.focus();
        onVoiceInput();
        setStartVoiceOnMount(false);
      }
    }, [startVoiceOnMount, onVoiceInput, setStartVoiceOnMount]);

    useEffect(() => {
      // This only needs to be set once.
      document.execCommand("styleWithCSS", false, "true");
    }, []);

    const applyStyle = useCallback(
      (command: string, value?: string) => {
        if (
          selectionRangeRef.current &&
          selectionRangeRef.current.toString().length > 0
        ) {
          editorRef.current?.focus();
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(selectionRangeRef.current);
          }
          document.execCommand(command, false, value);
          saveSelection();
          editorRef.current?.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: true })
          );
        }
      },
      [saveSelection]
    );

    const applyColor = useCallback(
      (colorClass: string) => {
        if (
          selectionRangeRef.current &&
          selectionRangeRef.current.toString().length > 0
        ) {
          applyStyle(
            "foreColor",
            (isDarkMode ? COLOR_HEX_MAP_DARK : COLOR_HEX_MAP_LIGHT)[colorClass]
          );
        } else {
          onUpdate(note.id, { color: colorClass });
        }
      },
      [applyStyle, isDarkMode, note.id, onUpdate]
    );

    const applyFontSize = useCallback(
      (sizeClass: string) => {
        if (
          selectionRangeRef.current &&
          selectionRangeRef.current.toString().length > 0
        ) {
          applyStyle("fontSize", FONT_SIZE_COMMAND_MAP[sizeClass]);
        } else {
          onUpdate(note.id, { fontSize: sizeClass });
        }
      },
      [applyStyle, note.id, onUpdate]
    );

    const handleToggleNotificationPin = useCallback(async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window))
        return showToast("通知機能はこのブラウザではサポートされていません。");
      if (Notification.permission === "denied")
        return showToast(
          "通知がブロックされています。ブラウザの設定を変更してください。"
        );

      const isPinned = pinnedToNotificationIds.has(note.id);
      if (isPinned) {
        setPinnedToNotificationIds((prev: Set<string>) => {
          const newSet = new Set(prev);
          newSet.delete(note.id);
          return newSet;
        });
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications({
          tag: `note-${note.id}`,
        });
        notifications.forEach((n) => n.close());
        showToast("通知の設定を解除しました。", 2000);
      } else {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setPinnedToNotificationIds((prev: Set<string>) =>
            new Set(prev).add(note.id)
          );
          const plainText = (getPlainText(note.content) || "").trim();
          const lines = plainText.split("\n");
          const registration = await navigator.serviceWorker.ready;
          registration.active?.postMessage({
            type: "SHOW_NOTE_NOTIFICATION",
            payload: {
              title: lines[0]?.substring(0, 50) || "nana memo",
              body: lines.slice(1).join("\n").substring(0, 100) || "メモを表示",
              noteId: note.id,
            },
          });
          showToast("通知に固定しました", 2000);
        } else {
          showToast("通知が許可されませんでした。");
        }
      }
    }, [note, pinnedToNotificationIds, setPinnedToNotificationIds, showToast]);

    const handleShare = useCallback(async () => {
      const textToShare = getPlainText(note.content);
      if (!textToShare) return showToast("共有する内容がありません。", 2000);
      try {
        if (navigator.share) {
          await navigator.share({ title: "nanamemo", text: textToShare });
        } else {
          await navigator.clipboard.writeText(textToShare);
          showToast("クリップボードにコピーしました", 2000);
        }
      } catch (error) {
        showToast("共有/コピーに失敗しました。", 2000);
      }
    }, [note.content, showToast]);

    const handlePinToggle = useCallback(() => {
      if (!note.isPinned)
        localStorage.setItem("nana-memo-new-pin-since-backup", "true");
      onUpdate(note.id, { isPinned: !note.isPinned });
    }, [note, onUpdate]);

    return (
      <div className="flex flex-col h-screen bg-amber-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
        <header className="relative flex-shrink-0 flex items-center justify-between p-2 border-b border-amber-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <div
              className={`transition-opacity duration-500 pointer-events-none ${
                saveStatus === "saved" ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex items-center space-x-1 text-sm text-slate-400 dark:text-slate-500">
                <CheckIcon className="w-4 h-4" />
                <span>保存しました</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleNotificationPin}
              className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${
                pinnedToNotificationIds.has(note.id)
                  ? "text-rose-500 dark:text-rose-400"
                  : ""
              }`}
            >
              {pinnedToNotificationIds.has(note.id) ? (
                <BellIconFilled className="w-5 h-5" />
              ) : (
                <BellIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handlePinToggle}
              className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${
                note.isPinned ? "text-rose-500" : ""
              }`}
            >
              <BookmarkIcon className="w-5 h-5" isFilled={note.isPinned} />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="ml-2 px-3 py-1.5 rounded-full text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-slate-900 focus:ring-rose-500"
            >
              完了
            </button>
          </div>
        </header>
        <div className="flex-shrink-0 flex flex-col items-center justify-center p-2 space-y-2">
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2">
            <select
              value={note.font}
              onChange={(e) => onUpdate(note.id, { font: e.target.value })}
              className="h-8 px-2 text-sm rounded-full bg-amber-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 border-transparent appearance-none"
            >
              {Object.entries(FONT_OPTIONS).map(([fontClass, fontName]) => (
                <option key={fontClass} value={fontClass}>
                  {fontName}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-1 bg-amber-100 dark:bg-slate-700 rounded-full p-0.5">
              {Object.entries(FONT_SIZE_OPTIONS).map(
                ([sizeClass, sizeName]) => (
                  <button
                    key={sizeClass}
                    onClick={() => applyFontSize(sizeClass)}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`px-2 py-0.5 text-sm rounded-full transition-colors ${
                      note.fontSize === sizeClass
                        ? "bg-white dark:bg-slate-500 shadow-sm"
                        : "hover:bg-amber-200/50 dark:hover:bg-slate-600/50"
                    }`}
                  >
                    {sizeName}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => document.execCommand("bold")}
                className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700"
              >
                <BoldIcon className="w-5 h-5" />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => document.execCommand("underline")}
                className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700"
              >
                <UnderlineIcon className="w-5 h-5" />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => document.execCommand("strikeThrough")}
                className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700"
              >
                <StrikethroughIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              {Object.entries(COLOR_OPTIONS).map(([colorClass, colorName]) => (
                <button
                  key={colorClass}
                  title={colorName}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyColor(colorClass)}
                  className="w-6 h-6 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-slate-900 focus:ring-rose-500 flex items-center justify-center"
                  style={{
                    backgroundColor: (isDarkMode
                      ? COLOR_HEX_MAP_DARK
                      : COLOR_HEX_MAP_LIGHT)[colorClass],
                  }}
                >
                  {note.color === colorClass && (
                    <CheckIcon className="w-4 h-4 text-white mix-blend-difference" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <RabbitBorder isDarkMode={isDarkMode} />
        <main className="flex-grow p-4 md:p-6 overflow-y-auto">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) =>
              onUpdate(note.id, { content: e.currentTarget.innerHTML })
            }
            className={`w-full h-full bg-transparent resize-none focus:outline-none ${
              note.font
            } ${note.color} ${note.fontSize || "text-lg"}`}
            data-placeholder="メモを入力..."
          />
        </main>
        <button
          onClick={onVoiceInput}
          className={`fixed bottom-8 right-6 z-10 w-16 h-16 rounded-full bg-rose-500 text-white shadow-xl flex items-center justify-center transform transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-amber-50 dark:focus:ring-offset-slate-900 focus:ring-rose-500 ${
            isListening ? "animate-pulse ring-4 ring-rose-400" : ""
          }`}
        >
          <MicrophoneIcon className="w-8 h-8" />
        </button>
      </div>
    );
  }
);
