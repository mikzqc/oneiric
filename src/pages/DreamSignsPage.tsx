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
  Sparkles,
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

  const handleScanNow = async () => {
    try {
      setIsScanning(true);
      await dreamSignService.scanAndDetectSigns();
      await loadSigns();
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
    await loadSigns();
  };

  const handleDeleteConfirm = async () => {
    if (!signToDelete) return;
    await dreamSignService.deleteSign(signToDelete.id);
    setSignToDelete(null);
    if (activeSignDetail?.id === signToDelete.id) {
      setActiveSignDetail(null);
    }
    await loadSigns();
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

  const categoryLabels: Record<DreamSignCategory, string> = {
    anomaly: 'Unusual & Impossible',
    object: 'Recurring Object',
    location: 'Setting / Location',
    person: 'Character & Person',
    action: 'Situation & Action',
    emotion: 'Emotional Tone',
    other: 'Other Pattern',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <span>Dream Signs & Pattern Library</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold">
              {signs.length} detected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Local, rule-based detection mapping repeating personal anomalies across distinct entries
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
            variant="celestial"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateSign}
          >
            Create Sign
          </Button>
        </div>
      </div>

      {/* Suggested Patterns Review Banner if any */}
      {suggestedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
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
            className="px-3 py-1.5 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700/60 font-semibold cursor-pointer shrink-0 transition-colors"
          >
            Review Suggestions
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-lg space-y-3">
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
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | DreamSignStatus)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses ({signs.length})</option>
              <option value="confirmed">Confirmed ({confirmedCount})</option>
              <option value="suggested">Suggested ({suggestedCount})</option>
              <option value="dismissed">Dismissed</option>
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
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-3">
          <p>No dream signs match your filter criteria.</p>
          <Button size="sm" variant="outline" onClick={handleScanNow}>
            Scan Dream Journal for Patterns
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSigns.map((sign) => {
            const isConfirmed = sign.status === 'confirmed';
            const isSuggested = sign.status === 'suggested';

            return (
              <div
                key={sign.id}
                onClick={() => handleOpenDetail(sign)}
                className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-md ${
                  isSuggested
                    ? 'bg-amber-950/20 border-amber-600/40 hover:border-amber-500/60'
                    : isConfirmed
                    ? 'bg-[#0f172a]/80 border-slate-800/80 hover:border-blue-500/50 hover:bg-[#121a30]'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div>
                  {/* Top line with Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {categoryLabels[sign.category]}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {sign.isRealityCheckReminder && (
                        <span
                          title="Active Reality Check Reminder"
                          className="p-1 rounded-full bg-blue-950 text-blue-300 border border-blue-700/50"
                        >
                          <Bell className="w-3 h-3 text-blue-400" />
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isConfirmed
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                            : isSuggested
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
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
                        onClick={() => handleSetStatus(sign.id, 'dismissed')}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>Dismiss</span>
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
                      </div>

                      <button
                        type="button"
                        onClick={() => setSignToDelete(sign)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete sign"
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
            {/* Meta summary line */}
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
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={activeSignDetail.isRealityCheckReminder ? 'primary' : 'outline'}
                  icon={activeSignDetail.isRealityCheckReminder ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  onClick={() => handleToggleReminder(activeSignDetail)}
                >
                  {activeSignDetail.isRealityCheckReminder ? 'Reminder Active' : 'Set as RC Reminder'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => {
                    handleOpenEditSign(activeSignDetail);
                  }}
                >
                  Edit
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Supporting Dream Entries ({linkedDreams.length})</span>
              </h3>

              {linkedDreams.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No linked dream entries found.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {linkedDreams.map((dream) => (
                    <div
                      key={dream.id}
                      onClick={() => setSelectedDreamForView(dream)}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
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

                      <span className="text-slate-400 whitespace-nowrap text-[11px] font-medium shrink-0">
                        {formatDate(dream.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
            <Button type="submit" variant="celestial">
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!signToDelete}
        onClose={() => setSignToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Dream Sign"
        message={`Delete dream sign "${signToDelete?.name}"? Original dream entries will remain untouched.`}
        confirmText="Delete Sign"
        isDestructive={true}
      />
    </div>
  );
};
