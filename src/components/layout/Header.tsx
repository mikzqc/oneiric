import React, { useState, useEffect } from 'react';
import { Menu, Plus, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { formatFullDate, getTodayDateString } from '../../utils/dateUtils';
import { syncService } from '../../services/syncService';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenNewDream: () => void;
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenNewDream,
  title,
  subtitle,
}) => {
  const navigate = useNavigate();
  const todayFormatted = formatFullDate(getTodayDateString());
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const updateSync = () => {
      setIsConfigured(syncService.isConfigured());
    };
    updateSync();
    window.addEventListener('oneiric:sync-status-changed', updateSync);
    return () => window.removeEventListener('oneiric:sync-status-changed', updateSync);
  }, []);

  const handleQuickSync = async () => {
    if (!isConfigured) {
      navigate('/settings');
      return;
    }
    try {
      setIsSyncing(true);
      await syncService.syncNow();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    } catch (err) {
      console.warn('Quick sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-[#0b132b]/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title */}
        <div>
          {title && <h1 className="text-base sm:text-lg font-semibold text-slate-100">{title}</h1>}
          {subtitle && <p className="hidden sm:block text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync Status Button */}
        <button
          type="button"
          onClick={handleQuickSync}
          title={isConfigured ? 'Encrypted Sync Active (Click to sync now)' : 'Configure Multi-Device Sync in Settings'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            isConfigured
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-blue-300'
              : 'bg-slate-900/50 border-slate-800/60 text-slate-400 hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : justSynced ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Cloud className={`w-3.5 h-3.5 ${isConfigured ? 'text-blue-400' : 'text-slate-400'}`} />
          )}
          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : justSynced ? 'Synced' : isConfigured ? 'Sync' : 'Sync: Off'}
          </span>
          {isConfigured && !isSyncing && !justSynced && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Date Pill */}
        <div className="hidden lg:flex items-center px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 font-medium">
          <span>{todayFormatted}</span>
        </div>

        {/* Record Dream CTA */}
        <Button
          variant="celestial"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={onOpenNewDream}
        >
          <span className="hidden xs:inline">Record a Dream</span>
          <span className="xs:hidden">Record</span>
        </Button>
      </div>
    </header>
  );
};
