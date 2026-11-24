import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { db } from '../db/database';
import { DreamDumpPage } from '../pages/DreamDumpPage';
import { GoalsPage } from '../pages/GoalsPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Dream Dump & Goals UI Pages', () => {
  beforeEach(async () => {
    await db.dreamDumps.clear();
    await db.goals.clear();
    mockNavigate.mockReset();
    localStorage.clear();
  });

  describe('DreamDumpPage UI', () => {
    it('renders scratchpad with placeholder and allows typing and autosaving', async () => {
      render(
        <BrowserRouter>
          <DreamDumpPage />
        </BrowserRouter>
      );

      // Wait for loading to finish
      const textarea = await screen.findByPlaceholderText(/what do you remember\?/i);
      expect(textarea).toBeInTheDocument();

      // Type some fragmented memory
      fireEvent.change(textarea, {
        target: { value: 'Saw a mysterious red door in the subway station.' },
      });

      // Verify saving status indicator appears
      expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();

      // Wait for debounce and "Saved" indicator
      await waitFor(
        () => {
          expect(screen.getByText(/saved/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Word count is updated
      expect(screen.getByText(/9 words/i)).toBeInTheDocument();
    });

    it('navigates to dream editor when "Turn into dream entry" is clicked', async () => {
      render(
        <BrowserRouter>
          <DreamDumpPage />
        </BrowserRouter>
      );

      const textarea = await screen.findByPlaceholderText(/what do you remember\?/i);
      fireEvent.change(textarea, {
        target: { value: 'Flying over snowy mountain peaks with full lucidity.' },
      });

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });

      const turnBtn = screen.getByRole('button', { name: /turn into dream entry/i });
      expect(turnBtn).not.toBeDisabled();
      fireEvent.click(turnBtn);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/journal/new',
          expect.objectContaining({
            state: expect.objectContaining({
              prefillNarrative: 'Flying over snowy mountain peaks with full lucidity.',
            }),
          })
        );
      });
    });

    it('supports creating a new independent fragment', async () => {
      render(
        <BrowserRouter>
          <DreamDumpPage />
        </BrowserRouter>
      );

      const textarea = await screen.findByPlaceholderText(/what do you remember\?/i);
      fireEvent.change(textarea, {
        target: { value: 'First fragment content.' },
      });

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });

      // Click "New" button in the sidebar
      const newBtn = screen.getByRole('button', { name: /new/i });
      fireEvent.click(newBtn);

      // New empty fragment is ready
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });
  });

  describe('GoalsPage UI', () => {
    it('renders intentions header, tabs, and sets a new intention', async () => {
      render(
        <BrowserRouter>
          <GoalsPage />
        </BrowserRouter>
      );

      expect(await screen.findByText(/your intentions/i)).toBeInTheDocument();
      expect(screen.getByText(/active \(0\)/i)).toBeInTheDocument();

      // Click "Set Intention"
      const setBtn = screen.getByRole('button', { name: /set intention/i });
      fireEvent.click(setBtn);

      // Fill in intention modal
      const titleInput = screen.getByLabelText(/intention title/i);
      fireEvent.change(titleInput, {
        target: { value: 'Master Wake-Back-To-Bed timing' },
      });

      const establishBtn = screen.getByRole('button', { name: /establish intention/i });
      fireEvent.click(establishBtn);

      // Verify goal is in the list
      await waitFor(() => {
        expect(screen.getByText('Master Wake-Back-To-Bed timing')).toBeInTheDocument();
      });
      expect(screen.getByText(/active \(1\)/i)).toBeInTheDocument();
    });

    it('toggles goal completion and moves to Completed tab', async () => {
      render(
        <BrowserRouter>
          <GoalsPage />
        </BrowserRouter>
      );

      // Create goal
      const setBtn = await screen.findByRole('button', { name: /set intention/i });
      fireEvent.click(setBtn);
      fireEvent.change(screen.getByLabelText(/intention title/i), {
        target: { value: 'Recognize dream signs in water' },
      });
      fireEvent.click(screen.getByRole('button', { name: /establish intention/i }));

      await waitFor(() => {
        expect(screen.getByText('Recognize dream signs in water')).toBeInTheDocument();
      });

      // Mark completed
      const checkBtn = screen.getByTitle(/mark as completed/i);
      fireEvent.click(checkBtn);

      // Now Active should be 0, Completed should be 1
      await waitFor(() => {
        expect(screen.getByText(/active \(0\)/i)).toBeInTheDocument();
        expect(screen.getByText(/completed \(1\)/i)).toBeInTheDocument();
      });

      // Switch to Completed tab
      fireEvent.click(screen.getByRole('button', { name: /completed \(1\)/i }));
      expect(await screen.findByText('Recognize dream signs in water')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    });
  });
});
