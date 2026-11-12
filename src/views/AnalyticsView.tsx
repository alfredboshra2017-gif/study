import React, { useMemo } from 'react';
import { Award, TrendingDown, TrendingUp } from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { BarComparisonChart, LinePerformanceChart } from '../components/Charts.tsx';

export function AnalyticsView() {
  const { workspace, setActiveSection } = useStudy();

  const analytics = useMemo(() => {
    const exams = workspace?.exams || [];
    const quizzes = exams.filter((e) => e.examType === 'Quiz');

    const toPct = (e: (typeof exams)[number]) =>
      (e.obtainedMark / e.totalMark) * 100;

    const quizPcts = quizzes.map(toPct);
    const overallQuizAvg =
      quizPcts.length > 0
        ? quizPcts.reduce((a, b) => a + b, 0) / quizPcts.length
        : null;
    const highestQuiz = quizPcts.length > 0 ? Math.max(...quizPcts) : null;
    const lowestQuiz = quizPcts.length > 0 ? Math.min(...quizPcts) : null;

    // Subject stats across all exams
    const subjectMap = new Map<string, number[]>();
    for (const e of exams) {
      const arr = subjectMap.get(e.subjectName) || [];
      arr.push(toPct(e));
      subjectMap.set(e.subjectName, arr);
    }

    const subjectStats = Array.from(subjectMap.entries())
      .map(([subject, pcts]) => ({
        subject,
        avg: pcts.reduce((a, b) => a + b, 0) / pcts.length,
        highest: Math.max(...pcts),
        lowest: Math.min(...pcts),
        count: pcts.length,
      }))
      .sort((a, b) => b.avg - a.avg);

    const bestSubject = subjectStats[0] || null;
    const weakestSubject =
      subjectStats.length > 0 ? subjectStats[subjectStats.length - 1] : null;

    // 1. Line chart: marks over time (chronological)
    const chronological = [...exams].sort(
      (a, b) => a.examDate.localeCompare(b.examDate) || a.id - b.id
    );
    const marksOverTime = chronological.map((e) => ({
      label: e.examDate.slice(5),
      value: toPct(e),
      subtitle: `${e.subjectName} · ${e.examName}`,
    }));

    // 2. Bar chart: subject comparison
    const subjectColorMap = new Map(
      (workspace?.subjects || []).map((s) => [s.name, s.color])
    );
    const subjectBars = subjectStats.map((s) => ({
      label: s.subject,
      value: s.avg,
      color: subjectColorMap.get(s.subject) || '#8B5CF6',
      subtitle: `${s.count} ${s.count === 1 ? 'record' : 'records'}`,
    }));

    // 3. Monthly performance comparison
    const monthMap = new Map<string, number[]>();
    for (const e of chronological) {
      const ym = e.examDate.slice(0, 7);
      const arr = monthMap.get(ym) || [];
      arr.push(toPct(e));
      monthMap.set(ym, arr);
    }
    const monthlyBars = Array.from(monthMap.entries()).map(([ym, vals]) => ({
      label: ym,
      value: vals.reduce((a, b) => a + b, 0) / vals.length,
      color: '#A855F7',
      subtitle: `${vals.length} assessments`,
    }));

    // 4. Weekly quiz performance
    const weekMap = new Map<string, number[]>();
    const quizChron = chronological.filter((e) => e.examType === 'Quiz');
    const weeklySource = quizChron.length > 0 ? quizChron : chronological;
    for (const e of weeklySource) {
      const dt = new Date(e.examDate + 'T00:00:00');
      const day = dt.getDay();
      const mon = new Date(dt);
      mon.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
      const key = mon.toISOString().slice(5, 10);
      const arr = weekMap.get(key) || [];
      arr.push(toPct(e));
      weekMap.set(key, arr);
    }
    const weeklyQuizBars = Array.from(weekMap.entries())
      .slice(-8)
      .map(([wk, vals]) => ({
        label: `Wk ${wk}`,
        value: vals.reduce((a, b) => a + b, 0) / vals.length,
        color: '#7C3AED',
        subtitle: `${vals.length} quizzes`,
      }));

    return {
      totalQuizzes: quizzes.length,
      totalExams: exams.length,
      overallQuizAvg,
      highestQuiz,
      lowestQuiz,
      subjectStats,
      bestSubject,
      weakestSubject,
      marksOverTime,
      subjectBars,
      monthlyBars,
      weeklyQuizBars,
    };
  }, [workspace]);

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Quiz Statistics & Academic Analytics
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Automatically calculated from your Exam Marks Manager records
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('exams')}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium self-start cursor-pointer"
        >
          Manage Exam Marks
        </button>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Total Quizzes
          </div>
          <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {analytics.totalQuizzes}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Overall Quiz Average
          </div>
          <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-violet-600 dark:text-violet-300">
            {analytics.overallQuizAvg !== null
              ? `${analytics.overallQuizAvg.toFixed(1)}%`
              : '—'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Highest Quiz Mark
          </div>
          <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {analytics.highestQuiz !== null
              ? `${analytics.highestQuiz.toFixed(1)}%`
              : '—'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Lowest Quiz Mark
          </div>
          <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {analytics.lowestQuiz !== null
              ? `${analytics.lowestQuiz.toFixed(1)}%`
              : '—'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Total Assessments
          </div>
          <div className="mt-2 text-2xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {analytics.totalExams}
          </div>
        </div>
      </div>

      {/* Best & Weakest Subject Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500 dark:text-[#8E8AA8] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Best-Performing Subject</span>
            </div>
            <div className="mt-1.5 font-display text-lg font-bold text-zinc-900 dark:text-white">
              {analytics.bestSubject ? analytics.bestSubject.subject : '—'}
            </div>
          </div>
          <span className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {analytics.bestSubject
              ? `${analytics.bestSubject.avg.toFixed(1)}%`
              : '—'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500 dark:text-[#8E8AA8] flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
              <span>Subject Needing Attention</span>
            </div>
            <div className="mt-1.5 font-display text-lg font-bold text-zinc-900 dark:text-white">
              {analytics.weakestSubject ? analytics.weakestSubject.subject : '—'}
            </div>
          </div>
          <span className="font-mono tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400">
            {analytics.weakestSubject
              ? `${analytics.weakestSubject.avg.toFixed(1)}%`
              : '—'}
          </span>
        </div>
      </div>

      {/* 4 Performance Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Marks Over Time
          </h2>
          <LinePerformanceChart data={analytics.marksOverTime} />
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Subject Average Comparison
          </h2>
          <BarComparisonChart data={analytics.subjectBars} maxValue={100} unit="%" />
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Monthly Performance Comparison
          </h2>
          <BarComparisonChart data={analytics.monthlyBars} maxValue={100} unit="%" />
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Weekly Quiz Performance
          </h2>
          <BarComparisonChart data={analytics.weeklyQuizBars} maxValue={100} unit="%" />
        </div>
      </div>

      {/* Subject Statistics Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-violet-500" />
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Subject Breakdown
          </h2>
        </div>

        {analytics.subjectStats.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8] py-6 text-center">
            Enter marks in Exam Marks Manager to populate subject analytics automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-[#222033] text-xs text-zinc-500 dark:text-[#8E8AA8]">
                  <th className="py-2.5 pr-4 font-medium">Subject</th>
                  <th className="py-2.5 px-4 font-medium text-right">Records</th>
                  <th className="py-2.5 px-4 font-medium text-right">Average</th>
                  <th className="py-2.5 px-4 font-medium text-right">Highest</th>
                  <th className="py-2.5 pl-4 font-medium text-right">Lowest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
                {analytics.subjectStats.map((s) => (
                  <tr key={s.subject}>
                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-white">
                      {s.subject}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-600 dark:text-zinc-300">
                      {s.count}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-violet-600 dark:text-violet-300">
                      {s.avg.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-emerald-600 dark:text-emerald-400">
                      {s.highest.toFixed(1)}%
                    </td>
                    <td className="py-3 pl-4 font-mono tabular-nums text-right text-amber-600 dark:text-amber-400">
                      {s.lowest.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
