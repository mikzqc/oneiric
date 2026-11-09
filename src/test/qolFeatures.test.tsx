import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { dreamService } from '../services/dreamService';
import { db } from '../db/database';
import { DreamEntry } from '../types/dream';
import { DreamCard } from '../components/journal/DreamCard';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';

describe('Quality of Life (QoL) Features (1, 2, 3, 5, 6, 7, 8)', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.customTags.clear();
  });

  const sampleDream: DreamEntry = {
    id: 'test-dream-1',
    title: 'Gliding Over Ancient Ruins',
    narrative: 'I found myself soaring over crumbling stone pillars enveloped in emerald moss. The air smelled of rain and ancient pine. Every breath was exhilarating.',
    date: '2026-11-09',
    wakeUpTime: '07:30',
    vividness: 5,
    recallQuality: 'vivid',
    lucidity: 'lucid',
    emotions: ['Wonder', 'Euphoria'],
    tags: ['flying', 'ancient', 'lucid'],
    dreamSignsNotes: 'Gravity distortion when leaping',
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('Feature 3 & 8: toggles favorite status, retrieves favorite dreams and frequent tags', async () => {
    const created1 = await dreamService.createDream({
      ...sampleDream,
      title: 'Dream 1',
      tags: ['flying', 'lucid'],
      isFavorite: false,
    });
    const created2 = await dreamService.createDream({
      ...sampleDream,
      title: 'Dream 2',
      tags: ['flying', 'ocean'],
      isFavorite: true,
    });

    // Test toggleFavorite
    const isFavNow = await dreamService.toggleFavorite(created1.id);
    expect(isFavNow).toBe(true);

    const favorites = await dreamService.getFavoriteDreams();
    expect(favorites.length).toBe(2);

    // Toggle off
    const toggledOff = await dreamService.toggleFavorite(created1.id);
    expect(toggledOff).toBe(false);

    const favoritesAfter = await dreamService.getFavoriteDreams();
    expect(favoritesAfter.length).toBe(1);
    expect(favoritesAfter[0].id).toBe(created2.id);

    // Test getFrequentTags
    const frequent = await dreamService.getFrequentTags(5);
    expect(frequent).toContain('flying');
    expect(frequent[0]).toBe('flying'); // Most frequent tag
  });

  it('Feature 3 & 7: DreamCard displays bookmark button, toggles favorite, and shows word count & reading time pill', () => {
    const onToggleFavorite = vi.fn();
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <DreamCard
        dream={sampleDream}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
      />
    );

    // Feature 7: word count & reading time pill (24 words -> 24w · 1m)
    const wordCountBadge = screen.getByTitle(/24 words · ~1 min read/i);
    expect(wordCountBadge).toBeInTheDocument();
    expect(wordCountBadge.textContent).toContain('24w · 1m');

    // Feature 3: bookmark button
    const bookmarkBtn = screen.getByTitle(/mark as favorite/i);
    expect(bookmarkBtn).toBeInTheDocument();

    fireEvent.click(bookmarkBtn);
    expect(onToggleFavorite).toHaveBeenCalledWith(sampleDream);
  });

  it('Feature 1: DreamDetailModal navigates prev/next with buttons and ArrowLeft/ArrowRight keys', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onClose = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <DreamDetailModal
        dream={sampleDream}
        isOpen={true}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={true}
        hasNext={true}
      />
    );

    const prevBtn = screen.getByLabelText(/previous dream/i);
    const nextBtn = screen.getByLabelText(/next dream/i);
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);

    // Keyboard navigation (Feature 5 + Feature 1)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onPrev).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledTimes(2);

    // When hasPrev is false, prev button should be disabled
    rerender(
      <DreamDetailModal
        dream={sampleDream}
        isOpen={true}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={false}
        hasNext={true}
      />
    );
    expect(screen.getByLabelText(/previous dream/i)).toBeDisabled();
  });

  it('Feature 2: DreamDetailModal copies markdown to clipboard and displays feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <DreamDetailModal
        dream={sampleDream}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const copyBtn = screen.getByTitle(/copy dream as markdown/i);
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);

    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('# Gliding Over Ancient Ruins');
    expect(copiedText).toContain(sampleDream.narrative);
    expect(copiedText).toContain('### Dream Signs');
    expect(copiedText).toContain('**Tags:** flying, ancient, lucid');

    // UI feedback changes to 'Copied'
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('Feature 3 & 7: DreamDetailModal renders star/favorite button and reading metrics', () => {
    const onToggleFavorite = vi.fn();

    render(
      <DreamDetailModal
        dream={sampleDream}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={onToggleFavorite}
      />
    );

    // Feature 7 word count in modal
    expect(screen.getByText(/24 words · ~1m read/i)).toBeInTheDocument();

    // Feature 3 favorite toggle in modal
    const starBtn = screen.getByText('Star');
    expect(starBtn).toBeInTheDocument();

    fireEvent.click(starBtn);
    expect(onToggleFavorite).toHaveBeenCalledWith(sampleDream);
  });
});
