import React, { useMemo, useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Plus,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { BarComparisonChart } from '../components/Charts.tsx';

function formatClock(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

function formatHoursMinutes(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function FocusTrackerView() {
  const {
    workspace,
    timer,
    setTimerSubject,
    setTimerDescription,
    setTimerMode,
    setPomodoroDurations,
    startOrResumeTimer,
    pauseTimer,
    resetTimer,
    stopAndSaveTimer,
    saveFocusSession,
    deleteFocusSession,
    updateProfile,
    showToast,
  } = useStudy();

  const [goalInput, setGoalInput] = useState(
    String(workspace?.profile.dailyFocusGoalMinutes || 120)
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubject, setManualSubject] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [manualMinutes, setManualMinutes] = useState('45');
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [manualDesc, setManualDesc] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const sessions = workspace?.focusSessions || [];
    const todaySeconds = sessions
      .filter((s) => s.sessionDate === todayStr)
      .reduce((sum, s) => sum + s.durationSeconds, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    const weekSeconds = sessions
      .filter((s) => s.sessionDate >= weekAgoStr)
      .reduce((sum, s) => sum + s.durationSeconds, 0);

    const bySubjectMap = new Map<string, number>();
    for (const s of sessions) {
      bySubjectMap.set(
        s.subjectName,
        (bySubjectMap.get(s.subjectName) || 0) + s.durationSeconds
      );
    }

    const bySubject = Array.from(bySubjectMap.entries())
      .map(([subject, seconds]) => ({
        label: subject,
        value: Math.round(seconds / 60),
        seconds,
        subtitle: formatHoursMinutes(seconds),
      }))
      .sort((a, b) => b.seconds - a.seconds);

    return { todaySeconds, weekSeconds, bySubject };
  }, [workspace?.focusSessions, todayStr]);

  if (!workspace) return null;

  const dailyGoalMins = workspace.profile.dailyFocusGoalMinutes || 120;
  const todayMins = Math.round(stats.todaySeconds / 60);
  const goalPct = Math.min(100, Math.round((todayMins / dailyGoalMins) * 100));

  const displayClock =
    timer.mode === 'Stopwatch'
      ? formatClock(timer.elapsedSeconds)
      : formatClock(timer.pomodoroRemainingSeconds);

  const handleSaveGoal = async () => {
    const val = Number(goalInput);
    if (!Number.isFinite(val) || val < 15 || val > 960) {
      showToast('Daily goal must be between 15 and 960 minutes.', 'error');
      return;
    }
    await updateProfile({ dailyFocusGoalMinutes: Math.round(val) });
    showToast('Daily focus goal updated.');
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(manualMinutes);
    if (!Number.isFinite(mins) || mins <= 0) return;
    await saveFocusSession({
      subjectName: manualSubject,
      sessionDate: manualDate,
      durationSeconds: Math.round(mins * 60),
      mode: 'Stopwatch',
      description: manualDesc.trim() || 'Manual study log',
    });
    setManualDesc('');
    setManualOpen(false);
    showToast('Study session logged.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Focus Time Tracker
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Stopwatch & Pomodoro focus timers synced with your subject study log
          </p>
        </div>

        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#29273D] bg-white dark:bg-[#13131E] hover:border-violet-500/50 text-zinc-800 dark:text-zinc-200 text-sm font-medium flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Past Session</span>
        </button>
      </div>

      {manualOpen && (
        <form
          onSubmit={handleManualLog}
          className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-zinc-500 dark:text-[#8E8AA8] mb-1">
              Subject
            </label>
            <select
              value={manualSubject}
              onChange={(e) => setManualSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
            >
              {workspace.subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-[#8E8AA8] mb-1">
              Duration (min)
            </label>
            <input
              type="number"
              min="1"
              max="600"
              required
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono tabular-nums text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-[#8E8AA8] mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-[#8E8AA8] mb-1">
              What did you study?
            </label>
            <input
              type="text"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Topic summary..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
          >
            Save Log
          </button>
        </form>
      )}

      {/* Timer Stage + Daily Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Timer Card */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#161522] border border-zinc-200 dark:border-[#242336]">
              <button
                type="button"
                onClick={() => setTimerMode('Stopwatch')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  timer.mode === 'Stopwatch'
                    ? 'bg-white dark:bg-[#242238] text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-[#8E8AA8]'
                }`}
              >
                Focus Stopwatch
              </button>
              <button
                type="button"
                onClick={() => setTimerMode('Pomodoro')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  timer.mode === 'Pomodoro'
                    ? 'bg-white dark:bg-[#242238] text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-[#8E8AA8]'
                }`}
              >
                Pomodoro Timer
              </button>
            </div>

            {timer.mode === 'Pomodoro' && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#9692AF]">
                <span>Study</span>
                <input
                  type="number"
                  min="5"
                  max="120"
                  disabled={timer.isRunning}
                  value={timer.pomodoroStudyMins}
                  onChange={(e) =>
                    setPomodoroDurations(
                      Math.max(5, Number(e.target.value) || 25),
                      timer.pomodoroBreakMins
                    )
                  }
                  className="w-14 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-center font-mono tabular-nums text-zinc-900 dark:text-white"
                />
                <span>m · Break</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  disabled={timer.isRunning}
                  value={timer.pomodoroBreakMins}
                  onChange={(e) =>
                    setPomodoroDurations(
                      timer.pomodoroStudyMins,
                      Math.max(1, Number(e.target.value) || 5)
                    )
                  }
                  className="w-14 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-center font-mono tabular-nums text-zinc-900 dark:text-white"
                />
                <span>m</span>
              </div>
            )}
          </div>

          {/* Clock Readout */}
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 border-y border-zinc-100 dark:border-[#1E1C2E]">
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
              {timer.mode === 'Pomodoro'
                ? timer.pomodoroPhase === 'study'
                  ? 'Study Phase'
                  : 'Break Phase'
                : 'Continuous Focus'}
              {timer.hasStarted && timer.mode === 'Pomodoro' && (
                <span> · Logged {formatClock(timer.elapsedSeconds)}</span>
              )}
            </div>
            <div className="font-mono tabular-nums text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {displayClock}
            </div>
          </div>

          {/* Subject & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-[#8E8AA8] mb-1.5">
                Subject
              </label>
              <select
                value={timer.subjectName}
                onChange={(e) => setTimerSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
              >
                {workspace.subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-[#8E8AA8] mb-1.5">
                Study Focus Note
              </label>
              <input
                type="text"
                value={timer.description}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="What are you studying?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!timer.isRunning ? (
              <button
                type="button"
                onClick={startOrResumeTimer}
                className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>{timer.hasStarted ? 'Resume' : 'Start Focus'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseTimer}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            {timer.hasStarted && (
              <>
                <button
                  type="button"
                  onClick={stopAndSaveTimer}
                  className="px-5 py-3 rounded-xl bg-zinc-900 dark:bg-[#222036] hover:bg-zinc-800 dark:hover:bg-[#2D2A45] text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop & Save</span>
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300 text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Daily Goal & Time Metrics */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
                Daily Focus Goal
              </h2>
              <span className="font-mono tabular-nums text-sm font-semibold text-violet-600 dark:text-violet-300">
                {goalPct}%
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-[#1D1C2C] overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-300"
                style={{ width: `${goalPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
              <span className="tabular-nums">
                Today: {todayMins} min ({formatHoursMinutes(stats.todaySeconds)})
              </span>
              <span className="tabular-nums">Goal: {dailyGoalMins} min</span>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-[#1E1C2E] flex items-center gap-2">
              <input
                type="number"
                min="15"
                max="960"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-mono tabular-nums text-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleSaveGoal}
                className="px-3.5 py-1.5 rounded-xl bg-violet-600/12 text-violet-700 dark:text-violet-300 hover:bg-violet-600/20 text-xs font-medium cursor-pointer"
              >
                Update Goal (min)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
              <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
                Today's Study Time
              </div>
              <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatHoursMinutes(stats.todaySeconds)}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
              <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
                Last 7 Days
              </div>
              <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatHoursMinutes(stats.weekSeconds)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Focus Breakdown Chart + Session History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Focus Minutes by Subject
          </h2>
          <BarComparisonChart
            data={stats.bySubject}
            maxValue={Math.max(...stats.bySubject.map((b) => b.value), 60)}
            unit="m"
          />
        </div>

        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Session History ({workspace.focusSessions.length})
          </h2>

          {workspace.focusSessions.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-[#8E8AA8] py-10 text-center">
              Start the focus timer or log a past session to build your study history.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#1D1B2B] max-h-[340px] overflow-y-auto pr-1">
              {workspace.focusSessions.map((s) => (
                <div
                  key={s.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {s.subjectName}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-[#8E8AA8] truncate">
                      {s.sessionDate} · {s.mode}
                      {s.description ? ` · ${s.description}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono tabular-nums text-sm font-semibold text-violet-600 dark:text-violet-300">
                      {formatClock(s.durationSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteFocusSession(s.id)}
                      aria-label="Delete session"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
