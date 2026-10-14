import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Modal } from '../common/Modal';
import { DreamEditor } from '../journal/DreamEditor';
import { DreamEntry } from '../../types/dream';
import { backupService } from '../../services/backupService';
import { X, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<DreamEntry | undefined>(undefined);
  const [editorPrefillDate, setEditorPrefillDate] = useState<string | undefined>(undefined);
  const [isSamplePreview, setIsSamplePreview] = useState(false);

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
    window.location.reload();
  };

  // Page titles lookup
  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/') return { title: 'Dashboard', subtitle: 'Nocturnal overview and recall metrics' };
    if (path.startsWith('/analytics')) return { title: 'Dream Intelligence & Analytics', subtitle: 'Longitudinal recall metrics, emotional distributions, and heatmaps' };
    if (path.startsWith('/journal/new')) return { title: 'Record Dream', subtitle: 'Capture your nocturnal memory' };
    if (path.startsWith('/journal/edit')) return { title: 'Edit Dream', subtitle: 'Refine journal entry' };
    if (path.startsWith('/journal')) return { title: 'Dream Journal', subtitle: 'Search and inspect recorded dreams' };
    if (path.startsWith('/signs')) return { title: 'Dream Signs Library', subtitle: 'Recurring patterns, keyword detection, and reality check triggers' };
    if (path.startsWith('/calendar')) return { title: 'Calendar', subtitle: 'Explore dreams across monthly cycles' };
    if (path.startsWith('/timeline')) return { title: 'Dream Timeline', subtitle: 'Chronological nocturnal stream of dreams and techniques' };
    if (path.startsWith('/lucid')) return { title: 'Lucid Dreams', subtitle: 'Archive of conscious nocturnal awakenings' };
    if (path.startsWith('/false-awakenings')) return { title: 'False Awakenings', subtitle: 'Track simulated awakenings, belief status, and lucidity transitions' };
    if (path.startsWith('/techniques')) return { title: 'Techniques Lab', subtitle: 'Lucid dream induction methods & experimental outcomes' };
    if (path.startsWith('/settings')) return { title: 'Settings', subtitle: 'Backups, imports, and privacy settings' };
    return { title: 'Oneiric', subtitle: 'Lucid Dream Studio' };
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
    // If we're on the journal or dashboard, triggering a rerender or navigate
    if (
      location.pathname === '/journal' ||
      location.pathname === '/' ||
      location.pathname === '/calendar' ||
      location.pathname === '/lucid'
    ) {
      window.location.reload();
    } else {
      navigate('/journal');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a13] text-slate-100 stars-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#0b0f19] border-r border-slate-800 shadow-2xl z-10 flex flex-col">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sample Preview Banner if active */}
        {isSamplePreview && (
          <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3 shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>
                <strong>Exploration Preview Active:</strong> You are viewing sample data. All sample entries will automatically disappear when you refresh the page.
              </span>
            </div>
            <button
              type="button"
              onClick={handleExitPreview}
              className="px-2.5 py-1 rounded-lg bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700 font-semibold cursor-pointer shrink-0 transition-colors"
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
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
        title={editingDream ? 'Edit Dream Entry' : 'Record a New Dream'}
        subtitle="Capture memories immediately for maximum vividness and recall depth"
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
    </div>
  );
};
