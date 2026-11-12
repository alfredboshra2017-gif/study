import React, { useState } from 'react';
import {
  Download,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { AccentTheme, ThemeMode } from '../types/study.ts';

const DEFAULT_AVATAR = '/src/assets/images/scholar_avatar_1794522425441.jpg';

export function SettingsView() {
  const { workspace, updateProfile, addSubject, deleteSubject, showToast } =
    useStudy();

  const profile = workspace?.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [dailyGoal, setDailyGoal] = useState(
    String(profile?.dailyFocusGoalMinutes || 120)
  );
  const [pomoStudy, setPomoStudy] = useState(
    String(profile?.pomodoroStudyMinutes || 25)
  );
  const [pomoBreak, setPomoBreak] = useState(
    String(profile?.pomodoroBreakMinutes || 5)
  );
  const [saving, setSaving] = useState(false);

  const [newSubject, setNewSubject] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#8B5CF6');

  if (!workspace || !profile) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || profile.displayName,
        avatarUrl: avatarUrl.trim(),
        dailyFocusGoalMinutes: Math.max(15, Math.min(960, Number(dailyGoal) || 120)),
        pomodoroStudyMinutes: Math.max(5, Math.min(180, Number(pomoStudy) || 25)),
        pomodoroBreakMinutes: Math.max(1, Math.min(60, Number(pomoBreak) || 5)),
      });
      showToast('Profile and study preferences saved.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleThemeToggle = async (mode: ThemeMode) => {
    await updateProfile({ themeMode: mode });
    showToast(`Switched to ${mode} mode.`);
  };

  const handleAccentChange = async (accent: AccentTheme) => {
    await updateProfile({ accentTheme: accent });
    showToast('Accent theme updated.');
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    await addSubject(newSubject.trim(), newSubjectColor);
    setNewSubject('');
    showToast('Subject added.');
  };

  const handleExportCsv = () => {
    const rows = [
      ['Type', 'Subject', 'Title', 'Date', 'Value', 'Notes'],
      ...workspace.exams.map((e) => [
        e.examType,
        e.subjectName,
        e.examName,
        e.examDate,
        `${((e.obtainedMark / e.totalMark) * 100).toFixed(1)}% (${e.obtainedMark}/${e.totalMark})`,
        e.comments,
      ]),
      ...workspace.focusSessions.map((s) => [
        'Focus Session',
        s.subjectName,
        s.mode,
        s.sessionDate,
        `${Math.round(s.durationSeconds / 60)} min`,
        s.description,
      ]),
    ];

    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-study-space-stats-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Study statistics CSV exported.');
  };

  const handleBackupJson = async () => {
    try {
      const backup = await apiRequest<Record<string, unknown>>('/backup');
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-study-space-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Full study backup downloaded.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Backup failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Settings & Personalization
        </h1>
        <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
          Customize your profile, theme, focus durations, subjects, and backups
        </p>
      </div>

      {/* Profile & Timer Preferences */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-6"
      >
        <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
          Profile & Study Goals
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            src={avatarUrl || DEFAULT_AVATAR}
            alt="Profile avatar"
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-cover bg-zinc-200 dark:bg-[#1D1B2E] border border-zinc-200 dark:border-[#2B2940]"
          />
          <div className="space-y-2 flex-1">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:border-violet-500/50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Profile Picture</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
              Daily Focus Goal (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="960"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono tabular-nums text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
              Pomodoro Study Duration (min)
            </label>
            <input
              type="number"
              min="5"
              max="180"
              value={pomoStudy}
              onChange={(e) => setPomoStudy(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono tabular-nums text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
              Pomodoro Break Duration (min)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={pomoBreak}
              onChange={(e) => setPomoBreak(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono tabular-nums text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Theme & Mode */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-5">
        <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
          Appearance & Theme
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-600 dark:text-[#A39EBE]">
              Color Mode
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleThemeToggle('dark')}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 cursor-pointer ${
                  profile.themeMode === 'dark'
                    ? 'border-violet-500 bg-violet-600/12 text-violet-600 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeToggle('light')}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 cursor-pointer ${
                  profile.themeMode === 'light'
                    ? 'border-violet-500 bg-violet-600/12 text-violet-600 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-600 dark:text-[#A39EBE]">
              Purple Palette Theme
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'amethyst', label: 'Amethyst', swatch: '#7C3AED' },
                  { id: 'obsidian-violet', label: 'Obsidian', swatch: '#8B5CF6' },
                  { id: 'royal-plum', label: 'Royal Plum', swatch: '#A855F7' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAccentChange(t.id)}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                    profile.accentTheme === t.id
                      ? 'border-violet-500 bg-violet-600/12 text-violet-700 dark:text-violet-300'
                      : 'border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manage Subjects */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
        <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
          Manage Subjects ({workspace.subjects.length})
        </h2>

        <form onSubmit={handleAddSubject} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            required
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Add new subject (e.g., Organic Chemistry)..."
            className="flex-1 min-w-[200px] px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
          />
          <input
            type="color"
            value={newSubjectColor}
            onChange={(e) => setNewSubjectColor(e.target.value)}
            className="w-10 h-10 rounded-xl bg-transparent border border-zinc-200 dark:border-[#262438] cursor-pointer"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
          {workspace.subjects.map((s) => (
            <div
              key={s.id}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#161522] border border-zinc-200/80 dark:border-[#242336] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {s.name}
                </span>
              </div>
              {workspace.subjects.length > 1 && (
                <button
                  type="button"
                  onClick={() => deleteSubject(s.id)}
                  aria-label={`Remove ${s.name}`}
                  className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export & Backup */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
        <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
          Export & Data Backup
        </h2>
        <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
          Download your academic statistics as a spreadsheet CSV or export a complete
          JSON backup of all your study records.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#29273D] bg-white dark:bg-[#161522] hover:border-violet-500/50 text-zinc-800 dark:text-zinc-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Study Statistics (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleBackupJson}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Back Up All Study Data (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
