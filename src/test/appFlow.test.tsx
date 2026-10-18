import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { db } from '../db/database';
import { backupService } from '../services/backupService';
import { dreamService } from '../services/dreamService';

describe('Oneiric Full Application Navigation & Flows', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders Dashboard empty state when no dreams exist', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/No dreams recorded yet/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Total Recorded/i)).toBeInTheDocument();
  });

  it('populates dashboard metrics when sample data is loaded', async () => {
    await backupService.loadSampleData();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/The Obsidian Observatory and the River of Stars/i)).toBeInTheDocument();
    });

    // Check stats are rendered from real data
    const stats = await dreamService.getDashboardStats();
    expect(stats.totalDreams).toBe(5);
    expect(stats.totalLucid).toBe(3);
    expect(stats.hasEntries).toBe(true);
  });

  it('renders all navigation routes properly in the persistent sidebar', async () => {
    render(<App />);

    // Check navigation links in the persistent sidebar
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dream Journal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Correlations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dream Signs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lucid Dreams/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /False Awakenings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Techniques Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
  });
});
