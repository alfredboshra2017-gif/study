import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiRequest } from '../lib/api.ts';
import {
  ExamRecord,
  FlashcardItem,
  FocusSession,
  MistakeItem,
  NoteItem,
  PdfDocument,
  PdfFolder,
  SectionId,
  StudyTask,
  SubjectItem,
  UpcomingExam,
  UserProfile,
  WeeklyPlan,
  WorkspaceData,
} from '../types/study.ts';

interface TimerState {
  mode: 'Stopwatch' | 'Pomodoro';
  isRunning: boolean;
  hasStarted: boolean;
  subjectName: string;
  description: string;
  elapsedSeconds: number;
  pomodoroPhase: 'study' | 'break';
  pomodoroRemainingSeconds: number;
  pomodoroStudyMins: number;
  pomodoroBreakMins: number;
}

interface StudyContextValue {
  firebaseUser: User | null;
  authLoading: boolean;
  workspaceLoading: boolean;
  workspaceError: string | null;
  workspace: WorkspaceData | null;
  activeSection: SectionId;
  setActiveSection: (s: SectionId) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'error') => void;

  // Global timer
  timer: TimerState;
  setTimerSubject: (subject: string) => void;
  setTimerDescription: (desc: string) => void;
  setTimerMode: (mode: 'Stopwatch' | 'Pomodoro') => void;
  setPomodoroDurations: (studyMins: number, breakMins: number) => void;
  startOrResumeTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  stopAndSaveTimer: () => Promise<void>;

  // Mutations
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  addSubject: (name: string, color: string) => Promise<void>;
  deleteSubject: (id: number) => Promise<void>;
  addWeeklyPlan: (data: { title: string; startDate: string; endDate: string }) => Promise<WeeklyPlan>;
  deleteWeeklyPlan: (id: number) => Promise<void>;
  addTask: (data: {
    weeklyPlanId: number;
    subjectName: string;
    title: string;
    description: string;
    deadline: string;
    priority: 'High' | 'Medium' | 'Low';
  }) => Promise<void>;
  updateTask: (id: number, patch: Partial<StudyTask>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  addExam: (data: Omit<ExamRecord, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateExam: (id: number, patch: Partial<ExamRecord>) => Promise<void>;
  deleteExam: (id: number) => Promise<void>;
  addUpcomingExam: (data: Omit<UpcomingExam, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteUpcomingExam: (id: number) => Promise<void>;
  saveFocusSession: (data: Omit<FocusSession, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteFocusSession: (id: number) => Promise<void>;
  addNote: (data: Omit<NoteItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<NoteItem>;
  updateNote: (id: number, patch: Partial<NoteItem>) => Promise<NoteItem>;
  deleteNote: (id: number) => Promise<void>;
  addMistake: (data: Omit<MistakeItem, 'id' | 'userId' | 'reviewCount' | 'createdAt'>) => Promise<void>;
  updateMistake: (id: number, patch: Partial<MistakeItem>) => Promise<void>;
  deleteMistake: (id: number) => Promise<void>;
  addFlashcard: (data: {
    collectionName: string;
    subjectName: string;
    lesson: string;
    front: string;
    back: string;
  }) => Promise<void>;
  updateFlashcard: (
    id: number,
    patch: Partial<FlashcardItem> & { reviewed?: boolean }
  ) => Promise<void>;
  deleteFlashcard: (id: number) => Promise<void>;
  createFolder: (name: string, parentId: number | null) => Promise<PdfFolder>;
  renameFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
  uploadPdf: (formData: FormData) => Promise<PdfDocument>;
  updatePdf: (id: number, patch: Partial<PdfDocument>) => Promise<void>;
  deletePdf: (id: number) => Promise<void>;
}

const StudyContext = createContext<StudyContextValue | null>(null);

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch {
    // ignore audio block
  }
}

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [timer, setTimer] = useState<TimerState>({
    mode: 'Stopwatch',
    isRunning: false,
    hasStarted: false,
    subjectName: 'Mathematics',
    description: '',
    elapsedSeconds: 0,
    pomodoroPhase: 'study',
    pomodoroRemainingSeconds: 25 * 60,
    pomodoroStudyMins: 25,
    pomodoroBreakMins: 5,
  });

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const data = await apiRequest<WorkspaceData>('/bootstrap');
      setWorkspace(data);
      setTimer((prev) => ({
        ...prev,
        subjectName:
          prev.hasStarted || data.subjects.length === 0
            ? prev.subjectName
            : data.subjects[0].name,
        pomodoroStudyMins: data.profile.pomodoroStudyMinutes || 25,
        pomodoroBreakMins: data.profile.pomodoroBreakMinutes || 5,
        pomodoroRemainingSeconds: prev.hasStarted
          ? prev.pomodoroRemainingSeconds
          : (data.profile.pomodoroStudyMinutes || 25) * 60,
      }));
    } catch (err: unknown) {
      setWorkspaceError(
        err instanceof Error ? err.message : 'Unable to load your study workspace.'
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        loadWorkspace();
      } else {
        setWorkspace(null);
      }
    });
    return () => unsub();
  }, [loadWorkspace]);

  // Apply theme & accent mode on documentElement
  useEffect(() => {
    const mode = workspace?.profile.themeMode || 'dark';
    const accent = workspace?.profile.accentTheme || 'amethyst';
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-accent', accent);
  }, [workspace?.profile.themeMode, workspace?.profile.accentTheme]);

  // Global timer tick
  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = window.setInterval(() => {
      setTimer((prev) => {
        if (!prev.isRunning) return prev;
        if (prev.mode === 'Stopwatch') {
          return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        }
        // Pomodoro
        const nextRem = prev.pomodoroRemainingSeconds - 1;
        const nextElapsed =
          prev.pomodoroPhase === 'study' ? prev.elapsedSeconds + 1 : prev.elapsedSeconds;
        if (nextRem <= 0) {
          playChime();
          if (prev.pomodoroPhase === 'study') {
            return {
              ...prev,
              elapsedSeconds: nextElapsed,
              pomodoroPhase: 'break',
              pomodoroRemainingSeconds: prev.pomodoroBreakMins * 60,
            };
          }
          return {
            ...prev,
            isRunning: false,
            pomodoroPhase: 'study',
            pomodoroRemainingSeconds: prev.pomodoroStudyMins * 60,
          };
        }
        return {
          ...prev,
          elapsedSeconds: nextElapsed,
          pomodoroRemainingSeconds: nextRem,
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timer.isRunning]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Sign-in was cancelled or blocked.',
        'error'
      );
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setWorkspace(null);
    setActiveSection('dashboard');
  };

  // Timer controls
  const setTimerSubject = (subjectName: string) =>
    setTimer((p) => ({ ...p, subjectName }));
  const setTimerDescription = (description: string) =>
    setTimer((p) => ({ ...p, description }));
  const setTimerMode = (mode: 'Stopwatch' | 'Pomodoro') =>
    setTimer((p) => ({
      ...p,
      mode,
      isRunning: false,
      hasStarted: false,
      elapsedSeconds: 0,
      pomodoroPhase: 'study',
      pomodoroRemainingSeconds: p.pomodoroStudyMins * 60,
    }));
  const setPomodoroDurations = (studyMins: number, breakMins: number) =>
    setTimer((p) => ({
      ...p,
      pomodoroStudyMins: studyMins,
      pomodoroBreakMins: breakMins,
      pomodoroRemainingSeconds:
        !p.hasStarted && p.pomodoroPhase === 'study'
          ? studyMins * 60
          : p.pomodoroRemainingSeconds,
    }));
  const startOrResumeTimer = () =>
    setTimer((p) => ({ ...p, isRunning: true, hasStarted: true }));
  const pauseTimer = () => setTimer((p) => ({ ...p, isRunning: false }));
  const resetTimer = () =>
    setTimer((p) => ({
      ...p,
      isRunning: false,
      hasStarted: false,
      elapsedSeconds: 0,
      pomodoroPhase: 'study',
      pomodoroRemainingSeconds: p.pomodoroStudyMins * 60,
    }));

  const saveFocusSession = async (
    data: Omit<FocusSession, 'id' | 'userId' | 'createdAt'>
  ) => {
    const created = await apiRequest<FocusSession>('/focus-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, focusSessions: [created, ...prev.focusSessions] } : prev
    );
  };

  const stopAndSaveTimer = async () => {
    const secondsToSave = timer.elapsedSeconds;
    if (secondsToSave < 5) {
      resetTimer();
      showToast('Study session must be at least 5 seconds to record.', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    await saveFocusSession({
      subjectName: timer.subjectName,
      sessionDate: today,
      durationSeconds: secondsToSave,
      mode: timer.mode,
      description: timer.description || `${timer.mode} study session`,
    });
    resetTimer();
    showToast('Focus session saved to your study log.');
  };

  // Profile & Subjects
  const updateProfile = async (patch: Partial<UserProfile>) => {
    const updated = await apiRequest<UserProfile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) => (prev ? { ...prev, profile: updated } : prev));
  };

  const addSubject = async (name: string, color: string) => {
    const created = await apiRequest<SubjectItem>('/subjects', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, subjects: [...prev.subjects, created] } : prev
    );
  };

  const deleteSubject = async (id: number) => {
    await apiRequest('/subjects/' + id, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev ? { ...prev, subjects: prev.subjects.filter((s) => s.id !== id) } : prev
    );
  };

  // Weekly Plans & Tasks
  const addWeeklyPlan = async (data: {
    title: string;
    startDate: string;
    endDate: string;
  }) => {
    const created = await apiRequest<WeeklyPlan>('/weekly-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, weeklyPlans: [created, ...prev.weeklyPlans] } : prev
    );
    return created;
  };

  const deleteWeeklyPlan = async (id: number) => {
    await apiRequest(`/weekly-plans/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            weeklyPlans: prev.weeklyPlans.filter((p) => p.id !== id),
            tasks: prev.tasks.filter((t) => t.weeklyPlanId !== id),
          }
        : prev
    );
  };

  const addTask = async (data: {
    weeklyPlanId: number;
    subjectName: string;
    title: string;
    description: string;
    deadline: string;
    priority: 'High' | 'Medium' | 'Low';
  }) => {
    const created = await apiRequest<StudyTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, tasks: [created, ...prev.tasks] } : prev
    );
  };

  const updateTask = async (id: number, patch: Partial<StudyTask>) => {
    const updated = await apiRequest<StudyTask>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? updated : t)) }
        : prev
    );
  };

  const deleteTask = async (id: number) => {
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev
    );
  };

  // Exams
  const addExam = async (data: Omit<ExamRecord, 'id' | 'userId' | 'createdAt'>) => {
    const created = await apiRequest<ExamRecord>('/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, exams: [created, ...prev.exams] } : prev
    );
  };

  const updateExam = async (id: number, patch: Partial<ExamRecord>) => {
    const updated = await apiRequest<ExamRecord>(`/exams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) =>
      prev
        ? { ...prev, exams: prev.exams.map((e) => (e.id === id ? updated : e)) }
        : prev
    );
  };

  const deleteExam = async (id: number) => {
    await apiRequest(`/exams/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev ? { ...prev, exams: prev.exams.filter((e) => e.id !== id) } : prev
    );
  };

  const addUpcomingExam = async (
    data: Omit<UpcomingExam, 'id' | 'userId' | 'createdAt'>
  ) => {
    const created = await apiRequest<UpcomingExam>('/upcoming-exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            upcomingExams: [...prev.upcomingExams, created].sort((a, b) =>
              a.examDate.localeCompare(b.examDate)
            ),
          }
        : prev
    );
  };

  const deleteUpcomingExam = async (id: number) => {
    await apiRequest(`/upcoming-exams/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            upcomingExams: prev.upcomingExams.filter((u) => u.id !== id),
          }
        : prev
    );
  };

  const deleteFocusSession = async (id: number) => {
    await apiRequest(`/focus-sessions/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            focusSessions: prev.focusSessions.filter((s) => s.id !== id),
          }
        : prev
    );
  };

  // Notes
  const addNote = async (
    data: Omit<NoteItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    const created = await apiRequest<NoteItem>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, notes: [created, ...prev.notes] } : prev
    );
    return created;
  };

  const updateNote = async (id: number, patch: Partial<NoteItem>) => {
    const updated = await apiRequest<NoteItem>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) =>
      prev
        ? { ...prev, notes: prev.notes.map((n) => (n.id === id ? updated : n)) }
        : prev
    );
    return updated;
  };

  const deleteNote = async (id: number) => {
    await apiRequest(`/notes/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== id) } : prev
    );
  };

  // Mistakes
  const addMistake = async (
    data: Omit<MistakeItem, 'id' | 'userId' | 'reviewCount' | 'createdAt'>
  ) => {
    const created = await apiRequest<MistakeItem>('/mistakes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, mistakes: [created, ...prev.mistakes] } : prev
    );
  };

  const updateMistake = async (id: number, patch: Partial<MistakeItem>) => {
    const updated = await apiRequest<MistakeItem>(`/mistakes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            mistakes: prev.mistakes.map((m) => (m.id === id ? updated : m)),
          }
        : prev
    );
  };

  const deleteMistake = async (id: number) => {
    await apiRequest(`/mistakes/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? { ...prev, mistakes: prev.mistakes.filter((m) => m.id !== id) }
        : prev
    );
  };

  // Flashcards
  const addFlashcard = async (data: {
    collectionName: string;
    subjectName: string;
    lesson: string;
    front: string;
    back: string;
  }) => {
    const created = await apiRequest<FlashcardItem>('/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, flashcards: [created, ...prev.flashcards] } : prev
    );
  };

  const updateFlashcard = async (
    id: number,
    patch: Partial<FlashcardItem> & { reviewed?: boolean }
  ) => {
    const updated = await apiRequest<FlashcardItem>(`/flashcards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            flashcards: prev.flashcards.map((f) => (f.id === id ? updated : f)),
          }
        : prev
    );
  };

  const deleteFlashcard = async (id: number) => {
    await apiRequest(`/flashcards/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? { ...prev, flashcards: prev.flashcards.filter((f) => f.id !== id) }
        : prev
    );
  };

  // PDFs & Folders
  const createFolder = async (name: string, parentId: number | null) => {
    const created = await apiRequest<PdfFolder>('/pdf-folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
    setWorkspace((prev) =>
      prev ? { ...prev, pdfFolders: [...prev.pdfFolders, created] } : prev
    );
    return created;
  };

  const renameFolder = async (id: number, name: string) => {
    const updated = await apiRequest<PdfFolder>(`/pdf-folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            pdfFolders: prev.pdfFolders.map((f) => (f.id === id ? updated : f)),
          }
        : prev
    );
  };

  const deleteFolder = async (id: number) => {
    await apiRequest(`/pdf-folders/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            pdfFolders: prev.pdfFolders.filter(
              (f) => f.id !== id && f.parentId !== id
            ),
            pdfDocuments: prev.pdfDocuments.map((d) =>
              d.folderId === id ? { ...d, folderId: null } : d
            ),
          }
        : prev
    );
  };

  const uploadPdf = async (formData: FormData) => {
    const created = await apiRequest<PdfDocument>('/pdfs/upload', {
      method: 'POST',
      body: formData,
    });
    setWorkspace((prev) =>
      prev ? { ...prev, pdfDocuments: [created, ...prev.pdfDocuments] } : prev
    );
    return created;
  };

  const updatePdf = async (id: number, patch: Partial<PdfDocument>) => {
    const updated = await apiRequest<PdfDocument>(`/pdfs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            pdfDocuments: prev.pdfDocuments.map((d) =>
              d.id === id ? updated : d
            ),
          }
        : prev
    );
  };

  const deletePdf = async (id: number) => {
    await apiRequest(`/pdfs/${id}`, { method: 'DELETE' });
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            pdfDocuments: prev.pdfDocuments.filter((d) => d.id !== id),
          }
        : prev
    );
  };

  return (
    <StudyContext.Provider
      value={{
        firebaseUser,
        authLoading,
        workspaceLoading,
        workspaceError,
        workspace,
        activeSection,
        setActiveSection,
        signInWithGoogle,
        signOut,
        refreshWorkspace: loadWorkspace,
        toast,
        showToast,
        timer,
        setTimerSubject,
        setTimerDescription,
        setTimerMode,
        setPomodoroDurations,
        startOrResumeTimer,
        pauseTimer,
        resetTimer,
        stopAndSaveTimer,
        updateProfile,
        addSubject,
        deleteSubject,
        addWeeklyPlan,
        deleteWeeklyPlan,
        addTask,
        updateTask,
        deleteTask,
        addExam,
        updateExam,
        deleteExam,
        addUpcomingExam,
        deleteUpcomingExam,
        saveFocusSession,
        deleteFocusSession,
        addNote,
        updateNote,
        deleteNote,
        addMistake,
        updateMistake,
        deleteMistake,
        addFlashcard,
        updateFlashcard,
        deleteFlashcard,
        createFolder,
        renameFolder,
        deleteFolder,
        uploadPdf,
        updatePdf,
        deletePdf,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used inside StudyProvider');
  return ctx;
}
