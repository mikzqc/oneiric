import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dreamDumpService } from '../services/dreamDumpService';
import { DreamDumpNote, AutoSaveStatus } from '../types/dreamDump';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  PenLine,
  Plus,
  Trash2,
  BookOpen,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  Menu,
  X,
  FileText,
} from 'lucide-react';

// Helper formatting for timestamps
function formatNoteTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatNoteDate(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Today, ${formatNoteTime(ms)}`;
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DreamDumpPage: React.FC = () => {
  const navigate = useNavigate();

  const [notes, setNotes] = useState<DreamDumpNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [noteToDelete, setNoteToDelete] = useState<DreamDumpNote | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<string>('');

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  // Load existing notes on mount
  const loadNotes = useCallback(async (selectNewest: boolean = true) => {
    try {
      const all = await dreamDumpService.getAllNotes();
      setNotes(all);

      if (all.length > 0) {
        if (selectNewest) {
          setActiveNoteId(all[0].id);
          setContent(all[0].content);
          setLastSavedAt(all[0].updatedAt);
        }
      } else {
        // Create an initial empty note so user can immediately type
        const fresh = await dreamDumpService.createNote('');
        setNotes([fresh]);
        setActiveNoteId(fresh.id);
        setContent('');
        setLastSavedAt(fresh.updatedAt);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Focus textarea when active note changes
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeNoteId, isLoading]);

  // Autosave handler with 500ms debounce
  const triggerAutosave = useCallback((newContent: string, noteId: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSaveStatus('saving');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const updated = await dreamDumpService.updateNote(noteId, newContent);
        setSaveStatus('saved');
        setLastSavedAt(updated.updatedAt);

        // Update list in state
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? updated : n))
        );
      } catch (err) {
        console.error('Failed to autosave dream dump note:', err);
        setSaveStatus('error');
      }
    }, 500);
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (activeNoteId) {
      triggerAutosave(val, activeNoteId);
    }
  };

  // Switch to another note
  const handleSelectNote = async (targetId: string) => {
    if (targetId === activeNoteId) {
      setIsMobileListOpen(false);
      return;
    }

    // Flush any pending save for current note
    if (debounceTimerRef.current && activeNoteId) {
      clearTimeout(debounceTimerRef.current);
      try {
        await dreamDumpService.updateNote(activeNoteId, contentRef.current);
      } catch {
        // ignore
      }
    }

    // Prune untouched empty notes
    await dreamDumpService.pruneEmptyNotes(targetId);
    const updatedNotes = await dreamDumpService.getAllNotes();
    setNotes(updatedNotes);

    const target = updatedNotes.find((n) => n.id === targetId);
    if (target) {
      setActiveNoteId(target.id);
      setContent(target.content);
      setLastSavedAt(target.updatedAt);
      setSaveStatus('idle');
    }
    setIsMobileListOpen(false);
  };

  // Create a new independent fragment
  const handleCreateNew = async () => {
    // Flush current note
    if (debounceTimerRef.current && activeNoteId) {
      clearTimeout(debounceTimerRef.current);
      try {
        await dreamDumpService.updateNote(activeNoteId, contentRef.current);
      } catch {
        // ignore
      }
    }

    // If current note is empty, simply reuse it
    if (activeNote && activeNote.content.trim().length === 0) {
      textareaRef.current?.focus();
      setIsMobileListOpen(false);
      return;
    }

    // Prune other empty notes
    await dreamDumpService.pruneEmptyNotes();

    const fresh = await dreamDumpService.createNote('');
    setNotes((prev) => [fresh, ...prev.filter((n) => n.content.trim().length > 0)]);
    setActiveNoteId(fresh.id);
    setContent('');
    setLastSavedAt(fresh.updatedAt);
    setSaveStatus('idle');
    setIsMobileListOpen(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Delete note confirmation
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      setIsDeleting(true);
      await dreamDumpService.deleteNote(noteToDelete.id);

      const remaining = notes.filter((n) => n.id !== noteToDelete.id);
      setNotes(remaining);

      if (activeNoteId === noteToDelete.id) {
        if (remaining.length > 0) {
          setActiveNoteId(remaining[0].id);
          setContent(remaining[0].content);
          setLastSavedAt(remaining[0].updatedAt);
          setSaveStatus('idle');
        } else {
          // If no remaining notes, create a fresh empty one
          const fresh = await dreamDumpService.createNote('');
          setNotes([fresh]);
          setActiveNoteId(fresh.id);
          setContent('');
          setLastSavedAt(fresh.updatedAt);
          setSaveStatus('idle');
        }
      }
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  // Turn fragment into dream entry
  const handleTurnIntoDreamEntry = async () => {
    if (!activeNote || !content.trim()) return;

    // Flush current save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await dreamDumpService.updateNote(activeNote.id, content);
    await dreamDumpService.markConverted(activeNote.id);

    // Update state badge
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNote.id ? { ...n, isConverted: true } : n))
    );

    // Transfer into dream-writing system
    navigate('/journal/new', {
      state: {
        prefillNarrative: content,
        fromDumpId: activeNote.id,
      },
    });
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col md:flex-row h-[calc(100vh-8.5rem)] min-h-[500px] w-full rounded-xl bg-[#0e162e] border border-slate-800/80 overflow-hidden shadow-xl">
      {/* ── Left Sidebar / Fragments List ── */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-30 w-80 max-w-[85vw] flex flex-col bg-[#0b132b] border-r border-slate-800/90 transition-transform duration-200 ease-out md:translate-x-0 ${
          isMobileListOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Fragments ({notes.filter((n) => n.content.trim().length > 0).length})
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60 shadow-sm transition-colors cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500"
              title="New dream fragment"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMobileListOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notes Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-transparent">
          {notes.map((note) => {
            const isSelected = note.id === activeNoteId;
            const snippet = note.content.trim()
              ? note.content.trim().slice(0, 100)
              : 'Empty fragment...';

            return (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note.id)}
                className={`group relative p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-600/60 text-slate-100 shadow-sm'
                    : 'bg-slate-900/30 hover:bg-slate-900/70 border-slate-800/60 text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatNoteDate(note.updatedAt)}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {note.isConverted && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/60"
                        title="Transferred into dream journal"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>Drafted</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus-visible:opacity-100"
                      title="Delete fragment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs line-clamp-2 leading-relaxed font-sans break-words">
                  {snippet}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileListOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 md:hidden animate-backdrop"
          onClick={() => setIsMobileListOpen(false)}
        />
      )}

      {/* ── Main Writing Canvas ── */}
      <div className="flex-1 flex flex-col h-full bg-[#101a38]/80 overflow-hidden">
        {/* Top Action Bar */}
        <div className="h-13 px-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0c142b]/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileListOpen(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 md:hidden cursor-pointer"
              title="Show fragments list"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Last Edited & Autosave Indicator */}
            <div className="flex items-center gap-2 text-xs">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-blue-400/90 font-mono text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-400/90 font-mono text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-rose-400 font-mono text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Save failed</span>
                </span>
              )}
              {saveStatus === 'idle' && lastSavedAt && (
                <span className="text-slate-400 text-[11px] font-mono">
                  Last edited {formatNoteTime(lastSavedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeNote && activeNote.isConverted && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-emerald-300/90 bg-emerald-950/40 border border-emerald-800/50">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Transferred to Journal</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleTurnIntoDreamEntry}
              disabled={!content.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white border border-blue-500/60 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Turn this fragment into a full dream journal entry"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Turn into dream entry</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {activeNote && (
              <button
                type="button"
                onClick={() => setNoteToDelete(activeNote)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                title="Delete this fragment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Text Writing Canvas */}
        <div className="flex-1 p-5 md:p-8 flex flex-col overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="What do you remember?"
            className="w-full flex-1 bg-transparent text-slate-100 placeholder:text-slate-600 text-base md:text-lg leading-relaxed focus:outline-none resize-none font-sans"
            autoFocus
          />
        </div>

        {/* Bottom Status / Stats */}
        <div className="h-9 px-5 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono bg-[#0b132b]/50">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Frictionless Scratchpad</span>
          </div>
          <div>
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteNote}
        title="Delete Fragment"
        message="Are you sure you want to delete this dream fragment? This action cannot be undone."
        confirmText="Delete Fragment"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DreamDumpPage;
