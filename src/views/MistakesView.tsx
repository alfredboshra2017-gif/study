import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { MistakeItem } from '../types/study.ts';

const STATUS_OPTIONS: MistakeItem['status'][] = [
  'Not Reviewed',
  'Reviewing',
  'Mastered',
];

export function MistakesView() {
  const { workspace, addMistake, updateMistake, deleteMistake, showToast } =
    useStudy();

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [lessonFilter, setLessonFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MistakeItem | null>(null);
  const [subjectName, setSubjectName] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [lesson, setLesson] = useState('');
  const [question, setQuestion] = useState('');
  const [incorrectAnswer, setIncorrectAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [mistakeDate, setMistakeDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<MistakeItem['status']>('Not Reviewed');

  // Interactive Review Modal
  const [reviewQueue, setReviewQueue] = useState<MistakeItem[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showReviewAnswer, setShowReviewAnswer] = useState(false);

  const mistakes = workspace?.mistakes || [];

  const uniqueLessons = useMemo(() => {
    const set = new Set<string>();
    for (const m of mistakes) {
      if (subjectFilter === 'All' || m.subjectName === subjectFilter) {
        if (m.lesson.trim()) set.add(m.lesson.trim());
      }
    }
    return Array.from(set).sort();
  }, [mistakes, subjectFilter]);

  const filteredMistakes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mistakes.filter((m) => {
      if (subjectFilter !== 'All' && m.subjectName !== subjectFilter) return false;
      if (lessonFilter !== 'All' && m.lesson !== lessonFilter) return false;
      if (statusFilter !== 'All' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.subjectName.toLowerCase().includes(q) ||
        m.lesson.toLowerCase().includes(q) ||
        m.question.toLowerCase().includes(q) ||
        m.explanation.toLowerCase().includes(q)
      );
    });
  }, [mistakes, subjectFilter, lessonFilter, statusFilter, search]);

  if (!workspace) return null;

  const totalCount = mistakes.length;
  const masteredCount = mistakes.filter((m) => m.status === 'Mastered').length;
  const pendingCount = totalCount - masteredCount;

  const openAdd = () => {
    setEditing(null);
    setSubjectName(workspace.subjects[0]?.name || 'Mathematics');
    setLesson('');
    setQuestion('');
    setIncorrectAnswer('');
    setCorrectAnswer('');
    setExplanation('');
    setMistakeDate(new Date().toISOString().slice(0, 10));
    setStatus('Not Reviewed');
    setShowModal(true);
  };

  const openEdit = (m: MistakeItem) => {
    setEditing(m);
    setSubjectName(m.subjectName);
    setLesson(m.lesson);
    setQuestion(m.question);
    setIncorrectAnswer(m.incorrectAnswer);
    setCorrectAnswer(m.correctAnswer);
    setExplanation(m.explanation);
    setMistakeDate(m.mistakeDate);
    setStatus(m.status);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson.trim() || !question.trim() || !correctAnswer.trim()) return;
    try {
      if (editing) {
        await updateMistake(editing.id, {
          subjectName,
          lesson: lesson.trim(),
          question: question.trim(),
          incorrectAnswer: incorrectAnswer.trim(),
          correctAnswer: correctAnswer.trim(),
          explanation: explanation.trim(),
          mistakeDate,
          status,
        });
        showToast('Mistake record updated.');
      } else {
        await addMistake({
          subjectName,
          lesson: lesson.trim(),
          question: question.trim(),
          incorrectAnswer: incorrectAnswer.trim(),
          correctAnswer: correctAnswer.trim(),
          explanation: explanation.trim(),
          mistakeDate,
          status,
        });
        showToast('Mistake logged to notebook.');
      }
      setShowModal(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    }
  };

  const startReviewSession = () => {
    const pool = filteredMistakes.filter((m) => m.status !== 'Mastered');
    const list = pool.length > 0 ? pool : filteredMistakes;
    if (list.length === 0) {
      showToast('No mistakes available to review.', 'error');
      return;
    }
    setReviewQueue(list);
    setReviewIdx(0);
    setShowReviewAnswer(false);
  };

  const handleReviewOutcome = async (nextStatus: MistakeItem['status']) => {
    const current = reviewQueue[reviewIdx];
    if (!current) return;
    await updateMistake(current.id, {
      status: nextStatus,
      reviewCount: current.reviewCount + 1,
    });
    if (reviewIdx + 1 < reviewQueue.length) {
      setReviewIdx(reviewIdx + 1);
      setShowReviewAnswer(false);
    } else {
      setReviewQueue([]);
      showToast('Mistake review session completed.');
    }
  };

  const statusTextColor = (s: MistakeItem['status']) => {
    if (s === 'Mastered') return 'text-emerald-600 dark:text-emerald-400';
    if (s === 'Reviewing') return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const activeReview = reviewQueue[reviewIdx] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Important Mistakes Notebook
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Capture exam and exercise errors so you never repeat the same mistake twice
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startReviewSession}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#29273D] bg-white dark:bg-[#13131E] hover:border-violet-500/50 text-zinc-800 dark:text-zinc-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Review Mistakes</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Mistake</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Total Logged Mistakes
          </div>
          <div className="mt-2 text-3xl font-display font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {totalCount}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Corrected & Mastered
          </div>
          <div className="mt-2 text-3xl font-display font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {masteredCount}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033]">
          <div className="text-xs text-zinc-500 dark:text-[#8E8AA8]">
            Still To Master
          </div>
          <div className="mt-2 text-3xl font-display font-bold font-mono tabular-nums text-violet-600 dark:text-violet-300">
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, question..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
          />
        </div>

        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setLessonFilter('All');
          }}
          className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
        >
          <option value="All">All Subjects</option>
          {workspace.subjects.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={lessonFilter}
          onChange={(e) => setLessonFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
        >
          <option value="All">All Lessons</option>
          {uniqueLessons.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Mistake Entries */}
      {filteredMistakes.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] text-center space-y-3">
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            No mistakes match this filter yet.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-300 text-xs font-medium cursor-pointer"
          >
            Log First Mistake
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map((m) => (
            <div
              key={m.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-zinc-500 dark:text-[#8B87A6] flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-violet-600 dark:text-violet-300">
                      {m.subjectName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{m.lesson}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{m.mistakeDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className={`font-medium ${statusTextColor(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
                    {m.question}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {m.status !== 'Mastered' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateMistake(m.id, {
                          status: 'Mastered',
                          reviewCount: m.reviewCount + 1,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Mastered</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    aria-label="Edit mistake"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-500 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMistake(m.id)}
                    aria-label="Delete mistake"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-[#1E1C2E]">
                <div>
                  <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
                    My Incorrect Answer
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {m.incorrectAnswer || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                    Correct Answer
                  </div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                    {m.correctAnswer}
                  </div>
                </div>
              </div>

              {m.explanation && (
                <div className="pt-2 border-t border-zinc-100 dark:border-[#1E1C2E]">
                  <div className="text-xs font-medium text-zinc-500 dark:text-[#8E8AA8] mb-1">
                    Why My Answer Was Wrong
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {m.explanation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                {editing ? 'Edit Mistake Record' : 'Log Important Mistake'}
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
                    Lesson / Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                    placeholder="e.g., Integration by Parts"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Question Answered Incorrectly
                </label>
                <textarea
                  rows={2}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Write the exact question..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    My Incorrect Answer
                  </label>
                  <textarea
                    rows={2}
                    value={incorrectAnswer}
                    onChange={(e) => setIncorrectAnswer(e.target.value)}
                    placeholder="What I wrote..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Correct Answer
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="The right solution..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Explanation of Why My Answer Was Wrong
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Key insight to remember next time..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={mistakeDate}
                    onChange={(e) => setMistakeDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm font-mono text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as MistakeItem['status'])
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {editing ? 'Update Mistake' : 'Save Mistake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Mistake Review Modal */}
      {activeReview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500 dark:text-[#8E8AA8] font-mono tabular-nums">
                Review {reviewIdx + 1} of {reviewQueue.length} ·{' '}
                {activeReview.subjectName} · {activeReview.lesson}
              </div>
              <button
                type="button"
                onClick={() => setReviewQueue([])}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#242336]">
              <div className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-2">
                Question
              </div>
              <div className="text-base font-medium text-zinc-900 dark:text-white leading-relaxed">
                {activeReview.question}
              </div>
            </div>

            {!showReviewAnswer ? (
              <button
                type="button"
                onClick={() => setShowReviewAnswer(true)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Reveal Correct Answer & Explanation</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/25 space-y-1">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Correct Answer
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {activeReview.correctAnswer}
                  </div>
                  {activeReview.explanation && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 pt-2">
                      {activeReview.explanation}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleReviewOutcome('Reviewing')}
                    className="px-4 py-2.5 rounded-xl border border-amber-500/40 text-amber-600 dark:text-amber-300 text-sm font-medium cursor-pointer"
                  >
                    Keep Reviewing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewOutcome('Mastered')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium cursor-pointer"
                  >
                    Mark Mastered
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
