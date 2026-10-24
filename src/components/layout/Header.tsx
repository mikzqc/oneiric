import React, { useState, useEffect } from 'react';
import { Menu, Plus, Cloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string; tooltip?: string } | null>(null);

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
      setSyncFeedback(null);
      const res = await syncService.syncNow();
      setJustSynced(true);
      if (res.newDreamsCount > 0) {
        setSyncFeedback({
          type: 'success',
          text: `+${res.newDreamsCount} new dream${res.newDreamsCount > 1 ? 's' : ''}`,
        });
      } else {
        setSyncFeedback({
          type: 'success',
          text: 'Up to date',
        });
      }
      setTimeout(() => {
        setJustSynced(false);
        setSyncFeedback(null);
      }, 3500);
    } catch (err) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const rawMsg = err instanceof Error ? err.message : 'Sync failed';
      const isNetwork = isOffline || /offline|networkerror|failed to fetch|fetch failed/i.test(rawMsg);

      const buttonText = isNetwork ? 'Offline (No Connection)' : 'Sync Failed';
      const tooltipText = isNetwork
        ? 'Unable to sync: You are currently offline. Please reconnect to Wi-Fi or the internet and try again.'
        : rawMsg;

      setSyncFeedback({ type: 'error', text: buttonText, tooltip: tooltipText });
      setTimeout(() => setSyncFeedback(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-14 px-4 sm:px-6 border-b border-slate-800 bg-[#0b132b] flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title */}
        <div>
          {title && <h1 className="text-sm sm:text-base font-semibold text-slate-100 leading-tight">{title}</h1>}
          {subtitle && <p className="hidden sm:block text-[11px] text-slate-400 leading-tight">{subtitle}</p>}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Sync Status Button */}
        <button
          type="button"
          onClick={handleQuickSync}
          title={
            syncFeedback?.tooltip ||
            syncFeedback?.text ||
            (isConfigured
              ? 'Encrypted Sync Active (Click to sync now)'
              : 'Configure Multi-Device Sync in Settings')
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
            syncFeedback?.type === 'error'
              ? 'bg-red-950/60 border-red-700/80 text-red-300 hover:bg-red-900/60'
              : syncFeedback?.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
              : isConfigured
              ? 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-slate-100'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : syncFeedback?.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          ) : syncFeedback?.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : justSynced ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Cloud className={`w-3.5 h-3.5 ${isConfigured ? 'text-blue-400' : 'text-slate-500'}`} />
          )}
          <span className="hidden sm:inline">
            {isSyncing
              ? 'Syncing...'
              : syncFeedback
              ? syncFeedback.text
              : justSynced
              ? 'Synced'
              : isConfigured
              ? 'Sync'
              : 'Sync: Off'}
          </span>
          {isConfigured && !isSyncing && !syncFeedback && !justSynced && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Date Display */}
        <div className="hidden lg:flex items-center px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-medium">
          <span>{todayFormatted}</span>
        </div>

        {/* Record Dream CTA */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={onOpenNewDream}
        >
          <span>Record Dream</span>
        </Button>
      </div>
    </header>
  );
};
