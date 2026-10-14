import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { formatFullDate, getTodayDateString } from '../../utils/dateUtils';

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
  const todayFormatted = formatFullDate(getTodayDateString());

  return (
    <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-[#070a13]/80 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
      <div className="flex items-center gap-3 sm:gap-4">
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
