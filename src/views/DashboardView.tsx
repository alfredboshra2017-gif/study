import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Folder,
  GraduationCap,
  Layers,
  ListChecks,
  Plus,
  Timer,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { BarComparisonChart } from '../components/Charts.tsx';
import { SectionId } from '../types/study.ts';

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function DashboardView() {
  const { workspace, setActiveSection, addUpcomingExam, showToast } = useStudy();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [examType, setExamType] = useState('Quiz');
  const [examNotes, setExamNotes] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = useMemo(() => {
    if (!workspace) {
      return {
        completedTasks: 0,
        remainingTasks: 0,
        weeklyCompletionPct: 0,
        totalFocusSec: 0,
        todayFocusSec: 0,
        avgQuizPct: null as number | null,
        totalNotes: 0,
        totalMistakes: 0,
        masteredMistakes: 0,
        weeklyFocusBars: [] as { label: string; value: number; subtitle: string }[],
      };
    }

    const completedTasks = workspace.tasks.filter((t) => t.completed).length;
    const remainingTasks = workspace.tasks.filter((t) => !t.completed).length;

    const latestPlan = workspace.weeklyPlans[0];
    const currentPlanTasks = latestPlan
      ? workspace.tasks.filter((t) => t.weeklyPlanId === latestPlan.id)
      : workspace.tasks;
    const weeklyCompletionPct =
      currentPlanTasks.length > 0
        ? Math.round(
            (currentPlanTasks.filter((t) => t.completed).length /
              currentPlanTasks.length) *
              100
          )
        : 0;

    const totalFocusSec = workspace.focusSessions.reduce(
      (acc, s) => acc + s.durationSeconds,
      0
    );
    const todayFocusSec = workspace.focusSessions
      .filter((s) => s.sessionDate === todayStr)
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    const quizRecords = workspace.exams.filter(
      (e) => e.examType.toLowerCase() === 'quiz'
    );
    const avgSource = quizRecords.length > 0 ? quizRecords : workspace.exams;
    const avgQuizPct =
      avgSource.length > 0
        ? avgSource.reduce(
            (acc, e) => acc + (e.obtainedMark / e.totalMark) * 100,
            0
          ) / avgSource.length
        : null;

    const totalNotes = workspace.notes.length;
    const totalMistakes = workspace.mistakes.length;
    const masteredMistakes = workspace.mistakes.filter(
      (m) => m.status === 'Mastered'
    ).length;

    // Last 7 days focus minutes
    const weeklyFocusBars: { label: string; value: number; subtitle: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const mins = Math.round(
        workspace.focusSessions
          .filter((s) => s.sessionDate === iso)
          .reduce((sum, s) => sum + s.durationSeconds, 0) / 60
      );
      weeklyFocusBars.push({
        label: dayLabel,
        value: mins,
        subtitle: `${iso} · ${mins} min`,
      });
    }

    return {
      completedTasks,
      remainingTasks,
      weeklyCompletionPct,
      totalFocusSec,
      todayFocusSec,
      avgQuizPct,
      totalNotes,
      totalMistakes,
      masteredMistakes,
      weeklyFocusBars,
    };
  }, [workspace, todayStr]);

  if (!workspace) return null;

  const upcomingDeadlines = [
    ...workspace.upcomingExams.map((u) => ({
      id: `exam-${u.id}`,
      kind: 'Exam',
      title: u.title,
      subject: u.subjectName,
      date: u.examDate,
      meta: u.examType,
    })),
    ...workspace.tasks
      .filter((t) => !t.completed)
      .map((t) => ({
        id: `task-${t.id}`,
        kind: 'Task',
        title: t.title,
        subject: t.subjectName,
        date: t.deadline,
        meta: `${t.priority} priority`,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;
    setSavingExam(true);
    try {
      await addUpcomingExam({
        subjectName: examSubject,
        title: examTitle.trim(),
        examDate,
        examType,
        notes: examNotes.trim(),
      });
      setExamTitle('');
      setExamNotes('');
      setShowScheduleModal(false);
      showToast('Upcoming exam scheduled.');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Failed to schedule exam.',
        'error'
      );
    } finally {
      setSavingExam(false);
    }
  };

  const dailyGoalMins = workspace.profile.dailyFocusGoalMinutes || 120;
  const todayMins = Math.round(stats.todayFocusSec / 60);
  const goalPct = Math.min(100, Math.round((todayMins / dailyGoalMins) * 100));

  const quickLinks: {
    id: SectionId;
    label: string;
    detail: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'todo',
      label: 'Weekly To-Do',
      detail: `${stats.remainingTasks} remaining`,
      icon: ListChecks,
    },
    {
      id: 'exams',
      label: 'Exam Marks',
      detail: `${workspace.exams.length} recorded`,
      icon: GraduationCap,
    },
    {
      id: 'focus',
      label: 'Focus Tracker',
      detail: `${todayMins}m today`,
      icon: Timer,
    },
    {
      id: 'notes',
      label: 'My Notes',
      detail: `${stats.totalNotes} saved`,
      icon: BookOpen,
    },
    {
      id: 'mistakes',
      label: 'Important Mistakes',
      detail: `${stats.totalMistakes} logged`,
      icon: AlertCircle,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      detail: `${workspace.flashcards.length} cards`,
      icon: Layers,
    },
    {
      id: 'analytics',
      label: 'Quiz Statistics',
      detail: stats.avgQuizPct !== null ? `${stats.avgQuizPct.toFixed(1)}% avg` : 'No scores yet',
      icon: BarChart3,
    },
    {
      id: 'pdfs',
      label: 'PDF Collector Room',
      detail: `${workspace.pdfDocuments.length} files`,
      icon: Folder,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-[#1E1D2D]">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
            {todayFormatted}
          </p>
          <h1
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white"
            style={{ textWrap: 'balance' }}
          >
            Welcome back, {workspace.profile.displayName}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-[#9692AF]">
            Daily focus goal: {todayMins} / {dailyGoalMins} minutes ({goalPct}%)
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('focus')}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Timer className="w-4 h-4" />
            <span>Start Focus Session</span>
          </button>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#29273D] bg-white dark:bg-[#13131E] hover:border-violet-500/50 text-zinc-800 dark:text-zinc-200 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Exam</span>
          </button>
        </div>
      </div>

      {/* 6 Core Academic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {stats.completedTasks}
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#8E8AA8] tabular-nums">
              / {stats.completedTasks + stats.remainingTasks} total
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>Remaining Tasks</span>
            <ListChecks className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {stats.remainingTasks}
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
              pending deadlines
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>Total Focus Time</span>
            <Clock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {formatDuration(stats.totalFocusSec)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#8E8AA8] tabular-nums">
              {workspace.focusSessions.length} sessions
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>Average Quiz Marks</span>
            <GraduationCap className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {stats.avgQuizPct !== null ? `${stats.avgQuizPct.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#8E8AA8] tabular-nums">
              {workspace.exams.length} assessments
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>Saved Study Notes</span>
            <BookOpen className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {stats.totalNotes}
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#8E8AA8] tabular-nums">
              {workspace.notes.filter((n) => n.pinned).length} pinned
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>Important Mistakes</span>
            <AlertCircle className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {stats.totalMistakes}
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#8E8AA8] tabular-nums">
              {stats.masteredMistakes} mastered
            </span>
          </div>
        </div>
      </div>

      {/* Main Analytics & Upcoming Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Weekly Study Progress & 7-Day Focus Chart */}
        <div className="xl:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Weekly Study Progress
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#8E8AA8] mt-0.5">
                Focus minutes logged over the last 7 days · Dashed line indicates {dailyGoalMins}m daily goal
              </p>
            </div>
            <span className="text-sm font-mono tabular-nums font-semibold text-violet-600 dark:text-violet-300">
              {stats.weeklyCompletionPct}% tasks done
            </span>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-[#1D1C2C] overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-300"
                style={{ width: `${stats.weeklyCompletionPct}%` }}
              />
            </div>
          </div>

          <BarComparisonChart
            data={stats.weeklyFocusBars}
            maxValue={Math.max(dailyGoalMins, 60)}
            unit="m"
            goalLine={dailyGoalMins}
          />
        </div>

        {/* Upcoming Exams & Deadlines */}
        <div className="xl:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Upcoming Exams & Deadlines
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#8E8AA8] mt-0.5">
                Sorted chronologically across tasks and exams
              </p>
            </div>
            <Calendar className="w-4 h-4 text-zinc-400 dark:text-[#787494]" />
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-3">
              <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
                No upcoming tasks or exams scheduled yet.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('todo')}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-violet-600/10 text-violet-600 dark:text-violet-300 hover:bg-violet-600/20 transition-colors cursor-pointer"
              >
                Plan Weekly Tasks
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
              {upcomingDeadlines.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-[#8B87A6] flex items-center gap-1.5 mt-0.5">
                      <span>{item.kind}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.meta}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-violet-600 dark:text-violet-300 shrink-0">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveSection('todo')}
            className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-[#242338] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-violet-500/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Weekly To-Do</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveSection(q.id)}
                className="group p-4 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] hover:border-violet-500/60 transition-all text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/10 dark:bg-violet-500/12 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {q.label}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-[#8B87A6] tabular-nums truncate">
                      {q.detail}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Upcoming Exam Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Schedule Upcoming Exam
              </h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleExam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g., Linear Algebra Midterm"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                  >
                    {workspace.subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Quiz">Quiz</option>
                    <option value="Monthly Exam">Monthly Exam</option>
                    <option value="Midterm">Midterm</option>
                    <option value="Final Exam">Final Exam</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Exam Date
                </label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Topics / Notes
                </label>
                <textarea
                  rows={2}
                  value={examNotes}
                  onChange={(e) => setExamNotes(e.target.value)}
                  placeholder="Chapters 1–4, review proof techniques..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExam}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer disabled:opacity-60"
                >
                  {savingExam ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
