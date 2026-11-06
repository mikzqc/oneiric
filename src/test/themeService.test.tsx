import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { THEMES_CATALOG } from '../types/theme';
import { themeService, THEME_STORAGE_KEY, THEME_CHANGED_EVENT } from '../services/themeService';
import { ThemeSelectorCard } from '../components/settings/ThemeSelectorCard';

describe('Theme Management System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Catalog & Configuration', () => {
    it('contains exactly 15 curated dark themes', () => {
      expect(THEMES_CATALOG).toHaveLength(15);
    });

    it('ensures each theme has unique ID, name, and valid hex palette', () => {
      const ids = new Set<string>();
      const names = new Set<string>();

      for (const theme of THEMES_CATALOG) {
        expect(ids.has(theme.id)).toBe(false);
        expect(names.has(theme.name)).toBe(false);
        ids.add(theme.id);
        names.add(theme.name);

        expect(theme.palette.bgBase).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.palette.bgSurface).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.palette.accentPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.previewColors).toHaveLength(4);
      }
    });

    it('defaults to "midnight" when no preference is stored', () => {
      expect(themeService.getCurrentThemeId()).toBe('midnight');
      expect(themeService.getCurrentTheme().name).toBe('Oneiric Midnight');
    });
  });

  describe('themeService API', () => {
    it('applies theme attributes and CSS variables to documentElement', () => {
      themeService.setTheme('nordic-aurora');

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('nordic-aurora');
      expect(document.documentElement.getAttribute('data-theme')).toBe('nordic-aurora');

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--bg-base')).toBe('#08131a');
      expect(style.getPropertyValue('--accent-primary')).toBe('#06b6d4');
    });

    it('dispatches oneiric:theme-changed event upon switching theme', () => {
      const handler = vi.fn();
      window.addEventListener(THEME_CHANGED_EVENT, handler);

      themeService.setTheme('emerald-abyss');

      expect(handler).toHaveBeenCalledTimes(1);
      const eventDetail = handler.mock.calls[0][0].detail;
      expect(eventDetail.id).toBe('emerald-abyss');
      expect(eventDetail.name).toBe('Emerald Abyss');

      window.removeEventListener(THEME_CHANGED_EVENT, handler);
    });

    it('initializes stored theme on initTheme() call', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'amethyst-twilight');
      themeService.initTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe('amethyst-twilight');
      expect(document.documentElement.style.getPropertyValue('--bg-base')).toBe('#120c1f');
    });
  });

  describe('ThemeSelectorCard Component', () => {
    it('renders all 15 themes in the grid by default', () => {
      render(<ThemeSelectorCard />);

      for (const theme of THEMES_CATALOG) {
        expect(screen.getAllByText(theme.name).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('filters themes by category pills', () => {
      render(<ThemeSelectorCard />);

      // Filter by Earthy
      const earthyButton = screen.getByRole('button', { name: /Earthy & Organic/i });
      fireEvent.click(earthyButton);

      expect(screen.getByText('Emerald Abyss')).toBeInTheDocument();
      expect(screen.getByText('Nocturnal Moss')).toBeInTheDocument();
      expect(screen.getByText('Velvet Espresso')).toBeInTheDocument();
      expect(screen.queryByText('Nordic Aurora')).not.toBeInTheDocument();
    });

    it('switches the active theme when clicking a theme card', () => {
      const onFeedback = vi.fn();
      render(<ThemeSelectorCard onFeedback={onFeedback} />);

      const obsidianCard = screen.getByText('Abyssal Obsidian');
      fireEvent.click(obsidianCard);

      expect(themeService.getCurrentThemeId()).toBe('abyssal-obsidian');
      expect(document.documentElement.getAttribute('data-theme')).toBe('abyssal-obsidian');
      expect(onFeedback).toHaveBeenCalledWith('success', expect.stringContaining('Abyssal Obsidian'));
    });
  });
});
