import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Dashboard } from '../pages/Dashboard';
import { dreamService } from '../services/dreamService';
import { techniqueService } from '../services/techniqueService';
import { MemoryRouter } from 'react-router-dom';

describe('Dashboard - Copy Graph in Text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Copy Graph button and copies detailed graph description to clipboard', async () => {
    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    vi.spyOn(dreamService, 'getDashboardStats').mockResolvedValue({
      totalDreams: 5,
      totalLucid: 1,
      weeklyDreams: 5,
      currentStreak: 3,
      recentDreams: [],
      recallChartData: [
        { date: '2026-11-04', label: 'Wed', fullLabel: 'Nov 4', count: 3, lucidCount: 1 },
        { date: '2026-11-05', label: 'Thu', fullLabel: 'Nov 5', count: 0, lucidCount: 0 },
        { date: '2026-11-06', label: 'Fri', fullLabel: 'Nov 6', count: 2, lucidCount: 0 },
      ],
      hasEntries: true,
      todayRecorded: true,
    });

    vi.spyOn(techniqueService, 'getAllLogs').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Dashboard onOpenNewDream={vi.fn()} onEditDream={vi.fn()} />
      </MemoryRouter>
    );

    // Wait for dashboard to finish loading
    const copyButton = await screen.findByRole('button', { name: /copy graph in text/i });
    expect(copyButton).toBeInTheDocument();
    expect(screen.getByText('Copy Graph')).toBeInTheDocument();

    // Click the copy button
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('ONEIRIC DREAM RECALL ACTIVITY REPORT');
    expect(copiedText).toContain('Total Dreams Logged: 5');
    expect(copiedText).toContain('Lucid Dreams: 1');
    expect(copiedText).toContain('Maximum Single-Night Peak: 3 dreams');
    expect(copiedText).toContain('Peak Spike Occurrences');
    expect(copiedText).toContain('2026-11-04');
    expect(copiedText).toContain('CHRONOLOGICAL NIGHT-BY-NIGHT DATA TABLE');

    // UI feedback state
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});
