import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext.tsx';
import { fetchPdfBlobUrl } from '../lib/api.ts';
import { PdfDocument, PdfFolder } from '../types/study.ts';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfCollectorView() {
  const {
    workspace,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadPdf,
    updatePdf,
    deletePdf,
    showToast,
  } = useStudy();

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'subject'>('date');

  // New folder modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderParentId, setFolderParentId] = useState<number | null>(null);

  // Upload PDF modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSubject, setPdfSubject] = useState(
    workspace?.subjects[0]?.name || 'Mathematics'
  );
  const [pdfFolderId, setPdfFolderId] = useState<string>('');
  const [pdfDescription, setPdfDescription] = useState('');
  const [pdfTags, setPdfTags] = useState('');
  const [uploading, setUploading] = useState(false);

  // Edit PDF modal
  const [editingDoc, setEditingDoc] = useState<PdfDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');

  // Preview PDF modal
  const [previewDoc, setPreviewDoc] = useState<PdfDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const folders = workspace?.pdfFolders || [];
  const documents = workspace?.pdfDocuments || [];

  const rootFolders = folders.filter((f) => f.parentId === null);
  const childFoldersOf = (parentId: number) =>
    folders.filter((f) => f.parentId === parentId);

  const descendantFolderIds = useMemo(() => {
    if (selectedFolderId === null) return null;
    const ids = new Set<number>([selectedFolderId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId !== null && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id);
          added = true;
        }
      }
    }
    return ids;
  }, [folders, selectedFolderId]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = documents.filter((d) => {
      if (
        descendantFolderIds &&
        (d.folderId === null || !descendantFolderIds.has(d.folderId))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.originalFilename.toLowerCase().includes(q) ||
        d.subjectName.toLowerCase().includes(q) ||
        d.tags.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'subject') return a.subjectName.localeCompare(b.subjectName);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [documents, descendantFolderIds, search, sortBy]);

  if (!workspace) return null;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    try {
      await createFolder(folderName.trim(), folderParentId);
      setFolderName('');
      setShowFolderModal(false);
      showToast('Folder created.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Create folder failed.', 'error');
    }
  };

  const handleRenameFolder = async (f: PdfFolder) => {
    const next = window.prompt('Rename folder:', f.name);
    if (next && next.trim() && next.trim() !== f.name) {
      await renameFolder(f.id, next.trim());
      showToast('Folder renamed.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      showToast('Please choose a PDF file.', 'error');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append(
        'title',
        pdfTitle.trim() || pdfFile.name.replace(/\.pdf$/i, '')
      );
      formData.append('subjectName', pdfSubject);
      if (pdfFolderId) formData.append('folderId', pdfFolderId);
      formData.append('description', pdfDescription.trim());
      formData.append('tags', pdfTags.trim());

      await uploadPdf(formData);
      setPdfFile(null);
      setPdfTitle('');
      setPdfDescription('');
      setPdfTags('');
      setShowUploadModal(false);
      showToast('PDF uploaded to your library.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (doc: PdfDocument) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    try {
      const url = await fetchPdfBlobUrl(doc.id);
      setPreviewBlobUrl(url);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Preview failed.', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (doc: PdfDocument) => {
    try {
      const url = await fetchPdfBlobUrl(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  };

  const openEditDoc = (doc: PdfDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditSubject(doc.subjectName);
    setEditDesc(doc.description);
    setEditTags(doc.tags);
  };

  const handleSaveEditDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editTitle.trim()) return;
    await updatePdf(editingDoc.id, {
      title: editTitle.trim(),
      subjectName: editSubject,
      description: editDesc.trim(),
      tags: editTags.trim(),
    });
    setEditingDoc(null);
    showToast('Document metadata updated.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            PDF Collector Room
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
            Organize, preview, tag, and store all your educational PDFs permanently
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFolderParentId(selectedFolderId);
              setFolderName('');
              setShowFolderModal(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#29273D] bg-white dark:bg-[#13131E] hover:border-violet-500/50 text-zinc-800 dark:text-zinc-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{selectedFolderId ? 'New Subfolder' : 'New Folder'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPdfFolderId(selectedFolderId ? String(selectedFolderId) : '');
              setPdfSubject(
                (selectedFolderId &&
                  folders.find((f) => f.id === selectedFolderId)?.name) ||
                  workspace.subjects[0]?.name ||
                  'Mathematics'
              );
              setShowUploadModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Folder Tree */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] p-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E8AA8]">
              My PDF Library
            </span>
            <button
              type="button"
              onClick={() => {
                setFolderParentId(null);
                setFolderName('');
                setShowFolderModal(true);
              }}
              className="text-xs text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
            >
              + Root Folder
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
              selectedFolderId === null
                ? 'bg-violet-600/12 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#161522]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Folder className="w-4 h-4" />
              <span>All Documents</span>
            </span>
            <span className="text-xs font-mono tabular-nums text-zinc-400">
              {documents.length}
            </span>
          </button>

          <div className="space-y-1 max-h-[480px] overflow-y-auto">
            {rootFolders.map((folder) => {
              const children = childFoldersOf(folder.id);
              const isSelected = selectedFolderId === folder.id;
              return (
                <div key={folder.id} className="space-y-1">
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm group ${
                      isSelected
                        ? 'bg-violet-600/12 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 font-medium'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#161522]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <Folder className="w-4 h-4 shrink-0 text-violet-500" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleRenameFolder(folder)}
                        title="Rename folder"
                        className="p-1 text-zinc-400 hover:text-violet-400 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedFolderId === folder.id)
                            setSelectedFolderId(null);
                          deleteFolder(folder.id);
                        }}
                        title="Delete folder"
                        className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {children.length > 0 && (
                    <div className="pl-6 space-y-1">
                      {children.map((sub) => {
                        const subSel = selectedFolderId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs group ${
                              subSel
                                ? 'bg-violet-600/12 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 font-medium'
                                : 'text-zinc-600 dark:text-[#A4A0BD] hover:bg-zinc-50 dark:hover:bg-[#161522]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedFolderId(sub.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <Folder className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedFolderId === sub.id)
                                  setSelectedFolderId(null);
                                deleteFolder(sub.id);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Search, Sort, and Documents Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PDFs by name, tag, or description..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'date' | 'name' | 'subject')
              }
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="subject">Sort by Subject</option>
            </select>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] text-center space-y-3">
              <p className="text-sm text-zinc-500 dark:text-[#8E8AA8]">
                No PDF documents in this folder yet.
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-300 text-xs font-medium cursor-pointer"
              >
                Upload First PDF
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#11111A] border border-zinc-200 dark:border-[#222033] flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/12 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-white truncate">
                            {doc.title}
                          </h3>
                          <div className="text-xs text-zinc-500 dark:text-[#8B87A6] truncate">
                            {doc.subjectName} · {formatBytes(doc.fileSizeBytes)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-zinc-600 dark:text-[#A4A0BD] leading-relaxed">
                        {doc.description}
                      </p>
                    )}

                    <div className="text-xs text-zinc-400 dark:text-[#787494] flex flex-wrap items-center gap-1.5">
                      <span className="font-mono tabular-nums">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      {doc.tags && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Tags: {doc.tags}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-[#1E1C2E]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(doc)}
                        className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-[#262438] text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditDoc(doc)}
                        aria-label="Rename or edit document"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-400 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePdf(doc.id)}
                        aria-label="Delete document"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-white">
                {folderParentId ? 'New Lesson Subfolder' : 'New Subject Folder'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload PDF Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Upload PDF Document
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  PDF File (max 15 MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setPdfFile(f);
                    if (f && !pdfTitle) {
                      setPdfTitle(f.name.replace(/\.pdf$/i, ''));
                    }
                  }}
                  className="w-full text-xs text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600/15 file:text-violet-600 dark:file:text-violet-300 file:font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="e.g., Calculus Lecture 5 Notes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={pdfSubject}
                    onChange={(e) => setPdfSubject(e.target.value)}
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
                    Folder
                  </label>
                  <select
                    value={pdfFolderId}
                    onChange={(e) => setPdfFolderId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                  >
                    <option value="">Root Library</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={pdfTags}
                  onChange={(e) => setPdfTags(e.target.value)}
                  placeholder="e.g., exam-prep, formulas, unit-3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-[#A39EBE] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={pdfDescription}
                  onChange={(e) => setPdfDescription(e.target.value)}
                  placeholder="Summary of PDF contents..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                Rename & Edit PDF
              </h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditDoc} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Subject</label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
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
                <label className="block text-xs text-zinc-500 mb-1">Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B11] border border-zinc-200 dark:border-[#262438] text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline PDF Reader Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[88vh] rounded-2xl bg-white dark:bg-[#12121C] border border-zinc-200 dark:border-[#262438] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-[#222033] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {previewDoc.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#8E8AA8] truncate">
                  {previewDoc.subjectName} · {previewDoc.originalFilename}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    if (previewBlobUrl) {
                      URL.revokeObjectURL(previewBlobUrl);
                      setPreviewBlobUrl(null);
                    }
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-100 dark:bg-[#09090D]">
              {loadingPreview || !previewBlobUrl ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                  Loading PDF document...
                </div>
              ) : (
                <iframe
                  title={previewDoc.title}
                  src={previewBlobUrl}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
