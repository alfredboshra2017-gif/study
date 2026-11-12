import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Eye,
  Heading2,
  List,
  ListOrdered,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { NoteItem } from '../types/study.ts';

function renderFormattedLines(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={i} className="font-display text-base font-semibold text-zinc-900 dark:text-white mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} className="font-display text-lg font-bold text-zinc-900 dark:text-white mt-4 mb-1.5">
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={i} className="font-display text-xl font-bold text-zinc-900 dark:text-white mt-4 mb-2">
          {trimmed.slice(2)}
        </h2>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <li key={i} className="ml-5 list-disc text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {renderInlineFormatting(trimmed.slice(2))}
        </li>
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <li key={i} className="ml-5 list-decimal text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {renderInlineFormatting(trimmed.replace(/^\d+\.\s/, ''))}
        </li>
      );
    }
    if (!trimmed) {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  });
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-zinc-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-violet-500/12 text-violet-700 dark:text-violet-300 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function NotesView() {
  const { workspace, addNote, updateNote, deleteNote, showToast } = useStudy();

  const [subjectFilter, setSubjectFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(
    workspace?.notes[0]?.id ?? null
  );
  const [previewMode, setPreviewMode] = useState(false);

  // Draft fields for auto-save
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [content, setContent] = useState('');
  const [formulas, setFormulas] = useState('');
  const [definitions, setDefinitions] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');

  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  const notes = workspace?.notes || [];
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (subjectFilter !== 'All' && n.subjectName !== subjectFilter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.formulas.toLowerCase().includes(q) ||
        n.definitions.toLowerCase().includes(q) ||
        n.subjectName.toLowerCase().includes(q)
      );
    });
  }, [notes, subjectFilter, search]);

  const activeNote: NoteItem | null =
    notes.find((n) => n.id === selectedId) || null;

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setSubjectName(activeNote.subjectName);
      setContent(activeNote.content);
      setFormulas(activeNote.formulas);
      setDefinitions(activeNote.definitions);
      setSaveState('saved');
    }
  }, [activeNote?.id]);

  if (!workspace) return null;

  const scheduleAutoSave = (
    noteId: number,
    next: Partial<{
      title: string;
      subjectName: string;
      content: string;
      formulas: string;
      definitions: string;
    }>
  ) => {
    setSaveState('saving');
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await updateNote(noteId, next);
        setSaveState('saved');
      } catch {
        setSaveState('saved');
      }
    }, 550);
  };

  const handleCreateNote = async () => {
    const subj =
      subjectFilter !== 'All'
        ? subjectFilter
        : workspace.subjects[0]?.name || 'Mathematics';
    try {
      const created = await addNote({
        subjectName: subj,
        title: 'Untitled Study Note',
        content: '',
        formulas: '',
        definitions: '',
        pinned: false,
      });
      setSelectedId(created.id);
      setPreviewMode(false);
      showToast('New note created.');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Failed to create note.',
        'error'
      );
    }
  };

  const applyFormat = (snippet: string) => {
    if (!activeNote) return;
    const el = contentRef.current;
    const start = el ? el.selectionStart : content.length;
    const end = el ? el.selectionEnd : content.length;
    const selected = content.slice(start, end);
    let inserted = snippet;
    if (snippet === '**bold**') inserted = `**${selected || 'important concept'}**`;
    if (snippet === '`formula`') inserted = `\`${selected || 'E = mc^2'}\``;
    const updatedContent =
      content.slice(0, start) + inserted + content.slice(end);
    setContent(updatedContent);
    scheduleAutoSave(activeNote.id, { content: updatedContent });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            My Notes
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Subject-organized digital notebook with formulas, definitions, and auto-save
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNote}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Subject Filter, Search, and Notes List */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] p-4 flex flex-col space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, formulas..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
          >
            <option value="All">All Subjects ({notes.length})</option>
            {workspace.subjects.map((s) => {
              const count = notes.filter((n) => n.subjectName === s.name).length;
              return (
                <option key={s.id} value={s.name}>
                  {s.name} ({count})
                </option>
              );
            })}
          </select>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-[#1D1B2B]">
            {filteredNotes.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500 dark:text-[#8E8AA8]">
                No matching notes. Create one to get started.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left py-3 px-3 rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600/10 dark:bg-violet-500/15'
                        : 'hover:bg-zinc-50 dark:hover:bg-[#161522]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {note.title || 'Untitled Note'}
                      </span>
                      {note.pinned && (
                        <Pin className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-[#8B87A6] mt-1 flex items-center gap-1.5">
                      <span>{note.subjectName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Note Editor & Preview */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] p-6 flex flex-col space-y-5">
          {!activeNote ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-16">
              <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
                Select a note from the sidebar or create a new study note.
              </p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium cursor-pointer"
              >
                Create First Note
              </button>
            </div>
          ) : (
            <>
              {/* Note Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-[#1E1D2D]">
                <div className="flex items-center gap-3">
                  <select
                    value={subjectName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubjectName(val);
                      updateNote(activeNote.id, { subjectName: val });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    {workspace.subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-zinc-400 dark:text-[#787494]">
                    {saveState === 'saving' ? 'Saving...' : 'Auto-saved'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode((v) => !v)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {previewMode ? (
                      <>
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Formatted View</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateNote(activeNote.id, { pinned: !activeNote.pinned })
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                      activeNote.pinned
                        ? 'border-violet-500/50 bg-violet-600/12 text-violet-600 dark:text-violet-300'
                        : 'border-zinc-200 dark:border-[#262438] text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{activeNote.pinned ? 'Pinned' : 'Pin'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteNote(activeNote.id);
                      setSelectedId(null);
                      showToast('Note deleted.');
                    }}
                    aria-label="Delete note"
                    className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Dates */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitle(val);
                    scheduleAutoSave(activeNote.id, { title: val });
                  }}
                  placeholder="Note Title"
                  className="w-full font-display text-2xl font-bold bg-transparent text-zinc-900 dark:text-white focus:outline-none"
                />
                <div className="text-xs text-zinc-500 dark:text-[#7F7B99] flex flex-wrap items-center gap-2 font-mono tabular-nums">
                  <span>
                    Created {new Date(activeNote.createdAt).toLocaleDateString()}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Modified {new Date(activeNote.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!previewMode ? (
                <>
                  {/* Rich Markdown Formatting Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-zinc-50 dark:bg-[#0D0D15] border border-zinc-200 dark:border-[#222033]">
                    <button
                      type="button"
                      onClick={() => applyFormat('\n## Heading\n')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#1E1C2E] flex items-center gap-1 cursor-pointer"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                      <span>Heading</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('**bold**')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#1E1C2E] flex items-center gap-1 cursor-pointer"
                    >
                      <Bold className="w-3.5 h-3.5" />
                      <span>Bold</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('\n- Bullet point')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#1E1C2E] flex items-center gap-1 cursor-pointer"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('\n1. Numbered step')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#1E1C2E] flex items-center gap-1 cursor-pointer"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>Steps</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('`formula`')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#1E1C2E] flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Formula</span>
                    </button>
                  </div>

                  <textarea
                    ref={contentRef}
                    rows={10}
                    value={content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setContent(val);
                      scheduleAutoSave(activeNote.id, { content: val });
                    }}
                    placeholder="Write detailed explanations, lesson summaries, headings (##), **bold text**, and bullet lists (-)..."
                    className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:border-violet-500"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                        Key Formulas
                      </label>
                      <textarea
                        rows={4}
                        value={formulas}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormulas(val);
                          scheduleAutoSave(activeNote.id, { formulas: val });
                        }}
                        placeholder="e.g., Quadratic Formula: x = (-b ± √(b² - 4ac)) / 2a"
                        className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-mono text-zinc-900 dark:text-violet-200 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                        Important Definitions
                      </label>
                      <textarea
                        rows={4}
                        value={definitions}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDefinitions(val);
                          scheduleAutoSave(activeNote.id, { definitions: val });
                        }}
                        placeholder="Key terms and formal definitions..."
                        className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6 py-2">
                  <div className="space-y-1">{renderFormattedLines(content || 'No content yet.')}</div>

                  {formulas.trim() && (
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0C0C14] border border-zinc-200 dark:border-[#242336] space-y-2">
                      <div className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                        Key Formulas
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-800 dark:text-violet-200">
                        {formulas}
                      </pre>
                    </div>
                  )}

                  {definitions.trim() && (
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0C0C14] border border-zinc-200 dark:border-[#242336] space-y-2">
                      <div className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                        Important Definitions
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {definitions}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
