import React, { useState } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  GraduationCap,
  Timer,
  BookOpen,
  AlertCircle,
  Layers,
  BarChart3,
  Folder,
  Settings,
  LogOut,
  X,
  BookOpenCheck,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { SectionId } from '../types/study.ts';

const DEFAULT_AVATAR = '/src/assets/images/scholar_avatar_1794522425441.jpg';

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'todo', label: 'Weekly To-Do', icon: ListChecks },
  { id: 'exams', label: 'Exam Marks', icon: GraduationCap },
  { id: 'focus', label: 'Focus Tracker', icon: Timer },
  { id: 'notes', label: 'My Notes', icon: BookOpen },
  { id: 'mistakes', label: 'Important Mistakes', icon: AlertCircle },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'analytics', label: 'Quiz Statistics', icon: BarChart3 },
  { id: 'pdfs', label: 'PDF Collector Room', icon: Folder },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { workspace, activeSection, setActiveSection, signOut, timer } = useStudy();
  const [avatarError, setAvatarError] = useState(false);

  const profile = workspace?.profile;
  const avatarSrc =
    !avatarError && profile?.avatarUrl ? profile.avatarUrl : DEFAULT_AVATAR;

  const handleNav = (id: SectionId) => {
    setActiveSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white dark:bg-[#0C0C13] border-r border-zinc-200 dark:border-[#1E1D2D] w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200 dark:border-[#1E1D2D] shrink-0">
        <button
          type="button"
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <BookOpenCheck className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
            My Study Space
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-violet-600/12 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-[#9D99B3] dark:hover:text-white dark:hover:bg-[#161622]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-zinc-400 dark:text-[#736F8C]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'focus' && timer.isRunning && (
                <span className="text-[11px] font-mono tabular-nums text-violet-600 dark:text-violet-300">
                  Live
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-[#1E1D2D] shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50 dark:bg-[#12121C] border border-zinc-200/70 dark:border-[#1F1E30]">
          <img
            src={avatarSrc}
            alt={profile?.displayName || 'Scholar'}
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
            className="w-9 h-9 rounded-lg object-cover shrink-0 bg-zinc-200 dark:bg-[#1D1B2E]"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {profile?.displayName || 'Scholar'}
            </div>
            <div className="text-xs text-zinc-500 dark:text-[#86829E] truncate">
              {profile?.email || ''}
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
