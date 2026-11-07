import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  preferencesService,
  PREFERENCES_STORAGE_KEY,
  PREFERENCES_CHANGED_EVENT,
} from '../services/preferencesService';
import { DEFAULT_USER_PREFERENCES } from '../types/preferences';
import { formatDate, formatTime } from '../utils/dateUtils';
import { JournalPreferencesCard } from '../components/settings/JournalPreferencesCard';
import { DisplayPreferencesCard } from '../components/settings/DisplayPreferencesCard';

describe('preferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--font-narrative');
    document.documentElement.style.removeProperty('--font-size-narrative');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default preferences when none stored', () => {
    const prefs = preferencesService.getPreferences();
    expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
    expect(prefs.cardDensity).toBe('comfortable');
    expect(prefs.narrativeFontFamily).toBe('sans');
    expect(prefs.dateFormat).toBe('standard');
    expect(prefs.timeFormat).toBe('12h');
    expect(prefs.defaultLucidity).toBe('non-lucid');
  });

  it('updates preferences, persists to localStorage, and updates document style properties', () => {
    const updated = preferencesService.updatePreferences({
      cardDensity: 'compact',
      narrativeFontFamily: 'serif',
      narrativeFontSize: 'xl',
      dateFormat: 'iso',
      timeFormat: '24h',
    });

    expect(updated.cardDensity).toBe('compact');
    expect(updated.narrativeFontFamily).toBe('serif');
    expect(updated.narrativeFontSize).toBe('xl');
    expect(updated.dateFormat).toBe('iso');
    expect(updated.timeFormat).toBe('24h');

    // Check localStorage
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
    expect(stored.cardDensity).toBe('compact');
    expect(stored.narrativeFontFamily).toBe('serif');

    // Check CSS custom properties
    expect(document.documentElement.style.getPropertyValue('--font-narrative')).toContain('Georgia');
    expect(document.documentElement.style.getPropertyValue('--font-size-narrative')).toBe('1.1875rem');
  });

  it('dispatches custom event on update', () => {
    const handler = vi.fn();
    window.addEventListener(PREFERENCES_CHANGED_EVENT, handler);

    preferencesService.updatePreferences({ showWordCounter: false });

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(PREFERENCES_CHANGED_EVENT, handler);
  });

  it('records last used lucidity and technique correctly', () => {
    preferencesService.updatePreferences({
      defaultLucidity: 'last-used',
      defaultTechnique: 'last-used',
    });

    preferencesService.recordLastUsedLucidity('lucid');
    preferencesService.recordLastUsedTechnique('WILD');

    expect(preferencesService.getEffectiveNewDreamLucidity()).toBe('lucid');
    expect(preferencesService.getEffectiveNewDreamTechnique()).toBe('WILD');
  });

  it('resets preferences back to defaults', () => {
    preferencesService.updatePreferences({ cardDensity: 'expanded' });
    const reset = preferencesService.resetPreferences();
    expect(reset.cardDensity).toBe('comfortable');
    expect(preferencesService.getPreferences().cardDensity).toBe('comfortable');
  });

  it('updates and persists custom graph line colors to preferences and CSS properties', () => {
    preferencesService.updatePreferences({
      chartTotalColor: '#8b5cf6',
      chartLucidColor: '#ec4899',
    });

    const prefs = preferencesService.getPreferences();
    expect(prefs.chartTotalColor).toBe('#8b5cf6');
    expect(prefs.chartLucidColor).toBe('#ec4899');
    expect(document.documentElement.style.getPropertyValue('--chart-total-color')).toBe('#8b5cf6');
    expect(document.documentElement.style.getPropertyValue('--chart-lucid-color')).toBe('#ec4899');
  });
});

describe('dateUtils with preferences integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('formats dates according to user preference', () => {
    const testDate = '2026-11-06';

    preferencesService.updatePreferences({ dateFormat: 'iso' });
    expect(formatDate(testDate)).toBe('2026-11-06');

    preferencesService.updatePreferences({ dateFormat: 'european' });
    expect(formatDate(testDate)).toBe('06 Nov 2026');

    preferencesService.updatePreferences({ dateFormat: 'standard' });
    expect(formatDate(testDate)).toContain('Nov');
  });

  it('formats time according to 12h vs 24h preferences', () => {
    const sampleTime = '15:45';

    preferencesService.updatePreferences({ timeFormat: '24h' });
    const formatted24 = formatTime(sampleTime);
    expect(formatted24).toBe('15:45');

    preferencesService.updatePreferences({ timeFormat: '12h' });
    const formatted12 = formatTime(sampleTime);
    expect(formatted12).toMatch(/3:45\s*pm/i);
  });
});

describe('Settings Cards Interactions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders JournalPreferencesCard and allows updating default lucidity', () => {
    const onFeedback = vi.fn();
    render(<JournalPreferencesCard onFeedback={onFeedback} />);

    expect(screen.getByText('Journaling & Editor Defaults')).toBeInTheDocument();

    const luciditySelect = screen.getByLabelText(/Initial Lucidity State/i);
    fireEvent.change(luciditySelect, { target: { value: 'lucid' } });

    expect(preferencesService.getPreferences().defaultLucidity).toBe('lucid');
    expect(onFeedback).toHaveBeenCalledWith('success', expect.stringContaining('Default lucidity'));
  });

  it('renders DisplayPreferencesCard and allows toggling card density and font', () => {
    const onFeedback = vi.fn();
    render(<DisplayPreferencesCard onFeedback={onFeedback} />);

    expect(screen.getByText('Typography, Layout & Date Preferences')).toBeInTheDocument();

    // Click 'Compact' card density button
    const compactBtn = screen.getByRole('button', { name: /Compact.*1-line/i });
    fireEvent.click(compactBtn);

    expect(preferencesService.getPreferences().cardDensity).toBe('compact');
    expect(onFeedback).toHaveBeenCalledWith('success', expect.stringContaining('density'));
  });
});
