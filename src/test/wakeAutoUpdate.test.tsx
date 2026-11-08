import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DreamEditor } from '../components/journal/DreamEditor';
import { SettingsPage } from '../pages/SettingsPage';
import { wakeTimeService } from '../services/wakeTimeService';
import { db } from '../db/database';

describe('Dream Editor Wake-Up Time Auto-Update & Persistence', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    localStorage.clear();
    await db.dreams.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes new dreams with auto-update active and live clock time', () => {
    render(<DreamEditor onSaved={vi.fn()} onCancel={vi.fn()} />);

    // Auto indicator should be visible
    expect(screen.getByText(/Auto Live/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Auto/i })).toBeInTheDocument();

    const timeInput = screen.getByLabelText(/Approx\. Wake-up Time/i) as HTMLInputElement;
    const expectedCurrentTime = wakeTimeService.getCurrentTime();
    expect(timeInput.value).toBe(expectedCurrentTime);
  });

  it('pauses auto-update when user enters a custom time, and never modifies global settings in localStorage', () => {
    render(<DreamEditor onSaved={vi.fn()} onCancel={vi.fn()} />);

    const timeInput = screen.getByLabelText(/Approx\. Wake-up Time/i) as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '06:30' } });

    expect(timeInput.value).toBe('06:30');
    // Global wakeTimeService should NOT have been overridden to manual!
    const globalConfig = wakeTimeService.getWakeTimeConfig();
    expect(globalConfig.isManualOverride).toBe(false);

    // "Now" button should now be visible to allow resetting back to current time
    const nowButton = screen.getByRole('button', { name: /Now/i });
    expect(nowButton).toBeInTheDocument();

    // Click "Now" to re-engage live auto time
    fireEvent.click(nowButton);
    expect(timeInput.value).toBe(wakeTimeService.getCurrentTime());
    expect(screen.getByText(/Auto Live/i)).toBeInTheDocument();
  });

  it('supports toggling between Auto (Live Current Time) and Fixed Schedule in Settings', async () => {
    render(<SettingsPage />);

    // Default is Auto (Live Current Time)
    expect(screen.getByText(/Auto \(Live Current Time\)/i)).toBeInTheDocument();
    expect(screen.getByText('Auto Live Time')).toBeInTheDocument();

    // Switch to Fixed Schedule
    const fixedButton = screen.getByRole('button', { name: 'Fixed Schedule' });
    fireEvent.click(fixedButton);

    expect(screen.getAllByText('Fixed Schedule').length).toBeGreaterThanOrEqual(1);
    const fixedInput = screen.getByDisplayValue(/07:30|\d\d:\d\d/);
    expect(fixedInput).toBeInTheDocument();

    // Set custom fixed time to 05:45
    fireEvent.change(fixedInput, { target: { value: '05:45' } });
    expect(wakeTimeService.getWakeTimeConfig().isManualOverride).toBe(true);
    expect(wakeTimeService.getWakeTimeConfig().wakeTime).toBe('05:45');

    // Switch back to Auto
    const autoButton = screen.getByRole('button', { name: /Auto \(Live Current Time\)/i });
    fireEvent.click(autoButton);

    expect(wakeTimeService.getWakeTimeConfig().isManualOverride).toBe(false);
  });
});
