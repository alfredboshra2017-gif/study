import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCw,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { FlashcardItem } from '../types/study.ts';

export function FlashcardsView() {
  const { workspace, addFlashcard, updateFlashcard, deleteFlashcard, showToast } =
    useStudy();

  const [subjectFilter, setSubjectFilter] = useState('All');
  const [collectionFilter, setCollectionFilter] = useState('All');
  const [practiceMode, setPracticeMode] = useState<'smart' | 'random' | 'order'>(
    'smart'
  );
  const [deckSeed, setDeckSeed] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FlashcardItem | null>(null);
  const [collectionName, setCollectionName] = useState('Core Review');
  const [subjectName, setSubjectName] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [lesson, setLesson] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const cards = workspace?.flashcards || [];

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      if (c.collectionName.trim()) set.add(c.collectionName.trim());
    }
    return Array.from(set).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (subjectFilter !== 'All' && c.subjectName !== subjectFilter) return false;
      if (collectionFilter !== 'All' && c.collectionName !== collectionFilter)
        return false;
      return true;
    });
  }, [cards, subjectFilter, collectionFilter]);

  // Build study queue (Smart weights Need Review cards 2x, Random shuffles)
  const studyQueue = useMemo(() => {
    if (filteredCards.length === 0) return [];
    let pool: FlashcardItem[] = [];
    if (practiceMode === 'order') {
      pool = [...filteredCards];
    } else if (practiceMode === 'smart') {
      for (const c of filteredCards) {
        pool.push(c);
        if (c.masteryStatus === 'Need Review') pool.push(c);
      }
    } else {
      pool = [...filteredCards];
    }

    if (practiceMode !== 'order') {
      // Deterministic-ish shuffle seeded by deckSeed
      let seed = deckSeed;
      for (let i = pool.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
      }
    }
    return pool;
  }, [filteredCards, practiceMode, deckSeed]);

  if (!workspace) return null;

  const knownCount = filteredCards.filter(
    (c) => c.masteryStatus === 'Known'
  ).length;
  const masteryPct =
    filteredCards.length > 0
      ? Math.round((knownCount / filteredCards.length) * 100)
      : 0;

  const safeIndex =
    studyQueue.length > 0 ? Math.min(cardIndex, studyQueue.length - 1) : 0;
  const currentCard = studyQueue[safeIndex] || null;

  const openAdd = () => {
    setEditing(null);
    setCollectionName(
      collectionFilter !== 'All' ? collectionFilter : 'Core Review'
    );
    setSubjectName(
      subjectFilter !== 'All'
        ? subjectFilter
        : workspace.subjects[0]?.name || 'Mathematics'
    );
    setLesson('');
    setFront('');
    setBack('');
    setShowModal(true);
  };

  const openEdit = (card: FlashcardItem) => {
    setEditing(card);
    setCollectionName(card.collectionName);
    setSubjectName(card.subjectName);
    setLesson(card.lesson);
    setFront(card.front);
    setBack(card.back);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    try {
      if (editing) {
        await updateFlashcard(editing.id, {
          collectionName: collectionName.trim() || 'Core Review',
          subjectName,
          lesson: lesson.trim(),
          front: front.trim(),
          back: back.trim(),
        });
        showToast('Flashcard updated.');
      } else {
        await addFlashcard({
          collectionName: collectionName.trim() || 'Core Review',
          subjectName,
          lesson: lesson.trim(),
          front: front.trim(),
          back: back.trim(),
        });
        showToast('Flashcard added to deck.');
      }
      setShowModal(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    }
  };

  const handleMark = async (status: 'Known' | 'Need Review') => {
    if (!currentCard) return;
    await updateFlashcard(currentCard.id, {
      masteryStatus: status,
      reviewCount: currentCard.reviewCount + 1,
      correctCount:
        status === 'Known'
          ? currentCard.correctCount + 1
          : currentCard.correctCount,
      reviewed: true,
    });
    setFlipped(false);
    if (studyQueue.length > 1) {
      setCardIndex((prev) => (prev + 1) % studyQueue.length);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Flashcards Room
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Active recall practice with smart review weighting and flip cards
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Flashcard</span>
        </button>
      </div>

      {/* Filters & Mastery Progress */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={collectionFilter}
              onChange={(e) => {
                setCollectionFilter(e.target.value);
                setCardIndex(0);
                setFlipped(false);
              }}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              <option value="All">All Collections</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setCardIndex(0);
                setFlipped(false);
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
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#161522] border border-zinc-200 dark:border-[#242336]">
              <button
                type="button"
                onClick={() => {
                  setPracticeMode('smart');
                  setCardIndex(0);
                  setFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  practiceMode === 'smart'
                    ? 'bg-white dark:bg-[#242238] text-zinc-900 dark:text-white'
                    : 'text-zinc-500 dark:text-[#8E8AA8]'
                }`}
              >
                Smart Priority
              </button>
              <button
                type="button"
                onClick={() => {
                  setPracticeMode('random');
                  setDeckSeed((s) => s + 1);
                  setCardIndex(0);
                  setFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  practiceMode === 'random'
                    ? 'bg-white dark:bg-[#242238] text-zinc-900 dark:text-white'
                    : 'text-zinc-500 dark:text-[#8E8AA8]'
                }`}
              >
                Random
              </button>
              <button
                type="button"
                onClick={() => {
                  setPracticeMode('order');
                  setCardIndex(0);
                  setFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  practiceMode === 'order'
                    ? 'bg-white dark:bg-[#242238] text-zinc-900 dark:text-white'
                    : 'text-zinc-500 dark:text-[#8E8AA8]'
                }`}
              >
                In Order
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeckSeed((s) => s + 1);
                setCardIndex(0);
                setFlipped(false);
              }}
              title="Reshuffle deck"
              className="p-2 rounded-xl border border-zinc-200 dark:border-[#262438] text-zinc-500 hover:text-violet-400 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-[#8E8AA8]">
              Memorization Progress ({knownCount} / {filteredCards.length} known)
            </span>
            <span className="font-mono tabular-nums font-semibold text-violet-600 dark:text-violet-300">
              {masteryPct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-[#1D1C2C] overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${masteryPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive 3D Flip Stage */}
      {!currentCard ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] text-center space-y-3">
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Create your first flashcard to start practicing.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium cursor-pointer"
          >
            Create Flashcard
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E8AA8]">
            <span>
              {currentCard.collectionName} · {currentCard.subjectName}
              {currentCard.lesson ? ` · ${currentCard.lesson}` : ''}
            </span>
            <span className="font-mono tabular-nums">
              Card {safeIndex + 1} / {studyQueue.length}
            </span>
          </div>

          <div
            onClick={() => setFlipped((f) => !f)}
            className="perspective-1000 cursor-pointer select-none"
          >
            <div
              className={`relative w-full min-h-[260px] transition-transform duration-500 transform-style-3d ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden rounded-2xl bg-white dark:bg-[#13121E] border border-zinc-200 dark:border-[#2A2842] p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-violet-600 dark:text-violet-400">
                  <span>Question</span>
                  <span>{currentCard.masteryStatus}</span>
                </div>
                <div className="text-xl sm:text-2xl font-display font-semibold text-zinc-900 dark:text-white text-center leading-snug">
                  {currentCard.front}
                </div>
                <div className="text-xs text-center text-zinc-400 dark:text-[#787494]">
                  Click card to flip for answer
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-violet-950/10 dark:bg-[#19162B] border border-violet-500/40 p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-violet-600 dark:text-violet-300">
                  <span>Answer</span>
                  <span className="font-mono tabular-nums">
                    Reviewed {currentCard.reviewCount}×
                  </span>
                </div>
                <div className="text-lg sm:text-xl text-zinc-900 dark:text-white text-center leading-relaxed">
                  {currentCard.back}
                </div>
                <div className="text-xs text-center text-zinc-400 dark:text-[#8E8AA8]">
                  Mark below to record mastery
                </div>
              </div>
            </div>
          </div>

          {/* Practice Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFlipped(false);
                  setCardIndex((prev) =>
                    prev - 1 < 0 ? studyQueue.length - 1 : prev - 1
                  );
                }}
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlipped(false);
                  setCardIndex((prev) => (prev + 1) % studyQueue.length);
                }}
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMark('Need Review')}
                className="px-4 py-2.5 rounded-xl border border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-medium cursor-pointer"
              >
                Need Review
              </button>
              <button
                type="button"
                onClick={() => handleMark('Known')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Known</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Filtered Cards List */}
      {filteredCards.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
            Deck Library ({filteredCards.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-zinc-50 dark:bg-[#161522] border border-zinc-200/80 dark:border-[#242336] flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8B87A6]">
                    <span className="truncate">
                      {c.subjectName} · {c.collectionName}
                    </span>
                    <span
                      className={
                        c.masteryStatus === 'Known'
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-amber-600 dark:text-amber-400 font-medium'
                      }
                    >
                      {c.masteryStatus}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {c.front}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-[#A4A0BD]">
                    {c.back}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-[#232136]">
                  <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                    {c.reviewCount} reviews
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="p-1 rounded text-zinc-400 hover:text-violet-400 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFlashcard(c.id)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                {editing ? 'Edit Flashcard' : 'New Flashcard'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
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
                    Collection
                  </label>
                  <input
                    type="text"
                    required
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="e.g., Vocabulary"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Lesson (optional)
                </label>
                <input
                  type="text"
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="e.g., Unit 2 Grammar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Front (Question / Term)
                </label>
                <textarea
                  rows={2}
                  required
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="Question or prompt..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Back (Answer / Definition)
                </label>
                <textarea
                  rows={3}
                  required
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="Answer or explanation..."
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
                  {editing ? 'Update Card' : 'Add Flashcard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
