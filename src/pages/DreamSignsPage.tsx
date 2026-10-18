import React, { useState, useEffect } from 'react';
import { dreamSignService } from '../services/dreamSignService';
import {
  DreamSign,
  DreamSignCategory,
  DreamSignStatus,
} from '../types/dreamSign';
import { DreamEntry } from '../types/dream';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/dateUtils';
import {
  Search,
  Plus,
  Check,
  X,
  Bell,
  BellOff,
  GitMerge,
  BookOpen,
  Calendar,
  Layers,
  RefreshCw,
  Edit,
  Trash2,
  Unlink,
  RotateCcw,
  EyeOff,
  AlertTriangle,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react';

interface DreamSignsPageProps {
  onEditDream?: (dream: DreamEntry) => void;
}

export const DreamSignsPage: React.FC<DreamSignsPageProps> = ({ onEditDream }) => {
  const [signs, setSigns] = useState<DreamSign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DreamSignCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DreamSignStatus>('all');
  const [reminderOnly, setReminderOnly] = useState(false);

  // Selection & bulk action state
  const [selectedSignIds, setSelectedSignIds] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<'delete' | 'dismiss' | 'restore' | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals state
  const [activeSignDetail, setActiveSignDetail] = useState<DreamSign | null>(null);
  const [linkedDreams, setLinkedDreams] = useState<DreamEntry[]>([]);
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);

  // Sign Creation / Edit Modal
  const [isSignFormOpen, setIsSignFormOpen] = useState(false);
  const [editingSign, setEditingSign] = useState<DreamSign | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<DreamSignCategory>('anomaly');
  const [formKeywords, setFormKeywords] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formReminder, setFormReminder] = useState(false);

  // Merge modal state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [sourceSignToMerge, setSourceSignToMerge] = useState<DreamSign | null>(null);
  const [targetSignId, setTargetSignId] = useState<string>('');

  // Delete modal state
  const [signToDelete, setSignToDelete] = useState<DreamSign | null>(null);

  // Single-dream unlink confirmation dialog state
  const [dreamToUnlink, setDreamToUnlink] = useState<{ sign: DreamSign; dream: DreamEntry } | null>(null);

  const loadSigns = async () => {
    try {
      setIsLoading(true);
      const list = await dreamSignService.getAllSigns();
      setSigns(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSigns();
  }, []);

  // Auto-dismiss feedback banner after 6 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleScanNow = async () => {
    try {
      setIsScanning(true);
      const res = await dreamSignService.scanAndDetectSigns();
      await loadSigns();
      setFeedback({
        type: 'info',
        message: `Pattern scan complete: updated ${res.updatedSignsCount} existing signs, discovered ${res.newSuggestionsCount} candidate suggestions.`,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenDetail = async (sign: DreamSign) => {
    setActiveSignDetail(sign);
    const dreams = await dreamSignService.getLinkedDreams(sign.id);
    setLinkedDreams(dreams);
  };

  const handleToggleReminder = async (sign: DreamSign) => {
    const next = await dreamSignService.toggleRealityCheckReminder(sign.id);
    setSigns((prev) =>
      prev.map((s) => (s.id === sign.id ? { ...s, isRealityCheckReminder: next } : s))
    );
    if (activeSignDetail?.id === sign.id) {
      setActiveSignDetail({ ...activeSignDetail, isRealityCheckReminder: next });
    }
  };

  const handleSetStatus = async (signId: string, status: DreamSignStatus) => {
    await dreamSignService.setSignStatus(signId, status);
    setSigns((prev) => prev.map((s) => (s.id === signId ? { ...s, status } : s)));
    if (activeSignDetail?.id === signId) {
      setActiveSignDetail({ ...activeSignDetail, status });
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedSignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredSigns.map((s) => s.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSignIds.has(id));

    setSelectedSignIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedSignIds(new Set());
  };

  // Single dismiss / restore
  const handleSingleDismiss = async (sign: DreamSign) => {
    try {
      await dreamSignService.dismissSign(sign.id);
      setFeedback({
        type: 'info',
        message: `Sign "${sign.name}" dismissed. It will not appear in active views or correlations, but can be restored from the Dismissed filter.`,
      });
      if (activeSignDetail?.id === sign.id) {
        setActiveSignDetail({ ...activeSignDetail, status: 'dismissed' });
      }
      await loadSigns();
    } catch {
      setFeedback({
        type: 'error',
        message: `Failed to dismiss sign "${sign.name}".`,
      });
    }
  };

  const handleSingleRestore = async (sign: DreamSign) => {
    try {
      await dreamSignService.restoreSign(sign.id, 'confirmed');
      setFeedback({
        type: 'success',
        message: `Sign "${sign.name}" restored to confirmed dream signs library.`,
      });
      if (activeSignDetail?.id === sign.id) {
        setActiveSignDetail({ ...activeSignDetail, status: 'confirmed' });
      }
      await loadSigns();
    } catch {
      setFeedback({
        type: 'error',
        message: `Failed to restore sign "${sign.name}".`,
      });
    }
  };

  // Bulk actions confirm
  const handleConfirmBulkAction = async () => {
    if (!bulkActionType || selectedSignIds.size === 0) return;
    setIsProcessingBulk(true);
    const ids = Array.from(selectedSignIds);

    try {
      if (bulkActionType === 'delete') {
        const res = await dreamSignService.deleteMultipleSigns(ids, true);
        if (activeSignDetail && ids.includes(activeSignDetail.id)) {
          setActiveSignDetail(null);
        }
        if (res.failed.length > 0) {
          setFeedback({
            type: 'error',
            message: `Deleted ${res.succeeded.length} signs. Failed to delete ${res.failed.length} signs. Original dream narratives preserved.`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `Successfully deleted ${res.succeeded.length} dream signs from library. Original dream records remain intact.`,
          });
        }
      } else if (bulkActionType === 'dismiss') {
        const res = await dreamSignService.dismissMultipleSigns(ids);
        if (activeSignDetail && ids.includes(activeSignDetail.id)) {
          setActiveSignDetail({ ...activeSignDetail, status: 'dismissed' });
        }
        if (res.failed.length > 0) {
          setFeedback({
            type: 'error',
            message: `Dismissed ${res.succeeded.length} signs. Failed to dismiss ${res.failed.length} signs.`,
          });
        } else {
          setFeedback({
            type: 'info',
            message: `Successfully dismissed ${res.succeeded.length} dream signs. You can restore them anytime from the Dismissed filter.`,
          });
        }
      } else if (bulkActionType === 'restore') {
        const res = await dreamSignService.restoreMultipleSigns(ids, 'confirmed');
        if (activeSignDetail && ids.includes(activeSignDetail.id)) {
          setActiveSignDetail({ ...activeSignDetail, status: 'confirmed' });
        }
        if (res.failed.length > 0) {
          setFeedback({
            type: 'error',
            message: `Restored ${res.succeeded.length} signs. Failed to restore ${res.failed.length} signs.`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `Successfully restored ${res.succeeded.length} dream signs to confirmed library.`,
          });
        }
      }
      setSelectedSignIds(new Set());
      await loadSigns();
    } finally {
      setIsProcessingBulk(false);
      setBulkActionType(null);
    }
  };

  // Scope B: Unlink from specific dream
  const handleConfirmUnlinkDream = async () => {
    if (!dreamToUnlink) return;
    const { sign, dream } = dreamToUnlink;

    try {
      const updated = await dreamSignService.unlinkSignFromDream(sign.id, dream.id);
      setLinkedDreams((prev) => prev.filter((d) => d.id !== dream.id));
      setActiveSignDetail(updated);
      setSigns((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setFeedback({
        type: 'success',
        message: `Removed sign "${sign.name}" from dream "${dream.title}". The dream narrative and tags remain 100% untouched.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: `Failed to remove sign from dream.`,
      });
    } finally {
      setDreamToUnlink(null);
    }
  };

  // Open Create/Edit modal
  const handleOpenCreateSign = () => {
    setEditingSign(null);
    setFormName('');
    setFormCategory('anomaly');
    setFormKeywords('');
    setFormNotes('');
    setFormReminder(false);
    setIsSignFormOpen(true);
  };

  const handleOpenEditSign = (sign: DreamSign) => {
    setEditingSign(sign);
    setFormName(sign.name);
    setFormCategory(sign.category);
    setFormKeywords(sign.keywords.join(', '));
    setFormNotes(sign.userNotes || '');
    setFormReminder(!!sign.isRealityCheckReminder);
    setIsSignFormOpen(true);
  };

  const handleSaveSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (editingSign) {
      await dreamSignService.updateSign(editingSign.id, {
        name: formName.trim(),
        category: formCategory,
        keywords: keywordsArray,
        userNotes: formNotes.trim() || undefined,
        isRealityCheckReminder: formReminder,
      });
      setFeedback({
        type: 'success',
        message: `Updated dream sign "${formName.trim()}".`,
      });
    } else {
      await dreamSignService.createSign({
        name: formName.trim(),
        category: formCategory,
        keywords: keywordsArray,
        status: 'confirmed',
        userNotes: formNotes.trim() || undefined,
        isRealityCheckReminder: formReminder,
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });
      setFeedback({
        type: 'success',
        message: `Created dream sign "${formName.trim()}".`,
      });
    }

    setIsSignFormOpen(false);
    await dreamSignService.scanAndDetectSigns();
    await loadSigns();
  };

  const handleOpenMerge = (sign: DreamSign) => {
    setSourceSignToMerge(sign);
    const otherSigns = signs.filter((s) => s.id !== sign.id);
    if (otherSigns.length > 0) {
      setTargetSignId(otherSigns[0].id);
    }
    setIsMergeModalOpen(true);
  };

  const handleConfirmMerge = async () => {
    if (!sourceSignToMerge || !targetSignId) return;
    await dreamSignService.mergeSigns(sourceSignToMerge.id, targetSignId);
    setIsMergeModalOpen(false);
    setSourceSignToMerge(null);
    if (activeSignDetail?.id === sourceSignToMerge.id) {
      setActiveSignDetail(null);
    }
    setFeedback({
      type: 'success',
      message: `Merged "${sourceSignToMerge.name}" into selected destination sign.`,
    });
    await loadSigns();
  };

  const handleDeleteConfirm = async () => {
    if (!signToDelete) return;
    try {
      await dreamSignService.deleteSign(signToDelete.id, true);
      setFeedback({
        type: 'success',
        message: `Dream sign "${signToDelete.name}" removed from library. Original dream records remain untouched.`,
      });
      if (activeSignDetail?.id === signToDelete.id) {
        setActiveSignDetail(null);
      }
      setSelectedSignIds((prev) => {
        const next = new Set(prev);
        next.delete(signToDelete.id);
        return next;
      });
      await loadSigns();
    } catch {
      setFeedback({
        type: 'error',
        message: `Failed to delete dream sign "${signToDelete.name}".`,
      });
    } finally {
      setSignToDelete(null);
    }
  };

  // Filter signs
  const filteredSigns = signs.filter((sign) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sign.name.toLowerCase().includes(q);
      const matchKeywords = sign.keywords.some((k) => k.includes(q));
      if (!matchName && !matchKeywords) return false;
    }
    if (categoryFilter !== 'all' && sign.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && sign.status !== statusFilter) return false;
    if (reminderOnly && !sign.isRealityCheckReminder) return false;
    return true;
  });

  const confirmedCount = signs.filter((s) => s.status === 'confirmed').length;
  const suggestedCount = signs.filter((s) => s.status === 'suggested').length;
  const dismissedCount = signs.filter((s) => s.status === 'dismissed').length;

  const categoryLabels: Record<DreamSignCategory, string> = {
    anomaly: 'Unusual & Impossible',
    object: 'Recurring Object',
    location: 'Setting / Location',
    person: 'Character & Person',
    action: 'Situation & Action',
    emotion: 'Emotional Tone',
    other: 'Other Pattern',
  };

  // Precompute selected sign summary metrics
  const selectedSignsList = signs.filter((s) => selectedSignIds.has(s.id));
  const distinctDreamsAffectedCount = new Set(
    selectedSignsList.flatMap((s) => s.linkedDreamIds || [])
  ).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Dream Signs & Pattern Library
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold">
              {signs.length} detected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Local, rule-based detection mapping repeating personal anomalies across distinct entries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />}
            onClick={handleScanNow}
            disabled={isScanning}
          >
            Scan Patterns
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateSign}
          >
            Create Sign
          </Button>
        </div>
      </div>

      {/* Operation Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs shadow-md transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-red-950/60 border-red-800 text-red-200'
              : 'bg-blue-950/60 border-blue-800 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <Info className="w-4 h-4 shrink-0 text-blue-400" />
            )}
            <span className="font-medium leading-relaxed">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bulk Action Sticky Bar when items are selected */}
      {selectedSignIds.size > 0 && (
        <div className="p-3 rounded-lg bg-blue-950/95 border border-blue-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-blue-100 sticky top-3 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="font-bold px-2 py-0.5 rounded-md bg-blue-800 text-blue-100 text-xs">
              {selectedSignIds.size}
            </span>
            <span className="font-medium">
              {selectedSignIds.size === 1 ? 'sign selected' : 'signs selected'}
            </span>
            <span className="text-blue-300/80 text-[11px]">
              ({distinctDreamsAffectedCount} distinct dream records referenced)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 rounded-md text-blue-300 hover:text-white hover:bg-blue-900/60 font-medium transition-colors cursor-pointer"
            >
              Clear Selection
            </button>

            {statusFilter === 'dismissed' ? (
              <Button
                size="sm"
                variant="outline"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setBulkActionType('restore')}
              >
                Restore Selected
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                icon={<EyeOff className="w-3.5 h-3.5" />}
                onClick={() => setBulkActionType('dismiss')}
              >
                Dismiss Selected
              </Button>
            )}

            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setBulkActionType('delete')}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Suggested Patterns Review Banner if any */}
      {suggestedCount > 0 && statusFilter !== 'suggested' && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{suggestedCount} candidate {suggestedCount === 1 ? 'pattern' : 'patterns'}</strong> detected across multiple distinct dreams. Review suggestions to confirm or dismiss them as personal dream signs.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('suggested');
              setCategoryFilter('all');
            }}
            className="px-3 py-1.5 rounded-md bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700/60 font-medium cursor-pointer shrink-0 transition-colors"
          >
            Review Suggestions
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sign names, keywords, or aliases..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Multi-select all visible button */}
            <button
              type="button"
              onClick={handleSelectAllVisible}
              disabled={filteredSigns.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 select-none"
            >
              {filteredSigns.length > 0 && filteredSigns.every((s) => selectedSignIds.has(s.id)) ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Select All Visible</span>
            </button>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | DreamSignStatus)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses ({signs.length})</option>
              <option value="confirmed">Confirmed ({confirmedCount})</option>
              <option value="suggested">Suggested ({suggestedCount})</option>
              <option value="dismissed">Dismissed ({dismissedCount})</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | DreamSignCategory)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="anomaly">Unusual / Impossible</option>
              <option value="object">Objects</option>
              <option value="location">Locations</option>
              <option value="person">People</option>
              <option value="action">Actions</option>
              <option value="emotion">Emotions</option>
              <option value="other">Other Pattern</option>
            </select>

            {/* Reminder filter checkbox */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reminderOnly}
                onChange={(e) => setReminderOnly(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Reminders Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Signs Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredSigns.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-3">
          <p>
            {statusFilter === 'dismissed'
              ? 'No dismissed dream signs found. Dismissed signs remain safely archived here and can be restored.'
              : 'No dream signs match your filter criteria.'}
          </p>
          <Button size="sm" variant="outline" onClick={handleScanNow}>
            Scan Dream Journal for Patterns
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSigns.map((sign) => {
            const isConfirmed = sign.status === 'confirmed';
            const isSuggested = sign.status === 'suggested';
            const isDismissed = sign.status === 'dismissed';
            const isSelected = selectedSignIds.has(sign.id);

            return (
              <div
                key={sign.id}
                onClick={() => handleOpenDetail(sign)}
                className={`p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between shadow-sm relative group ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-slate-900'
                    : isSuggested
                    ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700/60'
                    : isConfirmed
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    : 'bg-slate-950/40 border-slate-900 opacity-70 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top line with Checkbox, Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(sign.id)}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
                        title="Select sign"
                        aria-label={`Select ${sign.name}`}
                      />
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
                        {categoryLabels[sign.category]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {sign.isRealityCheckReminder && (
                        <span
                          title="Active Reality Check Reminder"
                          className="p-1 rounded-md bg-blue-950 text-blue-300 border border-blue-700/50"
                        >
                          <Bell className="w-3 h-3 text-blue-400" />
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          isConfirmed
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                            : isSuggested
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {sign.status}
                      </span>
                    </div>
                  </div>

                  {/* Sign Name */}
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-200 mb-1">
                    {sign.name}
                  </h3>

                  {/* Frequency Metrics */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                    <div className="flex items-center gap-1 text-blue-300 font-semibold">
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        {sign.distinctDreamCount} {sign.distinctDreamCount === 1 ? 'dream' : 'distinct dreams'}
                      </span>
                    </div>

                    {sign.lastOccurred && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Last: {formatDate(sign.lastOccurred)}</span>
                      </div>
                    )}
                  </div>

                  {/* Keywords Preview */}
                  {sign.keywords && sign.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {sign.keywords.slice(0, 3).map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                        >
                          {kw}
                        </span>
                      ))}
                      {sign.keywords.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          +{sign.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* User Notes Preview */}
                  {sign.userNotes && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-2 mb-3">
                      "{sign.userNotes}"
                    </p>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isSuggested ? (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(sign.id, 'confirmed')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Confirm</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSingleDismiss(sign)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  ) : isDismissed ? (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleSingleRestore(sign)}
                        className="flex-1 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 border border-blue-700/60 text-blue-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Sign</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignToDelete(sign)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete permanently from library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleReminder(sign)}
                          className={`p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                            sign.isRealityCheckReminder
                              ? 'text-blue-300 bg-blue-950/80 border border-blue-700/50'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                          title={
                            sign.isRealityCheckReminder
                              ? 'Active reality check reminder'
                              : 'Set as reality check reminder'
                          }
                        >
                          {sign.isRealityCheckReminder ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenMerge(sign)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Merge with another sign"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditSign(sign)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit sign"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSingleDismiss(sign)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Dismiss sign from active library"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSignToDelete(sign)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete sign from library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sign Detail Modal with Chronological Linked Dreams */}
      {activeSignDetail && (
        <Modal
          isOpen={!!activeSignDetail}
          onClose={() => setActiveSignDetail(null)}
          title={activeSignDetail.name}
          subtitle={`Category: ${categoryLabels[activeSignDetail.category]}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Meta summary line & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-blue-300">
                  {activeSignDetail.distinctDreamCount} distinct dream records
                </span>
                {activeSignDetail.lastOccurred && (
                  <span className="text-slate-400">
                    Most recent: {formatDate(activeSignDetail.lastOccurred)}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeSignDetail.status === 'confirmed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : activeSignDetail.status === 'suggested'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {activeSignDetail.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={activeSignDetail.isRealityCheckReminder ? 'primary' : 'outline'}
                  icon={activeSignDetail.isRealityCheckReminder ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  onClick={() => handleToggleReminder(activeSignDetail)}
                >
                  {activeSignDetail.isRealityCheckReminder ? 'Reminder Active' : 'Set as RC'}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEditSign(activeSignDetail)}
                >
                  Edit
                </Button>

                {activeSignDetail.status === 'dismissed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => handleSingleRestore(activeSignDetail)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<EyeOff className="w-3.5 h-3.5" />}
                    onClick={() => handleSingleDismiss(activeSignDetail)}
                  >
                    Dismiss
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setSignToDelete(activeSignDetail)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Associated Keywords & Aliases:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeSignDetail.keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            {activeSignDetail.userNotes && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                <span className="font-semibold text-slate-400 block mb-1">Personal Notes:</span>
                {activeSignDetail.userNotes}
              </div>
            )}

            {/* Chronological Dream Entries History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Supporting Dream Entries ({linkedDreams.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Click entry to view details &bull; Click unlink to remove sign from entry
                </span>
              </div>

              {linkedDreams.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No linked dream entries found.</p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {linkedDreams.map((dream) => (
                    <div
                      key={dream.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => setSelectedDreamForView(dream)}
                        className="grow cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{dream.title}</span>
                          {dream.lucidity === 'lucid' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              Lucid
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{dream.narrative}</p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-slate-400 whitespace-nowrap text-[11px] font-medium">
                          {formatDate(dream.date)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDreamToUnlink({ sign: activeSignDetail, dream });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Remove this sign from this specific dream"
                          aria-label={`Unlink sign ${activeSignDetail.name} from dream ${dream.title}`}
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Scope B Confirmation Modal: Unlink Sign from Specific Dream */}
      {dreamToUnlink && (
        <Modal
          isOpen={!!dreamToUnlink}
          onClose={() => setDreamToUnlink(null)}
          title="Remove Sign from this Dream"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200">
              <p className="font-semibold mb-1">Scope: Specific Dream Entry Only</p>
              <p className="text-[11px] text-amber-300/80">
                This action only unlinks this sign from this individual dream entry. The sign will remain in your library for other dreams.
              </p>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Remove dream sign <strong>"{dreamToUnlink.sign.name}"</strong> from dream entry{' '}
              <strong>"{dreamToUnlink.dream.title}"</strong> ({formatDate(dreamToUnlink.dream.date)})?
            </p>

            <p className="text-slate-400 text-[11px]">
              The authentic dream narrative and all tags in this entry will remain completely untouched and preserved.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setDreamToUnlink(null)}>
                Cancel
              </Button>
              <Button variant="danger" icon={<Unlink className="w-3.5 h-3.5" />} onClick={handleConfirmUnlinkDream}>
                Remove from this Dream
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkActionType && (
        <Modal
          isOpen={!!bulkActionType}
          onClose={() => setBulkActionType(null)}
          title={
            bulkActionType === 'delete'
              ? `Delete ${selectedSignIds.size} Dream Signs`
              : bulkActionType === 'dismiss'
              ? `Dismiss ${selectedSignIds.size} Dream Signs`
              : `Restore ${selectedSignIds.size} Dream Signs`
          }
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Selected Dream Signs:</span>
                <span className="font-bold text-slate-100">{selectedSignsList.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Affected Distinct Dream Records:</span>
                <span className="font-bold text-blue-300">{distinctDreamsAffectedCount}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1.5 font-medium">Included Signs:</span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                {selectedSignsList.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-[11px]"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {bulkActionType === 'delete' ? (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 space-y-1">
                <p className="font-semibold">Permanent Library Removal</p>
                <p className="text-[11px] text-red-300/80">
                  These signs will be deleted from your Dream Sign Library and ignored in future automated pattern scans. Original dream records and narratives will remain 100% untouched.
                </p>
              </div>
            ) : bulkActionType === 'dismiss' ? (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200 space-y-1">
                <p className="font-semibold">Dismiss from Active Views</p>
                <p className="text-[11px] text-blue-300/80">
                  These signs will be hidden from active views and cross-dream correlations. You can restore them anytime from the Dismissed filter.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 space-y-1">
                <p className="font-semibold">Restore to Active Library</p>
                <p className="text-[11px] text-emerald-300/80">
                  These signs will be restored to your active confirmed library and included in future analyses.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setBulkActionType(null)} disabled={isProcessingBulk}>
                Cancel
              </Button>
              <Button
                variant={bulkActionType === 'delete' ? 'danger' : 'primary'}
                onClick={handleConfirmBulkAction}
                isLoading={isProcessingBulk}
              >
                {bulkActionType === 'delete'
                  ? `Confirm Delete (${selectedSignIds.size})`
                  : bulkActionType === 'dismiss'
                  ? `Confirm Dismiss (${selectedSignIds.size})`
                  : `Confirm Restore (${selectedSignIds.size})`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dream Detail Modal for inspecting original entry */}
      <DreamDetailModal
        dream={selectedDreamForView}
        isOpen={!!selectedDreamForView}
        onClose={() => setSelectedDreamForView(null)}
        onEdit={(d) => {
          setSelectedDreamForView(null);
          if (onEditDream) onEditDream(d);
        }}
        onDelete={async () => {
          setSelectedDreamForView(null);
          await loadSigns();
        }}
      />

      {/* Create / Edit Sign Modal */}
      <Modal
        isOpen={isSignFormOpen}
        onClose={() => setIsSignFormOpen(false)}
        title={editingSign ? 'Edit Dream Sign' : 'Create Custom Dream Sign'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSign} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Sign Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Broken Clocks, Floating"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as DreamSignCategory)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="anomaly">Unusual & Impossible Anomaly</option>
              <option value="object">Recurring Object</option>
              <option value="location">Setting / Location</option>
              <option value="person">Person / Character</option>
              <option value="action">Action & Situation</option>
              <option value="emotion">Emotional Tone</option>
              <option value="other">Other Pattern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Keywords & Aliases (comma-separated)
            </label>
            <input
              type="text"
              value={formKeywords}
              onChange={(e) => setFormKeywords(e.target.value)}
              placeholder="e.g. clock, watch, timer, hourglass"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              User Notes / Reality Check Strategy
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="When this occurs, pinch nose and check breathing..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={formReminder}
              onChange={(e) => setFormReminder(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Set as an active Reality Check reminder</span>
          </label>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsSignFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingSign ? 'Save Changes' : 'Create Sign'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Merge Modal */}
      {sourceSignToMerge && (
        <Modal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          title={`Merge "${sourceSignToMerge.name}"`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Merging will combine all keywords, aliases, and linked dream occurrences into the destination sign, then delete <strong>"{sourceSignToMerge.name}"</strong>.
            </p>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Merge into:</label>
              <select
                value={targetSignId}
                onChange={(e) => setTargetSignId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {signs
                  .filter((s) => s.id !== sourceSignToMerge.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.distinctDreamCount} dreams)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsMergeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmMerge}>
                Confirm Merge
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Single Sign Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!signToDelete}
        onClose={() => setSignToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${signToDelete?.name}" from Library`}
        message={`Delete "${signToDelete?.name}" (${signToDelete?.distinctDreamCount || 0} dream occurrences)? This will remove the sign from your library and prevent automatic re-detection. Original dream entries and narratives will remain 100% untouched.`}
        confirmText="Delete from Library"
        isDestructive={true}
      />
    </div>
  );
};
