import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DreamEditor } from '../components/journal/DreamEditor';
import { DreamEntry } from '../types/dream';
import { db } from '../db/database';

const DRAFT_STORAGE_KEY = 'oneiric_active_dream_draft';
const getEditDraftKey = (id: string) => `oneiric_edit_draft_${id}`;

describe('Dream Editor Draft Auto-Recovery System', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.dreams.clear();
    vi.clearAllMocks();
  });

  it('initializes and recovers every Phase 1 and Phase 2 field from a new-dream draft without data loss', async () => {
    const savedDraft = {
      title: 'Interrupted Hypnagogic Journey',
      narrative: 'I found myself standing upon a luminescent observatory overlooking a ringed gas giant.',
      date: '2026-10-24',
      wakeUpTime: '06:45',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      emotions: ['Awe', 'Euphoria'],
      tags: ['Astral', 'Space'],
      dreamSignsNotes: 'Binary star constellations pulsating rhythmically',
      falseAwakening: true,
      falseAwakeningDetails: {
        believedAwake: false,
        environmentDescription: 'Metallic bedroom chamber with gravity stabilizers',
        triggerOrAnomaly: 'Digital chronometer running backwards',
        realityCheckNotes: 'Pushed finger through palm smoothly',
      },
      dreamControl: 4,
      scenesCount: 2,
      scenes: [
        {
          id: 'sc-1',
          sceneNumber: 1,
          title: 'The Awakening',
          narrative: 'Woke up inside the observation pod.',
          falseAwakening: true,
          lucid: true,
        },
        {
          id: 'sc-2',
          sceneNumber: 2,
          title: 'The EVA Walk',
          narrative: 'Floated out through the airlock into the nebula.',
          falseAwakening: false,
          lucid: true,
        },
      ],
      interpretationNotes: 'Exploring subconscious architectural archetypes.',
      realityChecksUseful: ['Pinch nose and breathe', 'Look at hands / palm push'],
      relatedDreamIds: ['prev-dream-99'],
      savedAt: Date.now() - 5000,
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    const onSaved = vi.fn();
    const onCancel = vi.fn();

    render(<DreamEditor onSaved={onSaved} onCancel={onCancel} />);

    // 1. Verify notification banner is displayed
    expect(screen.getByText(/Restored an unsaved dream draft from your previous session/i)).toBeInTheDocument();

    // 2. Verify title and narrative fields are restored
    const titleInput = screen.getByLabelText(/Dream Title/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Interrupted Hypnagogic Journey');

    const narrativeInput = screen.getByLabelText(/Dream Narrative/i) as HTMLTextAreaElement;
    expect(narrativeInput.value).toContain('luminescent observatory');

    // 3. Verify advanced parameters panel is automatically expanded
    expect(screen.getByText(/Pattern & Lucidity Parameters/i)).toBeInTheDocument();
    expect(screen.getByText(/False Awakening Occurred/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Dream Meaning & Waking-Life Interpretation/i)).toBeInTheDocument();

    // 4. Save dream and verify that all recovered fields are passed to onSaved and persisted
    const saveButton = screen.getByRole('button', { name: /Record Dream/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const savedPayload = onSaved.mock.calls[0][0];
    expect(savedPayload.title).toBe('Interrupted Hypnagogic Journey');
    expect(savedPayload.narrative).toContain('luminescent observatory');
    expect(savedPayload.date).toBe('2026-10-24');
    expect(savedPayload.wakeUpTime).toBe('06:45');
    expect(savedPayload.vividness).toBe(5);
    expect(savedPayload.recallQuality).toBe('crystal');
    expect(savedPayload.lucidity).toBe('lucid');
    expect(savedPayload.emotions).toEqual(['Awe', 'Euphoria']);
    expect(savedPayload.tags).toEqual(['Astral', 'Space']);
    expect(savedPayload.dreamSignsNotes).toBe('Binary star constellations pulsating rhythmically');

    // Verify Phase 2 Intelligence fields
    expect(savedPayload.falseAwakening).toBe(true);
    expect(savedPayload.falseAwakeningDetails).toBeDefined();
    expect(savedPayload.falseAwakeningDetails.believedAwake).toBe(false);
    expect(savedPayload.falseAwakeningDetails.environmentDescription).toBe('Metallic bedroom chamber with gravity stabilizers');
    expect(savedPayload.falseAwakeningDetails.triggerOrAnomaly).toBe('Digital chronometer running backwards');
    expect(savedPayload.falseAwakeningDetails.realityCheckNotes).toBe('Pushed finger through palm smoothly');
    expect(savedPayload.dreamControl).toBe(4);
    expect(savedPayload.scenesCount).toBe(2);
    expect(savedPayload.scenes).toHaveLength(2);
    expect(savedPayload.interpretationNotes).toBe('Exploring subconscious architectural archetypes.');
    expect(savedPayload.realityChecksUseful).toEqual(['Pinch nose and breathe', 'Look at hands / palm push']);
    expect(savedPayload.relatedDreamIds).toEqual(['prev-dream-99']);

    // Draft key should be cleared after saving
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('restores all Phase 2 fields when recovering an existing-dream edit draft via applyRecoveredEditDraft', async () => {
    const existingDream: DreamEntry = {
      id: 'existing-dream-42',
      title: 'Original Baseline Title',
      narrative: 'Original baseline narrative text.',
      date: '2026-10-20',
      wakeUpTime: '07:30',
      vividness: 2,
      recallQuality: 'hazy',
      lucidity: 'non-lucid',
      emotions: ['Curiosity'],
      tags: ['Flying'],
      falseAwakening: false,
      dreamControl: 0,
      interpretationNotes: '',
      realityChecksUseful: [],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    // Pre-populate IndexedDB with existing dream so updateDream works
    await db.dreams.put(existingDream);

    const editDraft = {
      title: 'Updated Title After Disruption',
      narrative: 'Expanded narrative with lucid awakening details.',
      date: '2026-10-21',
      wakeUpTime: '08:00',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Awe', 'Euphoria'],
      tags: ['Flying', 'False Awakening'],
      dreamSignsNotes: 'Mirrors not reflecting room correctly',
      falseAwakening: true,
      falseAwakeningDetails: {
        believedAwake: false,
        environmentDescription: 'Submarine cabin with portholes',
        triggerOrAnomaly: 'Water was rising upwards',
        realityCheckNotes: 'Nose pinch reality check confirmed dream state',
      },
      dreamControl: 5,
      scenesCount: 3,
      interpretationNotes: 'Deep psychological breakthrough regarding lucid stabilization.',
      realityChecksUseful: ['Pinch nose and breathe'],
      savedAt: Date.now() - 3000,
    };

    const draftKey = getEditDraftKey(existingDream.id);
    localStorage.setItem(draftKey, JSON.stringify(editDraft));

    const onSaved = vi.fn();
    const onCancel = vi.fn();

    render(<DreamEditor initialDream={existingDream} onSaved={onSaved} onCancel={onCancel} />);

    // Verify recovery notification is present
    expect(screen.getByText(/Found unsaved edits for this entry from your last session/i)).toBeInTheDocument();

    // Verify localStorage has NOT been clobbered on mount before restoring
    const unRestoredDraft = JSON.parse(localStorage.getItem(draftKey) || '{}');
    expect(unRestoredDraft.title).toBe('Updated Title After Disruption');

    // Click "Restore Edits"
    const restoreBtn = screen.getByRole('button', { name: /Restore Edits/i });
    fireEvent.click(restoreBtn);

    // Verify inputs reflect the recovered draft
    const titleInput = screen.getByLabelText(/Dream Title/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Updated Title After Disruption');

    // Submit the form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const savedPayload = onSaved.mock.calls[0][0];
    expect(savedPayload.title).toBe('Updated Title After Disruption');
    expect(savedPayload.narrative).toBe('Expanded narrative with lucid awakening details.');
    expect(savedPayload.falseAwakening).toBe(true);
    expect(savedPayload.falseAwakeningDetails).toBeDefined();
    expect(savedPayload.falseAwakeningDetails.believedAwake).toBe(false);
    expect(savedPayload.falseAwakeningDetails.environmentDescription).toBe('Submarine cabin with portholes');
    expect(savedPayload.falseAwakeningDetails.triggerOrAnomaly).toBe('Water was rising upwards');
    expect(savedPayload.falseAwakeningDetails.realityCheckNotes).toBe('Nose pinch reality check confirmed dream state');
    expect(savedPayload.dreamControl).toBe(5);
    expect(savedPayload.scenesCount).toBe(3);
    expect(savedPayload.interpretationNotes).toBe('Deep psychological breakthrough regarding lucid stabilization.');
    expect(savedPayload.realityChecksUseful).toEqual(['Pinch nose and breathe']);

    // Edit draft in localStorage is cleared after saving
    expect(localStorage.getItem(draftKey)).toBeNull();
  });

  it('preserves valid falsy and zero values without falling back to truthiness defaults', async () => {
    const existingDream: DreamEntry = {
      id: 'existing-zero-test',
      title: 'Observer Experience',
      narrative: 'Passive observation of floating geometric shapes.',
      date: '2026-10-24',
      wakeUpTime: '05:00',
      vividness: 1,
      recallQuality: 'fragmentary',
      lucidity: 'non-lucid',
      emotions: [],
      tags: [],
      falseAwakening: false,
      dreamControl: 0,
      interpretationNotes: '',
      realityChecksUseful: [],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    await db.dreams.put(existingDream);

    const draftWithZeros = {
      title: 'Observer Experience Updated',
      narrative: 'Still zero control, passive observer.',
      date: '2026-10-24',
      wakeUpTime: '00:00',
      vividness: 2,
      recallQuality: 'fragmentary',
      lucidity: 'uncertain',
      emotions: [],
      tags: [],
      falseAwakening: false, // Explicit false
      falseAwakeningDetails: {
        believedAwake: false, // Explicit false
      },
      dreamControl: 0, // Explicit zero
      scenesCount: 1,
      interpretationNotes: '',
      realityChecksUseful: [],
      savedAt: Date.now() - 1000,
    };

    const draftKey = getEditDraftKey(existingDream.id);
    localStorage.setItem(draftKey, JSON.stringify(draftWithZeros));

    const onSaved = vi.fn();
    render(<DreamEditor initialDream={existingDream} onSaved={onSaved} onCancel={vi.fn()} />);

    const restoreBtn = screen.getByRole('button', { name: /Restore Edits/i });
    fireEvent.click(restoreBtn);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const savedPayload = onSaved.mock.calls[0][0];
    expect(savedPayload.falseAwakening).toBe(false);
    expect(savedPayload.wakeUpTime).toBe('00:00');
  });

  it('clears all Phase 1 and Phase 2 fields and localStorage when draft is discarded', async () => {
    const savedDraft = {
      title: 'Discardable Draft',
      narrative: 'Will be wiped out.',
      dreamControl: 5,
      falseAwakening: true,
      interpretationNotes: 'Discard me',
      savedAt: Date.now(),
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    render(<DreamEditor onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/Restored an unsaved dream draft from your previous session/i)).toBeInTheDocument();

    const discardBtn = screen.getByRole('button', { name: /Discard draft/i });
    fireEvent.click(discardBtn);

    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    const titleInput = screen.getByLabelText(/Dream Title/i) as HTMLInputElement;
    expect(titleInput.value).toBe('');

    const narrativeInput = screen.getByLabelText(/Dream Narrative/i) as HTMLTextAreaElement;
    expect(narrativeInput.value).toBe('');
  });

  it('simulates interrupted editing: serializes draft to localStorage and restores on next session reload', async () => {
    const onSaved1 = vi.fn();
    const { unmount } = render(<DreamEditor onSaved={onSaved1} onCancel={vi.fn()} />);

    // Type title and narrative
    const titleInput = screen.getByLabelText(/Dream Title/i);
    fireEvent.change(titleInput, { target: { value: 'Interrupted Flight Session' } });

    const narrativeInput = screen.getByLabelText(/Dream Narrative/i);
    fireEvent.change(narrativeInput, { target: { value: 'Gliding between fractal clouds over the sea.' } });

    // Open Advanced Parameters
    const advancedToggle = screen.getByRole('button', { name: /Pattern & Lucidity Parameters/i });
    fireEvent.click(advancedToggle);

    // Toggle False Awakening
    const faCheckbox = screen.getByRole('checkbox', { name: /False Awakening Occurred/i });
    fireEvent.click(faCheckbox);

    // Enter False Awakening environment
    const envInput = screen.getByPlaceholderText(/e\.g\. My real bedroom, childhood home, hotel room/i);
    fireEvent.change(envInput, { target: { value: 'Identical hotel room with mirrored floor' } });

    // Enter Interpretation notes
    const interpTextarea = screen.getByPlaceholderText(/What personal significance, waking reflections/i);
    fireEvent.change(interpTextarea, { target: { value: 'Symbolic yearning for transcendence' } });

    // Verify localStorage has been populated with complete Phase 2 serialized draft
    await waitFor(() => {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.title).toBe('Interrupted Flight Session');
      expect(parsed.falseAwakening).toBe(true);
      expect(parsed.falseAwakeningDetails?.environmentDescription).toBe('Identical hotel room with mirrored floor');
      expect(parsed.interpretationNotes).toBe('Symbolic yearning for transcendence');
    });

    // Simulate browser reload / crash by unmounting
    unmount();

    // Now re-mount (new session)
    const onSaved2 = vi.fn();
    render(<DreamEditor onSaved={onSaved2} onCancel={vi.fn()} />);

    // Verify draft restored banner
    expect(screen.getByText(/Restored an unsaved dream draft from your previous session/i)).toBeInTheDocument();

    // Check title and narrative
    expect((screen.getByLabelText(/Dream Title/i) as HTMLInputElement).value).toBe('Interrupted Flight Session');
    expect((screen.getByLabelText(/Dream Narrative/i) as HTMLTextAreaElement).value).toBe(
      'Gliding between fractal clouds over the sea.'
    );

    // Advanced section should be auto-expanded because meaningful data was recovered
    expect(screen.getByText(/Personal Dream Meaning & Waking-Life Interpretation/i)).toBeInTheDocument();

    // Save and verify onSaved receives everything intact
    const saveButton = screen.getByRole('button', { name: /Record Dream/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaved2).toHaveBeenCalledTimes(1);
    });

    const payload = onSaved2.mock.calls[0][0];
    expect(payload.title).toBe('Interrupted Flight Session');
    expect(payload.falseAwakening).toBe(true);
    expect(payload.falseAwakeningDetails.environmentDescription).toBe('Identical hotel room with mirrored floor');
    expect(payload.interpretationNotes).toBe('Symbolic yearning for transcendence');
  });
});
