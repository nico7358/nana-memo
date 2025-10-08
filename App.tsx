

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// --- Type Definitions ---
type Note = {
  id: string;
  content: string; // Can now contain HTML
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  color: string;
  font: string;
  fontSize: string;
};

type ViewMode = 'list' | 'calendar';

// --- Helper Functions ---
const formatDetailedDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatDay = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('ja-JP', { day: '2-digit' }).replace('日', '');
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

const getPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};


// --- Icon Components ---
const RabbitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#neon-glow)" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Head */}
        <path d="M83,59 C83,75.5,68.5,89,50,89 C31.5,89,17,75.5,17,59 C17,42.5,31.5,29,50,29 C68.5,29,83,42.5,83,59Z" />
        {/* Ears */}
        <path d="M35,35 C28,15,40,12,45,30" />
        <path d="M65,35 C72,15,60,12,55,30" />
        {/* Calm Eyes */}
        <path d="M40,59 A 4,4 0 0,0 46,59" />
        <path d="M54,59 A 4,4 0 0,0 60,59" />
        {/* Nose */}
        <path d="M49,67 L51,67" />
        {/* Gentle Smile */}
        <path d="M46,72 Q 48,74 50,72 Q 52,74 54,72" />
      </g>
    </svg>
);
const ThemeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8v16z"/>
  </svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>;
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>;
const BookmarkIcon: React.FC<{ className?: string, isFilled?: boolean }> = ({ className, isFilled }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    {isFilled 
      ? <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
      : <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
    }
  </svg>
);
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>;
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>;
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>;
const CogIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>;
const InstallIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 15l-4-4h2.5V8h3v4H16l-4 4z"/></svg>;
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>;
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>;
const BoldIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>;
const UnderlineIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>;
const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>;
const BellIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>;
const BellIconFilled: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>;
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const ListIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>;
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>;
const ShareIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L16.04,7.15C16.56,7.62 17.24,7.92 18,7.92C19.66,7.92 21,6.58 21,5C21,3.42 19.66,2 18,2C16.34,2 15,3.42 15,5C15,5.24 15.04,5.47 15.09,5.7L7.96,9.85C7.44,9.38 6.76,9.08 6,9.08C4.34,9.08 3,10.42 3,12C3,13.58 4.34,14.92 6,14.92C6.76,14.92 7.44,14.62 7.96,14.15L15.09,18.3C15.04,18.53 15,18.76 15,19C15,20.58 16.34,22 18,22C19.66,22 21,20.58 21,19C21,17.42 19.66,16.08 18,16.08Z" /></svg>;
const StrikethroughIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>;

// --- うさぎボーダーコンポーネント ---
const RabbitBorder: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  // ぴょんぴょん跳ねるうさぎの耳をイメージした、より可愛いボーダー
  const svgString = (color: string) => `
    <svg width="40" height="24" viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M-2,20 C5,-5 15,-5 20,20 C25,-5 35,-5 42,20" stroke="${color}" fill="none" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  // 元のボーダー色に合わせる
  const lightColor = '#fde08a'; // amber-200
  const darkColor = '#334155';  // slate-700

  const svgUrlLight = `url("data:image/svg+xml,${encodeURIComponent(svgString(lightColor))}")`;
  const svgUrlDark = `url("data:image/svg+xml,${encodeURIComponent(svgString(darkColor))}")`;

  return (
    <div
      className="h-6 w-full flex-shrink-0" // 高さを少し大きく
      style={{
        backgroundImage: isDarkMode ? svgUrlDark : svgUrlLight,
        backgroundRepeat: 'repeat-x',
        backgroundSize: '32px 20px', // サイズを調整して密度と見た目を改善
        backgroundPosition: 'center bottom', // 下端に合わせる
      }}
      aria-hidden="true" // 装飾的な要素なのでスクリーンリーダーから隠す
    />
  );
};


const FONT_OPTIONS = {
  'font-sans': 'デフォルト',
  'font-syuku': 'しゅく',
  'font-kaisei': 'かいせい',
  'font-dela': 'デラゴシック',
  'font-hachi': 'はちまるポップ',
  'font-kiwi': 'キウイ丸',
  'font-dot': 'ドット',
};

const FONT_SIZE_OPTIONS = {
  'text-sm': '小',
  'text-base': '中',
  'text-lg': '大',
  'text-xl': '特大',
};

const COLOR_OPTIONS = {
  'text-slate-800 dark:text-slate-200': 'デフォルト',
  'text-rose-600 dark:text-rose-400': 'ローズ',
  'text-blue-600 dark:text-blue-400': 'ブルー',
  'text-green-600 dark:text-green-400': 'グリーン',
  'text-yellow-600 dark:text-yellow-400': 'イエロー',
  'text-purple-600 dark:text-purple-400': 'パープル',
};

// Maps for rich text editing commands
const COLOR_HEX_MAP_LIGHT: { [key: string]: string } = {
  'text-slate-800 dark:text-slate-200': '#1e293b', // slate-800
  'text-rose-600 dark:text-rose-400': '#e11d48',   // rose-600
  'text-blue-600 dark:text-blue-400': '#2563eb',   // blue-600
  'text-green-600 dark:text-green-400': '#16a34a', // green-600
  'text-yellow-600 dark:text-yellow-400': '#ca8a04',// yellow-600
  'text-purple-600 dark:text-purple-400': '#9333ea',// purple-600
};

const COLOR_HEX_MAP_DARK: { [key: string]: string } = {
  'text-slate-800 dark:text-slate-200': '#e2e8f0', // slate-200
  'text-rose-600 dark:text-rose-400': '#fb7185',   // rose-400
  'text-blue-600 dark:text-blue-400': '#60a5fa',   // blue-400
  'text-green-600 dark:text-green-400': '#4ade80', // green-400
  'text-yellow-600 dark:text-yellow-400': '#facc15',// yellow-400
  'text-purple-600 dark:text-purple-400': '#c084fc',// purple-400
};

const FONT_SIZE_COMMAND_MAP: { [key: string]: string } = {
  'text-sm': '2',   // 10pt
  'text-base': '3', // 12pt
  'text-lg': '4',   // 14pt
  'text-xl': '5',   // 18pt
};


// --- Main App Component ---
export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [toastMessage, setToastMessage] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<File | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [pinnedToNotificationIds, setPinnedToNotificationIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);
  const isInitialPinnedIdsMount = useRef(true);
  const selectionRangeRef = useRef<Range | null>(null);

  // Load notes from localStorage on initial render
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('nana-memo-notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error("Failed to load notes from localStorage", error);
    }
  }, []);

  // Save notes to localStorage whenever they change (Auto-save)
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return; // Don't run on first render
    }
    
    try {
      localStorage.setItem('nana-memo-notes', JSON.stringify(notes));
      setSaveStatus('saved');
      if (saveStatusTimer.current) {
        clearTimeout(saveStatusTimer.current);
      }
      saveStatusTimer.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Failed to save notes to localStorage", error);
    }

    return () => {
      if (saveStatusTimer.current) {
        clearTimeout(saveStatusTimer.current);
      }
    };
  }, [notes]);

  // --- Notification Pinning Logic ---
  // Load pinned notification IDs from localStorage
  useEffect(() => {
    try {
      const savedPinnedIds = localStorage.getItem('nana-memo-pinned-notification-ids');
      if (savedPinnedIds) {
        setPinnedToNotificationIds(new Set(JSON.parse(savedPinnedIds)));
      }
    } catch (error) {
      console.error("Failed to load pinned notification IDs from localStorage", error);
    }
  }, []);

  // Save pinned notification IDs to localStorage
  useEffect(() => {
    if (isInitialPinnedIdsMount.current) {
      isInitialPinnedIdsMount.current = false;
      return; // Don't save on first render
    }
    try {
      localStorage.setItem('nana-memo-pinned-notification-ids', JSON.stringify(Array.from(pinnedToNotificationIds)));
    } catch (error) {
      console.error("Failed to save pinned notification IDs to localStorage", error);
    }
  }, [pinnedToNotificationIds]);

  // Sync notifications with state on app load
  useEffect(() => {
    const syncNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications();
        const activeNotificationIds = new Set(
          notifications.map(n => n.data?.noteId).filter(Boolean)
        );
        setPinnedToNotificationIds(activeNotificationIds);
      } catch (error) {
        console.error("Failed to sync notifications on load:", error);
      }
    };
    
    const timer = setTimeout(syncNotifications, 500);
    return () => clearTimeout(timer);
  }, []);


  // Handle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Focus editor when a note is opened
  useEffect(() => {
    if (activeNoteId && editorRef.current) {
        editorRef.current.focus();
    }
    // Enable CSS styling for execCommand to use <span> instead of <font> tags.
    // This is a deprecated feature but the simplest way for basic rich text without a library.
    document.execCommand('styleWithCSS', false, 'true');
  }, [activeNoteId]);

  // Handle deep-linking from notifications
  useEffect(() => {
    // This effect should run only once when the app loads and notes are available
    if (notes.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('noteId');
    if (noteId && notes.find(n => n.id === noteId)) {
        setActiveNoteId(noteId);
        // Clean up the URL to avoid re-triggering on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [notes]);

  const activeNote = useMemo(() => notes.find(note => note.id === activeNoteId), [notes, activeNoteId]);
  const activeNoteRef = useRef(activeNote);
  activeNoteRef.current = activeNote;
  
  const noteToDelete = useMemo(() => notes.find(note => note.id === noteIdToDelete), [notes, noteIdToDelete]);

  const filteredNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    const pinned = sorted.filter(n => n.isPinned);
    const unpinned = sorted.filter(n => !n.isPinned);

    const applyFilter = (arr: Note[]) =>
      searchTerm ? arr.filter(n => getPlainText(n.content).toLowerCase().includes(searchTerm.toLowerCase())) : arr;
    
    return [...applyFilter(pinned), ...applyFilter(unpinned)];
  }, [notes, searchTerm]);

  const createNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      color: 'text-slate-800 dark:text-slate-200',
      font: 'font-sans',
      fontSize: 'text-lg',
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    setNotes(currentNotes =>
      currentNotes.map(note =>
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      )
    );
  }, []);
  
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Only save the selection if it's inside the editor.
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
            // cloneRange() creates a snapshot of the range.
            // This is crucial because the original Range object is live and will change
            // if the user clicks elsewhere, clearing the selection.
            selectionRangeRef.current = range.cloneRange();
        }
    }
  }, []);

  // Use the 'selectionchange' event for a more robust way to track selection.
  useEffect(() => {
    // This event fires whenever the selection in the document changes.
    document.addEventListener('selectionchange', saveSelection);
    return () => {
      document.removeEventListener('selectionchange', saveSelection);
    };
  }, [saveSelection]);

  const applyColor = useCallback((colorClass: string) => {
    // Use toString().length > 0 for a more robust check of whether text is selected.
    if (selectionRangeRef.current && selectionRangeRef.current.toString().length > 0) {
        // To programmatically modify the selection, the editor must be focused.
        editorRef.current?.focus();
        
        // Restore the saved selection.
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(selectionRangeRef.current);
        }
        
        const map = isDarkMode ? COLOR_HEX_MAP_DARK : COLOR_HEX_MAP_LIGHT;
        const colorHex = map[colorClass];

        if (colorHex) {
            // Apply the color to the restored selection.
            document.execCommand('foreColor', false, colorHex);
            // The selection might be collapsed after the command, so re-save the current state.
            saveSelection();
            // Manually dispatch an input event to notify React of the content change.
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    } else {
        // If no text was selected, change the default color for the entire note.
        if(activeNoteId) {
            updateNote(activeNoteId, { color: colorClass });
        }
    }
  }, [activeNoteId, saveSelection, updateNote, isDarkMode]);

  const applyFontSize = useCallback((sizeClass: string) => {
    // Use toString().length > 0 for a more robust check of whether text is selected.
    if (selectionRangeRef.current && selectionRangeRef.current.toString().length > 0) {
        // Restore the selection first.
        editorRef.current?.focus();
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(selectionRangeRef.current);
        }
        
        const sizeCommand = FONT_SIZE_COMMAND_MAP[sizeClass];
        if (sizeCommand) {
            // Apply the font size command.
            document.execCommand('fontSize', false, sizeCommand);
            // Save the selection state again.
            saveSelection();
            // Trigger React's state update.
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    } else {
        // If no text is selected, update the default font size for the entire note.
        if(activeNoteId) {
            updateNote(activeNoteId, { fontSize: sizeClass });
        }
    }
  }, [activeNoteId, updateNote, saveSelection]);


  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setToastMessage('マイクの使用が許可されていません');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
      }
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript && activeNoteRef.current) {
        const currentNote = activeNoteRef.current;
        const existingContent = currentNote.content;
        const separator = getPlainText(existingContent).trim().length > 0 ? ' ' : '';
        const newContent = existingContent + separator + finalTranscript;
        
        updateNote(currentNote.id, { content: newContent });
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [updateNote]);
  
  const handleVoiceInput = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
        setToastMessage('音声認識はこのブラウザではサポートされていません。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
        return;
    }
    
    if (isListening) {
        recognition.stop();
        setIsListening(false);
    } else {
        try {
            recognition.start();
        } catch (e) {
             console.error("Could not start recognition", e);
        }
    }
  };
  
  const requestDeleteNote = (id: string) => {
    setNoteIdToDelete(id);
  };

  const confirmDeleteNote = () => {
    if (!noteIdToDelete) return;
    setNotes(notes.filter(note => note.id !== noteIdToDelete));
    if (activeNoteId === noteIdToDelete) {
      setActiveNoteId(null);
    }
    unpinFromNotification(noteIdToDelete); // Also unpin from notification if deleted
    setNoteIdToDelete(null);
  };

  const cancelDeleteNote = () => {
    setNoteIdToDelete(null);
  };

const pinToNotification = async (note: Note) => {
  if (!("serviceWorker" in navigator)) return;

  const plainTextContent = (getPlainText(note.content) || "").trim();
  const lines = plainTextContent.split("\n");
  const title = lines[0]?.substring(0, 50) || "nana memo";
  const body = lines.slice(1).join("\n").substring(0, 100) || "メモを表示";

  try {
    const registration = await navigator.serviceWorker.ready;

    // ✅ Service Worker にメッセージを送信（ここが重要）
    registration.active?.postMessage({
      type: "SHOW_NOTE_NOTIFICATION",
      payload: {
        title,
        body,
        noteId: note.id,
      },
    });

    setToastMessage("通知に固定しました");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 2000);
  } catch (err) {
    console.error("通知送信失敗:", err);

    // エラー時にピン留め解除
    setPinnedToNotificationIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(note.id);
      return newSet;
    });

    setToastMessage("通知の表示に失敗しました");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 3000);
  }
};


  const unpinFromNotification = async (noteId: string) => {
    // Optimistically update UI
    setPinnedToNotificationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
    });

    if (!('serviceWorker' in navigator)) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications({ tag: `note-${noteId}` });
        notifications.forEach(notification => notification.close());
        setToastMessage('通知の設定を解除しました。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
    } catch (error) {
        console.error("Failed to unpin notification:", error);
        // Revert state on failure
        setPinnedToNotificationIds(prev => new Set(prev).add(noteId));
        setToastMessage('通知の解除に失敗しました。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
    }
  };
  
  const handleToggleNotificationPin = async (note: Note) => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        setToastMessage('通知機能はこのブラウザではサポートされていません。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
        return;
    }

    if (Notification.permission === 'denied') {
        setToastMessage('通知がブロックされています。ブラウザの設定を変更してください。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
        return;
    }

    if (pinnedToNotificationIds.has(note.id)) {
        await unpinFromNotification(note.id);
    } else {
        // Optimistically update the UI *before* requesting permission to provide immediate feedback.
        setPinnedToNotificationIds(prev => new Set(prev).add(note.id));
        
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await pinToNotification(note);
        } else {
            setToastMessage('通知が許可されませんでした。');
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
            
            // Revert the optimistic update if permission is not granted.
            setPinnedToNotificationIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(note.id);
                return newSet;
            });
        }
    }
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setInstallPrompt(null);
      setShowSettings(false);
    });
  };
  
  const handleBackup = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'nanamemo-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setShowSettings(false);
  };
  
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setShowRestoreConfirm(file);
    setShowSettings(false);
    
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const proceedWithRestore = (file: File | null) => {
    if (!file) return;

    setShowRestoreConfirm(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const parsedData = JSON.parse(text);

          if (!Array.isArray(parsedData)) {
            throw new Error('無効なファイル形式です: 配列ではありません。');
          }
          
          if (parsedData.length === 0) {
            setNotes([]);
            setToastMessage('空のバックアップファイルを復元しました。');
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
            return;
          }

          const firstNote = parsedData[0];
          let importedNotes: Note[];

          if ('id' in firstNote && 'content' in firstNote && 'createdAt' in firstNote) {
            importedNotes = parsedData.map((n: any) => ({
              id: n.id,
              content: n.content,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
              isPinned: n.isPinned || false,
              color: n.color || 'text-slate-800 dark:text-slate-200',
              font: n.font || 'font-sans',
              fontSize: n.fontSize || 'text-lg',
            }));
          } 
          else if ('note_id' in firstNote && 'text' in firstNote) {
            importedNotes = parsedData.map((note: any, index: number) => {
              const createdAt = note.created_at ? new Date(note.created_at).getTime() : Date.now() - index;
              const updatedAt = note.updated_at ? new Date(note.updated_at).getTime() : Date.now() - index;

              return {
                id: String(note.note_id || createdAt),
                content: String(note.text || ''),
                createdAt: isNaN(createdAt) ? Date.now() - index : createdAt,
                updatedAt: isNaN(updatedAt) ? Date.now() - index : updatedAt,
                isPinned: Boolean(note.pinned || false),
                color: 'text-slate-800 dark:text-slate-200',
                font: 'font-sans',
                fontSize: 'text-lg',
              };
            });
          } 
          else {
            throw new Error('サポートされていないバックアップファイル形式です。');
          }

          setNotes(importedNotes);
          setToastMessage('復元が完了しました。');
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToastMessage(''), 2000);

        }
      } catch (error) {
        // Fix: The 'error' object in a catch block is of type 'unknown' and cannot be directly passed to setToastMessage.
        // This is fixed by checking if it's an instance of Error and then constructing a proper error message string.
        const detail = error instanceof Error ? `: ${error.message}` : '';
        const errorMessage = `復元に失敗しました${detail}`;

        setToastMessage(errorMessage);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
        console.error("Failed to restore notes:", error);
      }
    };
    reader.readAsText(file);
  };

  const handleShare = async () => {
    if (!activeNote) return;

    const textToShare = getPlainText(activeNote.content);
    if (!textToShare) {
      setToastMessage('共有する内容がありません。');
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
      return;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'nanamemo',
          text: textToShare,
        });
      } catch (error) {
        console.error('共有に失敗しました:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        setToastMessage('クリップボードにコピーしました');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
      } catch (error) {
        console.error('クリップボードへのコピーに失敗しました:', error);
        setToastMessage('コピーに失敗しました。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
      }
    }
  };

  // --- Selection Mode Logic ---
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelection = new Set(selectedNoteIds);
    if (newSelection.has(noteId)) {
        newSelection.delete(noteId);
    } else {
        newSelection.add(noteId);
    }

    if (newSelection.size === 0) {
        exitSelectionMode();
    } else {
        setSelectedNoteIds(newSelection);
    }
  };
  
  const handlePointerDown = useCallback((noteId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
        }
        setSelectedNoteIds(prev => new Set(prev).add(noteId));
        longPressTriggered.current = true;
    }, 500);
  }, [isSelectionMode]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
    }
  }, []);

  const handleClick = useCallback((noteId: string) => {
    if (longPressTriggered.current) {
        return;
    }
    if (isSelectionMode) {
        toggleNoteSelection(noteId);
    } else {
        setActiveNoteId(noteId);
    }
  }, [isSelectionMode, toggleNoteSelection]);

  const confirmBulkDelete = () => {
    const idsToDelete = Array.from(selectedNoteIds);
    setNotes(notes => notes.filter(note => !idsToDelete.includes(note.id)));
    idsToDelete.forEach(id => unpinFromNotification(id)); // Also unpin
    setShowBulkDeleteConfirm(false);
    exitSelectionMode();
  };
  
  const handleBulkPin = () => {
    const shouldPin = notes.some(note => selectedNoteIds.has(note.id) && !note.isPinned);
    setNotes(currentNotes =>
      currentNotes.map(note =>
        selectedNoteIds.has(note.id)
          ? { ...note, isPinned: shouldPin, updatedAt: Date.now() }
          : note
      )
    );
    exitSelectionMode();
  };


  // --- Calendar View Logic ---

  const notesByDate = useMemo(() => {
    const map = new Map<string, Note[]>();
    notes.forEach(note => {
      const dateStr = new Date(note.createdAt).toISOString().split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(note);
    });
    return map;
  }, [notes]);

  const notesForSelectedDay = useMemo(() => {
      if (!selectedDate) return [];
      const dateStr = selectedDate.toISOString().split('T')[0];
      return notesByDate.get(dateStr) || [];
  }, [selectedDate, notesByDate]);


  const calendarDays = useMemo(() => {
    const days = [];
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        days.push({
            date: date,
            isCurrentMonth: date.getMonth() === month,
            hasNotes: notesByDate.has(dateStr),
        });
    }
    return days;
  }, [calendarDate, notesByDate]);

  const ConfirmationModal = noteIdToDelete && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300" onClick={cancelDeleteNote} role="dialog" aria-modal="true" aria-labelledby="delete-confirmation-title">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 id="delete-confirmation-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-2">
          メモの削除
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4 text-center">本当にこのメモを削除しますか？</p>
        
        {noteToDelete && getPlainText(noteToDelete.content) && (
          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md mb-6 max-h-24 overflow-y-auto">
            <p className="text-sm text-slate-700 dark:text-slate-300 break-words">
              {getPlainText(noteToDelete.content)}
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={cancelDeleteNote}
            className="px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-slate-400"
          >
            キャンセル
          </button>
          <button
            onClick={confirmDeleteNote}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-red-500"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
  
  const BulkDeleteModal = showBulkDeleteConfirm && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300" onClick={() => setShowBulkDeleteConfirm(false)} role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 id="bulk-delete-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-4">
          {selectedNoteIds.size}件のメモを削除
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">本当にこれらのメモを削除しますか？この操作は取り消せません。</p>
        <div className="flex justify-end space-x-3">
          <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-slate-400">
            キャンセル
          </button>
          <button onClick={confirmBulkDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-red-500">
            削除
          </button>
        </div>
      </div>
    </div>
  );

  const RestoreConfirmModal = showRestoreConfirm && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRestoreConfirm(null)} role="dialog" aria-modal="true" aria-labelledby="restore-confirm-title">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 id="restore-confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-4">
          メモの復元
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
          バックアップから復元しますか？<br/>現在のメモはすべて上書きされます。
        </p>
        <div className="flex justify-end space-x-3">
          <button onClick={() => setShowRestoreConfirm(null)} className="px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-slate-400">
            キャンセル
          </button>
          <button onClick={() => proceedWithRestore(showRestoreConfirm)} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-blue-500">
            復元
          </button>
        </div>
      </div>
    </div>
  );

  const Toast = (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 transition-opacity duration-300 ${toastMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {toastMessage}
    </div>
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const currentMonthNoteCount = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return notes.filter(note => {
      const noteDate = new Date(note.updatedAt);
      return noteDate.getFullYear() === year && noteDate.getMonth() === month;
    }).length;
  }, [notes]);


  if (activeNote) {
    const isPinnedToNotification = pinnedToNotificationIds.has(activeNote.id);
    return (
      <>
        <div className={`flex flex-col h-screen bg-amber-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 ${activeNote.font}`}>
          <header className="relative flex-shrink-0 flex items-center justify-between p-2 border-b border-amber-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
                <button onClick={() => setActiveNoteId(null)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"><ChevronLeftIcon className="w-6 h-6" /></button>
                <div className={`transition-opacity duration-500 pointer-events-none ${saveStatus === 'saved' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center space-x-1 text-sm text-slate-400 dark:text-slate-500">
                        <CheckIcon className="w-4 h-4" />
                        <span>保存しました</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-1">
                <button onClick={handleShare} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Share note"><ShareIcon className="w-5 h-5" /></button>
                <button onClick={() => handleToggleNotificationPin(activeNote)} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${isPinnedToNotification ? 'text-yellow-500 dark:text-yellow-400' : ''}`} aria-label="Pin to notification">
                    {isPinnedToNotification ? <BellIconFilled className="w-5 h-5" /> : <BellIcon className="w-5 h-5" />}
                </button>
                <button onClick={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${activeNote.isPinned ? 'text-rose-500' : ''}`}><BookmarkIcon className="w-5 h-5" isFilled={activeNote.isPinned} /></button>
                <button onClick={() => requestDeleteNote(activeNote.id)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                <button onClick={() => setActiveNoteId(null)} className="ml-2 px-3 py-1.5 rounded-full text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-slate-900 focus:ring-rose-500">完了</button>
            </div>
          </header>

          <div className="flex-shrink-0 flex flex-col items-center justify-center p-2 space-y-2">
            {/* Top Row: Font and Size */}
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2">
              <select
                value={activeNote.font}
                onChange={(e) => updateNote(activeNote.id, { font: e.target.value })}
                className="h-8 px-2 text-sm rounded-full bg-amber-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 border-transparent appearance-none"
                aria-label="Select font"
              >
                {Object.entries(FONT_OPTIONS).map(([fontClass, fontName]) => (
                  <option key={fontClass} value={fontClass}>
                    {fontName}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-1 bg-amber-100 dark:bg-slate-700 rounded-full p-0.5">
                {Object.entries(FONT_SIZE_OPTIONS).map(([sizeClass, sizeName]) => {
                  const isSelected = activeNote.fontSize === sizeClass;
                  return (
                    <button
                      key={sizeClass}
                      onClick={() => applyFontSize(sizeClass)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`px-2 py-0.5 text-sm rounded-full transition-colors ${isSelected ? 'bg-white dark:bg-slate-500 shadow-sm' : 'hover:bg-amber-200/50 dark:hover:bg-slate-600/50'}`}
                      aria-label={sizeName}
                    >
                      {sizeName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row: Styles, Mic, Colors */}
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center">
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('bold', false, undefined)} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700`} aria-label="Bold">
                  <BoldIcon className="w-5 h-5" />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('underline', false, undefined)} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700`} aria-label="Underline">
                  <UnderlineIcon className="w-5 h-5" />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('strikeThrough', false, undefined)} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700`} aria-label="打ち消し線">
                  <StrikethroughIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleVoiceInput} 
                  className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${isListening ? 'bg-rose-500/50 animate-pulse text-rose-50' : ''}`}
                  aria-label="音声入力"
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                {Object.entries(COLOR_OPTIONS).map(([colorClass, colorName]) => {
                  const colorMap = isDarkMode ? COLOR_HEX_MAP_DARK : COLOR_HEX_MAP_LIGHT;
                  const hexColor = colorMap[colorClass];
                  const isSelected = activeNote.color === colorClass;
                  return (
                    <button
                      key={colorClass}
                      aria-label={colorName}
                      title={colorName}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyColor(colorClass)}
                      className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-slate-900 focus:ring-rose-500 flex items-center justify-center`}
                      style={{ backgroundColor: hexColor }}
                    >
                      {isSelected && <CheckIcon className="w-4 h-4 text-white mix-blend-difference" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <RabbitBorder isDarkMode={isDarkMode} />

          <main className="flex-grow p-4 md:p-6 overflow-y-auto">
            <div
              ref={editorRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              onInput={(e) => updateNote(activeNote.id, { content: e.currentTarget.innerHTML })}
              dangerouslySetInnerHTML={{ __html: activeNote.content }}
              className={`w-full h-full bg-transparent resize-none focus:outline-none ${activeNote.color} ${activeNote.fontSize || 'text-lg'}`}
              data-placeholder="メモを入力..."
            />
          </main>
        </div>
        {ConfirmationModal}
        {Toast}
      </>
    );
  }

  if (viewMode === 'calendar') {
    return (
      <>
        <div className="flex flex-col h-screen bg-amber-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
          <header className="flex items-center justify-between p-4 border-b border-amber-200 dark:border-slate-700">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Calendar</h1>
            <div className='flex items-center space-x-2'>
                <button onClick={() => setViewMode('list')} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="List view"><ListIcon className="w-6 h-6"/></button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="テーマを切り替え">
                  <ThemeIcon className="w-6 h-6 text-slate-600 dark:text-yellow-400" />
                </button>
            </div>
          </header>
          <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700"><ChevronLeftIcon className="w-6 h-6" /></button>
                  <h2 className="text-lg font-semibold">{calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}</h2>
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700"><ChevronRightIcon className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm text-slate-500">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-2">
                  {calendarDays.map(({ date, isCurrentMonth, hasNotes }, index) => {
                      const isToday = isSameDay(date, new Date());
                      const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                      return (
                          <button key={index} onClick={() => setSelectedDate(date)} className={`relative flex items-center justify-center h-10 w-10 rounded-full transition-colors ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-600' : 'hover:bg-amber-100 dark:hover:bg-slate-700'} ${isToday ? 'bg-rose-500 text-white' : ''} ${isSelected ? 'ring-2 ring-rose-500' : ''}`}>
                              <span>{date.getDate()}</span>
                              {hasNotes && <div className="absolute bottom-1 h-1.5 w-1.5 bg-blue-500 rounded-full"></div>}
                          </button>
                      )
                  })}
              </div>
          </div>
          <main className="flex-grow p-4 pt-0 overflow-y-auto">
              {selectedDate && (
                  <div>
                      <h3 className="font-semibold mb-2">Notes for {selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</h3>
                      {notesForSelectedDay.length > 0 ? (
                          <div className="space-y-2">
                              {notesForSelectedDay.map(note => (
                                  <button key={note.id} onClick={() => setActiveNoteId(note.id)} className={`block w-full text-left p-3 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-md transition-shadow ${note.font}`}>
                                      <p className={`whitespace-pre-wrap break-words line-clamp-3 ${note.color} ${note.fontSize || 'text-lg'}`}>{getPlainText(note.content) || '新規メモ'}</p>
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <p className="text-slate-400 dark:text-slate-500 text-sm">No notes for this day.</p>
                      )}
                  </div>
              )}
          </main>
        </div>
        {ConfirmationModal}
        {Toast}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-amber-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
        <header className="flex items-center justify-between p-4 border-b border-amber-200 dark:border-slate-700">
           {isSelectionMode ? (
            <>
              <div className="flex items-center space-x-2">
                <button onClick={exitSelectionMode} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Cancel selection">
                  <CloseIcon className="w-6 h-6"/>
                </button>
                <span className="font-bold text-lg text-slate-900 dark:text-white">{selectedNoteIds.size}件選択中</span>
              </div>
              <div className="flex items-center space-x-2">
                 <button onClick={handleBulkPin} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Pin selected notes">
                    <BookmarkIcon className="w-6 h-6" isFilled={true} />
                  </button>
                <button onClick={() => setShowBulkDeleteConfirm(true)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Delete selected notes">
                  <TrashIcon className="w-6 h-6"/>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <RabbitIcon className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                <h1 className="text-2xl font-dela text-rose-500 dark:text-rose-400">nanamemo</h1>
              </div>
              <div className='flex items-center space-x-2'>
                  <button 
                    onClick={() => {
                      if (showSearchBar) setSearchTerm('');
                      setShowSearchBar(!showSearchBar);
                    }}
                    className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" 
                    aria-label="Search notes"
                  >
                    <SearchIcon className="w-6 h-6"/>
                  </button>
                  <button onClick={() => setViewMode('calendar')} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Calendar view"><CalendarIcon className="w-6 h-6"/></button>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="テーマを切り替え">
                    <ThemeIcon className="w-6 h-6 text-slate-600 dark:text-yellow-400" />
                  </button>
                  <div className="relative">
                      <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Settings"><CogIcon className="w-6 h-6"/></button>
                      {showSettings && (
                          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-10">
                              {installPrompt && (
                                <button onClick={handleInstallClick} className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                                  <InstallIcon className='w-4 h-4'/><span>アプリをインストール</span>
                                </button>
                              )}
                              <button onClick={handleBackup} className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><DownloadIcon className='w-4 h-4'/><span>バックアップ</span></button>
                              <button onClick={() => fileInputRef.current?.click()} className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><UploadIcon className='w-4 h-4' /><span>復元</span></button>
                              <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
                              <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                              <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                                  ヒント: Safariでは「共有」→「ホーム画面に追加」でインストールできます。
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
           <div className="flex justify-between items-baseline px-4 pb-2 text-slate-500 dark:text-slate-400 border-b border-amber-200 dark:border-slate-700">
              <h2 className="text-2xl font-kiwi font-bold">{currentYear} / {currentMonth}</h2>
              <span className="text-sm font-medium">{currentMonthNoteCount}件のメモ</span>
           </div>
        )}
        
        <main className="flex-grow p-4 overflow-y-auto">
          {filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredNotes.map(note => {
                const isSelected = selectedNoteIds.has(note.id);
                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(note.id)}
                    onPointerDown={() => handlePointerDown(note.id)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!isSelectionMode) setIsSelectionMode(true);
                      setSelectedNoteIds(prev => new Set(prev).add(note.id));
                    }}
                    className={`relative flex w-full text-left rounded-lg shadow-md bg-white dark:bg-slate-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden ${note.font}`}
                  >
                    {/* Date Section (Left) */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 p-4 border-r border-slate-100 dark:border-slate-600">
                        <span className="text-3xl font-bold text-rose-500 dark:text-rose-400 font-sans">{formatDay(note.updatedAt)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatTime(note.updatedAt)}</span>
                    </div>

                    {/* Content Section (Right) */}
                    <div className="flex-grow p-4 min-w-0 flex items-center">
                        <p className={`whitespace-pre-wrap break-words line-clamp-4 ${note.color} ${note.fontSize || 'text-lg'}`}>
                            {getPlainText(note.content) || '新規メモ'}
                        </p>
                    </div>

                    {note.isPinned && (
                        <div className="absolute top-0 right-0 w-8 h-8">
                           <div className="absolute top-0 right-0 w-0 h-0 border-8 border-solid border-transparent border-t-rose-400 dark:border-t-rose-500 border-r-rose-400 dark:border-r-rose-500" style={{ borderTopRightRadius: '0.5rem' }}></div>
                        </div>
                    )}
                   
                    {isSelectionMode && (
                      <div className={`absolute inset-0 rounded-lg transition-all pointer-events-none ${isSelected ? 'ring-2 ring-rose-500 ring-inset' : ''}`}>
                          {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
                                  <CheckIcon className="w-4 h-4 text-white" />
                              </div>
                          )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <RabbitIcon className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-4"/>
                <p className="text-slate-400 dark:text-slate-500">
                    {searchTerm ? 'メモが見つかりません。' : 'メモメモ、書き書き！'}
                </p>
            </div>
          )}
        </main>
        
        {!isSelectionMode && (
          <button
            onClick={createNote}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-300 dark:focus:ring-rose-700 transition-transform transform hover:scale-105"
            aria-label="New Note"
          >
            <PlusIcon className="w-8 h-8 mx-auto" />
          </button>
        )}
      </div>
      {ConfirmationModal}
      {BulkDeleteModal}
      {RestoreConfirmModal}
      {Toast}
    </>
  );
}