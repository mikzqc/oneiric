import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DreamEditor } from '../components/journal/DreamEditor';
import { db } from '../db/database';

vi.mock('../services/celebrationService', () => ({
  celebrationService: {
    checkAndTriggerCelebration: vi.fn(),
  },
}));

describe('DreamEditor Tag Suggestions', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.customTags.clear();
    localStorage.clear();
  });

  it('reads dream narrative and presents relevant contextual tag suggestions', async () => {
    render(
      <DreamEditor
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const narrativeTextarea = screen.getByPlaceholderText(/describe your dream in vivid detail/i);

    // Type a dream about flying over the ocean and lucid dreaming
    fireEvent.change(narrativeTextarea, {
      target: {
        value: 'I was flying high over the ocean waves and realized I was having a lucid dream.',
      },
    });

    // Check that contextual suggestions header appears
    await waitFor(() => {
      expect(screen.getByText(/suggested from dream text/i)).toBeInTheDocument();
    });

    // Check that tags for flying, ocean, and lucid dream are suggested
    expect(screen.getByRole('button', { name: /\+Flying/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+Ocean & Sea/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+Lucid Dream/i })).toBeInTheDocument();

    // Clicking "+Flying" adds it to the active tags
    const flyingBtn = screen.getByRole('button', { name: /\+Flying/i });
    fireEvent.click(flyingBtn);

    // Verify tag is added to the active tag list
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Flying')).toBeInTheDocument();

    // Verify Flying is no longer in suggestions
    expect(screen.queryByRole('button', { name: /\+Flying/i })).not.toBeInTheDocument();
  });

  it('supports "Add all" to apply all detected suggestions in one click', async () => {
    render(
      <DreamEditor
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const narrativeTextarea = screen.getByPlaceholderText(/describe your dream in vivid detail/i);

    // Type a dream with multiple clear keyword motifs
    fireEvent.change(narrativeTextarea, {
      target: {
        value: 'I walked through a dark cemetery and saw a shadow figure near an old tomb.',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/suggested from dream text/i)).toBeInTheDocument();
    });

    const addAllBtn = screen.getByRole('button', { name: /add all/i });
    expect(addAllBtn).toBeInTheDocument();
    fireEvent.click(addAllBtn);

    // Check that both tags are now active
    expect(screen.getByText('Cemetery & Graves')).toBeInTheDocument();
    expect(screen.getByText('Shadow Figure')).toBeInTheDocument();

    // And the suggestion box disappears because all detected tags have been added
    expect(screen.queryByText(/suggested from dream text/i)).not.toBeInTheDocument();
  });
});
