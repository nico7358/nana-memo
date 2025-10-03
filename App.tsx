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
const SunIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>;
const MoonIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.62-.12 2.37-.34-.23-.42-.37-.89-.37-1.41 0-1.93 1.57-3.5 3.5-3.5.52 0 .99.14 1.41.37-.22-.75-.34-1.54-.34-2.37 0-4.97-4.03-9-9-9z" /></svg>;
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>;
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>;
const DogEarPinIcon: React.FC<{ className?: string, isFilled?: boolean }> = ({ className, isFilled }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">{isFilled ? <path d="M17,3H7C5.9,3,5,3.9,5,5v14c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2V9L17,3z M12,18c-1.66,0-3-1.34-3-3s1.34-3,3-3s3,1.34,3,3S13.66,18,12,18z"/> : <path d="M17,3H7C5.9,3,5,3.9,5,5v14c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2V9l-6-6z M12,18c-1.66,0-3-1.34-3-3s1.34-3,3-3s3,1.34,3,3S13.66,18,12,18z M7,8V5h5l2,2H7z" />}</svg>;
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>;
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>;
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>;
const CogIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52-.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17.59 1.69.98l2.49-1c.23-.09.49 0-.61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>;
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
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>;

const FONT_OPTIONS = {
  'font-sans': 'デフォルト',
  'font-syuku': 'しゅく',
  'font-kaisei': 'かいせい',
  'font-dela': 'デラゴシック',
  'font-hachi': 'はちまるポップ',
  'font-kiwi': 'キウイ丸',
  'font-dot': 'ドット',
};

const COLOR_OPTIONS = {
  'text-slate-800 dark:text-slate-200': 'デフォルト',
  'text-rose-600 dark:text-rose-400': 'ローズ',
  'text-blue-600 dark:text-blue-400': 'ブルー',
  'text-green-600 dark:text-green-400': 'グリーン',
  'text-yellow-600 dark:text-yellow-400': 'イエロー',
  'text-purple-600 dark:text-purple-400': 'パープル',
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
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
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
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);
  const isInitialPinnedIdsMount = useRef(true);

const requestNotification = async () => {
  if ("Notification" in window && "serviceWorker" in navigator) {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("nana memo", {
        body: "メモが保存されました！",
        icon: "/icon-192.png",
        badge: "/icon-192.png",  // ステータスバー用小アイコン
        tag: "memo-notify",
        requireInteraction: true,
        data: { url: "/" } // 通知クリックで開くURL
      });
    }
  }
};


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
  }, [activeNoteId]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
    // Optimistically update the UI first
    setPinnedToNotificationIds(prev => new Set(prev).add(note.id));

    const plainTextContent = (getPlainText(note.content) || '内容がありません').substring(0, 100);
    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('nanamemo', {
            body: plainTextContent,
            tag: `note-${note.id}`,
            requireInteraction: true,
            icon: '/icon.png',
            data: { noteId: note.id },
            actions: [
              { action: 'open_note', title: 'メモを開く' }
            ]
        } as any);
        setToastMessage('メモを通知に設定しました。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
    } catch (error) {
        console.error("Failed to show notification:", error);
        // Revert the state if the API call fails
        setPinnedToNotificationIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(note.id);
            return newSet;
        });
        setToastMessage('通知の表示に失敗しました。');
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
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
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await pinToNotification(note);
        } else {
            setToastMessage('通知が許可されませんでした。');
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToastMessage(''), 3000);
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
            importedNotes = parsedData;
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
              };
            });
          } 
          else {
            throw new Error('サポートされていないバックアップファイル形式です。');
          }

          if (importedNotes.every(n => 'id' in n && 'content' in n)) {
            setNotes(importedNotes);
            setToastMessage('復元が完了しました。');
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToastMessage(''), 2000);
          } else {
             throw new Error('バックアップファイルの処理に失敗しました。');
          }
        }
      } catch (error) {
        setToastMessage(`復元に失敗しました。`);
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
            <button onClick={() => setActiveNoteId(null)} className="px-3 py-1.5 rounded-full text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-slate-900 focus:ring-rose-500">完了</button>
          </header>

          <div className="flex-shrink-0 flex items-center justify-center p-2 border-b border-amber-200 dark:border-slate-700 flex-wrap gap-2">
              <select
                value={activeNote.font}
                onChange={(e) => updateNote(activeNote.id, { font: e.target.value })}
                className="px-2 py-1 text-sm rounded-full bg-amber-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 border-transparent"
                aria-label="Select font"
              >
                {Object.entries(FONT_OPTIONS).map(([fontClass, fontName]) => (
                  <option key={fontClass} value={fontClass}>
                    {fontName}
                  </option>
                ))}
              </select>
            <div className="relative" ref={colorPickerRef}>
                <button 
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)} 
                  className="flex items-center space-x-1 px-2 py-1 text-sm rounded-full bg-amber-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  aria-label="Select color"
                  aria-haspopup="true"
                  aria-expanded={isColorPickerOpen}
                >
                  <span>カラー</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
                {isColorPickerOpen && (
                  <div className="absolute top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-20">
                    {Object.entries(COLOR_OPTIONS).map(([colorClass, colorName]) => (
                      <button 
                        key={colorClass} 
                        onClick={() => {
                          updateNote(activeNote.id, { color: colorClass });
                          setIsColorPickerOpen(false);
                        }} 
                        className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <div className={`w-4 h-4 rounded-full ${colorClass.split(' ')[0]}`}></div>
                        <span>{colorName}</span>
                        {activeNote.color === colorClass && <CheckIcon className="w-4 h-4 ml-auto text-rose-500" />}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <div className="w-px h-6 bg-amber-200 dark:bg-slate-600"></div>
            <button onClick={() => document.execCommand('bold', false, undefined)} className={`p-2 rounded-full bg-amber-100 dark:bg-slate-700`} aria-label="Bold">
              <BoldIcon className="w-6 h-6" />
            </button>
            <button onClick={() => document.execCommand('underline', false, undefined)} className={`p-2 rounded-full bg-amber-100 dark:bg-slate-700`} aria-label="Underline">
              <UnderlineIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={handleVoiceInput} 
                className={`p-2 rounded-full bg-amber-100 dark:bg-slate-700 transition-colors ${isListening ? 'bg-rose-500/50 animate-pulse text-white' : ''}`}
                aria-label="音声入力"
            >
                <MicrophoneIcon className="w-6 h-6" />
            </button>
            <div className="w-px h-6 bg-amber-200 dark:bg-slate-600"></div>
              <button onClick={handleShare} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Share note"><ShareIcon className="w-6 h-6" /></button>
              <button onClick={() => handleToggleNotificationPin(activeNote)} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${isPinnedToNotification ? 'text-yellow-500 dark:text-yellow-400' : ''}`} aria-label="Pin to notification">
                {isPinnedToNotification ? <BellIconFilled className="w-6 h-6" /> : <BellIcon className="w-6 h-6" />}
              </button>
              <button onClick={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })} className={`p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ${activeNote.isPinned ? 'text-rose-500' : ''}`}><DogEarPinIcon className="w-6 h-6" isFilled={activeNote.isPinned} /></button>
              <button onClick={() => requestDeleteNote(activeNote.id)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"><TrashIcon className="w-6 h-6" /></button>
          </div>

          <main className="flex-grow p-4 md:p-6 overflow-y-auto">
            <div
              ref={editorRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              onInput={(e) => updateNote(activeNote.id, { content: e.currentTarget.innerHTML })}
              dangerouslySetInnerHTML={{ __html: activeNote.content }}
              className={`w-full h-full text-lg bg-transparent resize-none focus:outline-none ${activeNote.color}`}
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
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle dark mode">{isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}</button>
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
                                      <p className={`whitespace-pre-wrap break-words text-sm line-clamp-3 ${note.color}`}>{getPlainText(note.content) || '新規メモ'}</p>
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
                    <DogEarPinIcon className="w-6 h-6"/>
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
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle dark mode">{isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}</button>
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
                        <p className={`whitespace-pre-wrap break-words text-sm line-clamp-4 ${note.color}`}>
                            {getPlainText(note.content) || '新規メモ'}
                        </p>
                    </div>

                    {note.isPinned && (
                      <div className="absolute top-0 right-0 w-8 h-8">
                        <div className="absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-rose-300 dark:border-t-rose-600"></div>
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