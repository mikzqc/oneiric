import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Modal } from '../common/Modal';
import { DreamEditor } from '../journal/DreamEditor';
import { DreamEntry } from '../../types/dream';
import { backupService } from '../../services/backupService';
import { celebrationService, LucidCelebrationEvent } from '../../services/celebrationService';
import { LucidCelebrationModal } from '../celebration/LucidCelebrationModal';
import { X, Info } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<DreamEntry | undefined>(undefined);
  const [editorPrefillDate, setEditorPrefillDate] = useState<string | undefined>(undefined);
  const [isSamplePreview, setIsSamplePreview] = useState(false);
  const [celebrationEvent, setCelebrationEvent] = useState<LucidCelebrationEvent | null>(null);

  // Subscribe to Lucid Dream Celebration / Party Mode events
  useEffect(() => {
    const unsubscribe = celebrationService.subscribeToCelebration((event) => {
      setCelebrationEvent(event);
    });
    return () => unsubscribe();
  }, []);

  // Sync sample data status
  useEffect(() => {
    let isMounted = true;
    const checkSample = () => {
      backupService.hasSampleData().then((has) => {
        if (isMounted) setIsSamplePreview(has);
      });
    };

    checkSample();
    window.addEventListener('oneiric:sample-data-changed', checkSample);

    return () => {
      isMounted = false;
      window.removeEventListener('oneiric:sample-data-changed', checkSample);
    };
  }, []);

  const handleExitPreview = async () => {
    await backupService.clearSampleData();
    setIsSamplePreview(false);
  };

  // Page titles lookup
  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/') return { title: 'Dashboard', subtitle: 'Overview and recall metrics' };
    if (path.startsWith('/analytics')) return { title: 'Analytics', subtitle: 'Recall rates, heatmaps, and pattern trends' };
    if (path.startsWith('/correlations')) return { title: 'Correlations', subtitle: 'Descriptive relationships across signs, emotions, and lucidity' };
    if (path.startsWith('/journal/new')) return { title: 'Record Dream', subtitle: 'New journal entry' };
    if (path.startsWith('/journal/edit')) return { title: 'Edit Dream', subtitle: 'Update journal entry' };
    if (path.startsWith('/journal')) return { title: 'Dream Journal', subtitle: 'Search and inspect entries' };
    if (path.startsWith('/signs')) return { title: 'Dream Signs Library', subtitle: 'Recurring patterns and reality check reminders' };
    if (path.startsWith('/calendar')) return { title: 'Calendar', subtitle: 'Monthly entries overview' };
    if (path.startsWith('/timeline')) return { title: 'Timeline', subtitle: 'Chronological entries log' };
    if (path.startsWith('/lucid')) return { title: 'Lucid Dreams', subtitle: 'Conscious dream entries' };
    if (path.startsWith('/false-awakenings')) return { title: 'False Awakenings', subtitle: 'Simulated awakenings and transition patterns' };
    if (path.startsWith('/techniques')) return { title: 'Techniques Guide', subtitle: 'Induction protocols and reference guide' };
    if (path.startsWith('/settings')) return { title: 'Settings', subtitle: 'Data backup, export/import, and sync' };
    return { title: 'Oneiric', subtitle: 'Dream Journal & Analysis' };
  };

  const { title, subtitle } = getPageMeta();

  const handleOpenNewDream = (date?: string) => {
    setEditingDream(undefined);
    setEditorPrefillDate(date);
    setIsEditorModalOpen(true);
  };

  const handleEditDream = (dream: DreamEntry) => {
    setEditingDream(dream);
    setEditorPrefillDate(undefined);
    setIsEditorModalOpen(true);
  };

  const handleEditorSaved = (_saved: DreamEntry) => {
    setIsEditorModalOpen(false);
    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: _saved }));
    } catch {
      // ignore
    }
    if (
      location.pathname !== '/journal' &&
      location.pathname !== '/' &&
      location.pathname !== '/calendar' &&
      location.pathname !== '/lucid' &&
      location.pathname !== '/timeline' &&
      location.pathname !== '/false-awakenings' &&
      location.pathname !== '/analytics' &&
      location.pathname !== '/correlations'
    ) {
      navigate('/journal');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b132b] text-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/80 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-[#0b132b] border-r border-slate-800 shadow-xl z-10 flex flex-col">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sample Preview Banner if active */}
        {isSamplePreview && (
          <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Sample Preview:</strong> You are viewing sample data. Sample entries will be cleared upon page refresh or clicking Exit.
              </span>
            </div>
            <button
              type="button"
              onClick={handleExitPreview}
              className="px-2.5 py-1 rounded-md bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700/80 font-medium cursor-pointer shrink-0 transition-colors"
            >
              Exit Preview
            </button>
          </div>
        )}

        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewDream={() => handleOpenNewDream()}
          title={title}
          subtitle={subtitle}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full">
          <Outlet
            context={{
              onOpenNewDream: handleOpenNewDream,
              onEditDream: handleEditDream,
            }}
          />
        </main>
      </div>

      {/* Global Quick Record / Edit Dream Modal */}
      <Modal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        title={editingDream ? 'Edit Dream Entry' : 'Record Dream'}
        subtitle="Write down your narrative while memory is freshest"
        maxWidth="2xl"
      >
        <DreamEditor
          initialDream={
            editingDream ||
            (editorPrefillDate
              ? ({
                  date: editorPrefillDate,
                  title: '',
                  narrative: '',
                  vividness: 3,
                  recallQuality: 'detailed',
                  lucidity: 'non-lucid',
                  emotions: [],
                  tags: [],
                } as unknown as DreamEntry)
              : undefined)
          }
          onSaved={handleEditorSaved}
          onCancel={() => setIsEditorModalOpen(false)}
          isModal={true}
        />
      </Modal>

      {/* Full-Screen Party Mode Lucid Dream Celebration */}
      <LucidCelebrationModal
        event={celebrationEvent}
        onDismiss={() => {
          setCelebrationEvent(null);
          if (location.pathname !== '/journal') {
            navigate('/journal');
          }
        }}
        onGoToSettings={() => {
          setCelebrationEvent(null);
          navigate('/settings');
        }}
      />
    </div>
  );
};
