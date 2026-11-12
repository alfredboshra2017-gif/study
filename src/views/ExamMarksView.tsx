import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { ExamRecord } from '../types/study.ts';

const EXAM_TYPES: ExamRecord['examType'][] = [
  'Quiz',
  'Monthly Exam',
  'Midterm',
  'Final Exam',
  'Homework',
  'Lab',
];

export function ExamMarksView() {
  const {
    workspace,
    addExam,
    updateExam,
    deleteExam,
    addUpcomingExam,
    deleteUpcomingExam,
    showToast,
  } = useStudy();

  const [tab, setTab] = useState<'marks' | 'upcoming'>('marks');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Exam form modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExamRecord | null>(null);
  const [subjectName, setSubjectName] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [obtainedMark, setObtainedMark] = useState('');
  const [totalMark, setTotalMark] = useState('100');
  const [examType, setExamType] = useState<ExamRecord['examType']>('Quiz');
  const [comments, setComments] = useState('');

  // Upcoming exam form
  const [upTitle, setUpTitle] = useState('');
  const [upSubject, setUpSubject] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [upDate, setUpDate] = useState(new Date().toISOString().slice(0, 10));
  const [upType, setUpType] = useState('Quiz');
  const [upNotes, setUpNotes] = useState('');

  const metrics = useMemo(() => {
    const exams = workspace?.exams || [];
    if (exams.length === 0) {
      return {
        overallAvg: null as number | null,
        highest: null as number | null,
        lowest: null as number | null,
        bySubject: [] as { subject: string; avg: number; count: number }[],
        deltaById: new Map<number, number | null>(),
      };
    }

    const withPct = exams.map((e) => ({
      ...e,
      pct: (e.obtainedMark / e.totalMark) * 100,
    }));

    const overallAvg =
      withPct.reduce((acc, e) => acc + e.pct, 0) / withPct.length;
    const highest = Math.max(...withPct.map((e) => e.pct));
    const lowest = Math.min(...withPct.map((e) => e.pct));

    const map = new Map<string, number[]>();
    for (const e of withPct) {
      const arr = map.get(e.subjectName) || [];
      arr.push(e.pct);
      map.set(e.subjectName, arr);
    }
    const bySubject = Array.from(map.entries()).map(([subject, vals]) => ({
      subject,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length,
    }));

    // Compare each exam against chronologically previous exam in same subject
    const chronological = [...withPct].sort(
      (a, b) => a.examDate.localeCompare(b.examDate) || a.id - b.id
    );
    const prevBySubject = new Map<string, number>();
    const deltaById = new Map<number, number | null>();
    for (const e of chronological) {
      const prev = prevBySubject.get(e.subjectName);
      deltaById.set(e.id, prev !== undefined ? e.pct - prev : null);
      prevBySubject.set(e.subjectName, e.pct);
    }

    return { overallAvg, highest, lowest, bySubject, deltaById };
  }, [workspace?.exams]);

  if (!workspace) return null;

  const filteredExams = workspace.exams.filter((e) => {
    if (subjectFilter !== 'All' && e.subjectName !== subjectFilter) return false;
    if (typeFilter !== 'All' && e.examType !== typeFilter) return false;
    return true;
  });

  const openAddModal = () => {
    setEditing(null);
    setSubjectName(workspace.subjects[0]?.name || 'Mathematics');
    setExamName('');
    setExamDate(new Date().toISOString().slice(0, 10));
    setObtainedMark('');
    setTotalMark('100');
    setExamType('Quiz');
    setComments('');
    setShowModal(true);
  };

  const openEditModal = (rec: ExamRecord) => {
    setEditing(rec);
    setSubjectName(rec.subjectName);
    setExamName(rec.examName);
    setExamDate(rec.examDate);
    setObtainedMark(String(rec.obtainedMark));
    setTotalMark(String(rec.totalMark));
    setExamType(rec.examType);
    setComments(rec.comments);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const obtained = Number(obtainedMark);
    const total = Number(totalMark);
    if (!examName.trim() || !Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0 || obtained < 0 || obtained > total) {
      showToast('Obtained mark must be between 0 and total mark.', 'error');
      return;
    }
    try {
      if (editing) {
        await updateExam(editing.id, {
          subjectName,
          examName: examName.trim(),
          examDate,
          obtainedMark: obtained,
          totalMark: total,
          examType,
          comments: comments.trim(),
        });
        showToast('Exam mark updated.');
      } else {
        await addExam({
          subjectName,
          examName: examName.trim(),
          examDate,
          obtainedMark: obtained,
          totalMark: total,
          examType,
          comments: comments.trim(),
        });
        showToast('Exam mark saved and analytics updated.');
      }
      setShowModal(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    }
  };

  const handleAddUpcoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle.trim()) return;
    try {
      await addUpcomingExam({
        subjectName: upSubject,
        title: upTitle.trim(),
        examDate: upDate,
        examType: upType,
        notes: upNotes.trim(),
      });
      setUpTitle('');
      setUpNotes('');
      showToast('Upcoming exam scheduled.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to add.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Exam Marks Manager
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Record quizzes and exams manually with automatic averages and comparisons
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#141320] border border-zinc-200 dark:border-[#242336]">
            <button
              type="button"
              onClick={() => setTab('marks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'marks'
                  ? 'bg-white dark:bg-[#222036] text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-[#8E8AA8]'
              }`}
            >
              Recorded Marks
            </button>
            <button
              type="button"
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'upcoming'
                  ? 'bg-white dark:bg-[#222036] text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-[#8E8AA8]'
              }`}
            >
              Upcoming Schedule ({workspace.upcomingExams.length})
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Mark</span>
          </button>
        </div>
      </div>

      {tab === 'marks' ? (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
              <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
                Overall Academic Average
              </div>
              <div className="mt-2 text-3xl font-display font-bold font-mono tabular-nums text-violet-600 dark:text-violet-300">
                {metrics.overallAvg !== null ? `${metrics.overallAvg.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
              <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
                Highest Mark
              </div>
              <div className="mt-2 text-3xl font-display font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {metrics.highest !== null ? `${metrics.highest.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
              <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
                Lowest Mark
              </div>
              <div className="mt-2 text-3xl font-display font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {metrics.lowest !== null ? `${metrics.lowest.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Subject Averages */}
          {metrics.bySubject.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-3">
              <h2 className="font-display text-sm font-semibold text-zinc-900 dark:text-white">
                Subject Averages
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.bySubject.map((item) => (
                  <div
                    key={item.subject}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#161522] border border-zinc-200/80 dark:border-[#242336]"
                  >
                    <div className="text-xs font-medium text-zinc-600 dark:text-[#A4A0BD] truncate">
                      {item.subject}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-mono tabular-nums font-bold text-zinc-900 dark:text-white">
                        {item.avg.toFixed(1)}%
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-[#787494] tabular-nums">
                        {item.count} {item.count === 1 ? 'exam' : 'exams'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters + Marks Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
                Exam History ({filteredExams.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
                >
                  <option value="All">All Subjects</option>
                  {workspace.subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
                >
                  <option value="All">All Types</option>
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredExams.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
                  No exam marks recorded yet. Add your first quiz or exam mark to begin tracking.
                </p>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="px-4 py-2 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-300 text-xs font-medium hover:bg-violet-600/20 cursor-pointer"
                >
                  Record First Mark
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-[#222033] text-xs text-zinc-500 dark:text-[#8E8AA8]">
                      <th className="py-2.5 pr-4 font-medium">Exam</th>
                      <th className="py-2.5 px-3 font-medium">Subject</th>
                      <th className="py-2.5 px-3 font-medium">Type</th>
                      <th className="py-2.5 px-3 font-medium">Date</th>
                      <th className="py-2.5 px-3 font-medium text-right">Score</th>
                      <th className="py-2.5 px-3 font-medium text-right">Percentage</th>
                      <th className="py-2.5 px-3 font-medium text-right">Vs Previous</th>
                      <th className="py-2.5 pl-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
                    {filteredExams.map((rec) => {
                      const pct = (rec.obtainedMark / rec.totalMark) * 100;
                      const delta = metrics.deltaById.get(rec.id) ?? null;
                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-zinc-50 dark:hover:bg-[#161522] transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div className="font-medium text-zinc-900 dark:text-white">
                              {rec.examName}
                            </div>
                            {rec.comments && (
                              <div className="text-xs text-zinc-500 dark:text-[#837F9C] truncate max-w-xs">
                                {rec.comments}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                            {rec.subjectName}
                          </td>
                          <td className="py-3 px-3 text-xs text-zinc-500 dark:text-[#8E8AA8]">
                            {rec.examType}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-xs text-zinc-500 dark:text-[#8E8AA8]">
                            {rec.examDate}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-right text-zinc-700 dark:text-zinc-300">
                            {rec.obtainedMark} / {rec.totalMark}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-right font-semibold text-violet-600 dark:text-violet-300">
                            {pct.toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-right text-xs">
                            {delta === null ? (
                              <span className="text-zinc-400">—</span>
                            ) : delta >= 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                <ArrowUpRight className="w-3.5 h-3.5" />+
                                {delta.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                {delta.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(rec)}
                                aria-label="Edit exam record"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-500 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteExam(rec.id)}
                                aria-label="Delete exam record"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Upcoming Schedule Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-4">
              Add Upcoming Exam
            </h2>
            <form onSubmit={handleAddUpcoming} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  value={upTitle}
                  onChange={(e) => setUpTitle(e.target.value)}
                  placeholder="e.g., Physics Unit 3 Assessment"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={upSubject}
                    onChange={(e) => setUpSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
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
                    Type
                  </label>
                  <select
                    value={upType}
                    onChange={(e) => setUpType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={upDate}
                  onChange={(e) => setUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={upNotes}
                  onChange={(e) => setUpNotes(e.target.value)}
                  placeholder="Syllabus details..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
              >
                Schedule Exam
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white mb-4">
              Scheduled Upcoming Exams
            </h2>
            {workspace.upcomingExams.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-[#8E8AA8] py-8 text-center">
                No upcoming exams scheduled.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
                {workspace.upcomingExams.map((u) => (
                  <div
                    key={u.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {u.title}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-[#8E8AA8] mt-0.5">
                        {u.subjectName} · {u.examType}
                        {u.notes ? ` · ${u.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono tabular-nums text-violet-600 dark:text-violet-300">
                        {u.examDate}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteUpcomingExam(u.id)}
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
      )}

      {/* Add/Edit Exam Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                {editing ? 'Edit Exam Mark' : 'Record Exam Mark'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
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
                    onChange={(e) =>
                      setExamType(e.target.value as ExamRecord['examType'])
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Exam Name
                </label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g., Algebra Quiz 4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Obtained
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={obtainedMark}
                    onChange={(e) => setObtainedMark(e.target.value)}
                    placeholder="18"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono tabular-nums text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Total
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={totalMark}
                    onChange={(e) => setTotalMark(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono tabular-nums text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Optional Comments
                </label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Reflection or weak areas to review..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
                >
                  {editing ? 'Update Mark' : 'Save Mark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
