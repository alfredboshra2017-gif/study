import React, { useState } from 'react';
import { Menu, Moon, Sun, Timer } from 'lucide-react';
import { StudyProvider, useStudy } from './context/StudyContext.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { WeeklyTodoView } from './views/WeeklyTodoView.tsx';
import { ExamMarksView } from './views/ExamMarksView.tsx';
import { FocusTrackerView } from './views/FocusTrackerView.tsx';
import { NotesView } from './views/NotesView.tsx';
import { MistakesView } from './views/MistakesView.tsx';
import { FlashcardsView } from './views/FlashcardsView.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { PdfCollectorView } from './views/PdfCollectorView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { SectionId } from './types/study.ts';

const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: 'Dashboard',
  todo: 'Weekly To-Do',
  exams: 'Exam Marks',
  focus: 'Focus Tracker',
  notes: 'My Notes',
  mistakes: 'Important Mistakes',
  flashcards: 'Flashcards',
  analytics: 'Quiz Statistics',
  pdfs: 'PDF Collector Room',
  settings: 'Settings',
};

function formatShortClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function StudyShell() {
  const {
    firebaseUser,
    authLoading,
    workspaceLoading,
    workspaceError,
    workspace,
    activeSection,
    setActiveSection,
    refreshWorkspace,
    updateProfile,
    toast,
    timer,
  } = useStudy();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#08080C] text-zinc-400 flex items-center justify-center text-sm">
        Loading My Study Space...
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthGate />;
  }

  if (workspaceLoading && !workspace) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#08080C] text-zinc-500 dark:text-zinc-400 flex items-center justify-center text-sm">
        Synchronizing your personal academic database...
      </div>
    );
  }

  if (workspaceError && !workspace) {
    return (
      <div className="min-h-screen bg-[#08080C] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#12121C] border border-[#262438] space-y-4 text-center">
          <h2 className="font-display text-lg font-semibold">
            Unable to load workspace
          </h2>
          <p className="text-sm text-zinc-400">{workspaceError}</p>
          <button
            type="button"
            onClick={refreshWorkspace}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const isDark = (workspace?.profile.themeMode || 'dark') === 'dark';

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'todo':
        return <WeeklyTodoView />;
      case 'exams':
        return <ExamMarksView />;
      case 'focus':
        return <FocusTrackerView />;
      case 'notes':
        return <NotesView />;
      case 'mistakes':
        return <MistakesView />;
      case 'flashcards':
        return <FlashcardsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'pdfs':
        return <PdfCollectorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6FB] dark:bg-[#08080C] text-zinc-900 dark:text-[#F4F3F8] transition-colors">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Workspace Bar */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-8 bg-[#F7F6FB]/90 dark:bg-[#08080C]/90 backdrop-blur-md border-b border-zinc-200 dark:border-[#1E1D2D] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl border border-zinc-200 dark:border-[#242336] text-zinc-700 dark:text-zinc-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-zinc-500 dark:text-[#8E8AA8] flex items-center gap-2 truncate">
              <span className="hidden sm:inline">My Study Space</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-zinc-900 dark:text-white truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {timer.hasStarted && (
              <button
                type="button"
                onClick={() => setActiveSection('focus')}
                className="px-3 py-1.5 rounded-xl bg-violet-600/12 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-mono tabular-nums flex items-center gap-2 cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>
                  {timer.mode === 'Stopwatch'
                    ? formatShortClock(timer.elapsedSeconds)
                    : formatShortClock(timer.pomodoroRemainingSeconds)}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                updateProfile({ themeMode: isDark ? 'light' : 'dark' })
              }
              aria-label="Toggle color mode"
              className="p-2 rounded-xl border border-zinc-200 dark:border-[#242336] bg-white dark:bg-[#11111A] text-zinc-600 dark:text-zinc-300 hover:border-violet-500/50 transition-colors cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {renderSection()}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-100'
              : 'bg-zinc-900 dark:bg-[#19172B] border-violet-500/40 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StudyProvider>
      <StudyShell />
    </StudyProvider>
  );
}
