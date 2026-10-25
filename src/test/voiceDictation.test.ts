import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  insertTextAtCursor,
  isSpeechRecognitionSupported,
  VoiceDictationController,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
} from '../services/voiceDictationService';

describe('Rapid Morning Voice Dictation Service', () => {
  describe('insertTextAtCursor logic', () => {
    it('inserts dictated text into empty narrative with initial capitalization', () => {
      const { updatedText, newCursorPos } = insertTextAtCursor('', 'flying over an obsidian city', 0, 0);
      expect(updatedText).toBe('Flying over an obsidian city');
      expect(newCursorPos).toBe('Flying over an obsidian city'.length);
    });

    it('appends text to an existing sentence with period and capitalizes the new sentence', () => {
      const initial = 'I walked into a quiet room.';
      const { updatedText, newCursorPos } = insertTextAtCursor(
        initial,
        'the clock on the wall was spinning backward',
        initial.length,
        initial.length
      );
      expect(updatedText).toBe('I walked into a quiet room. The clock on the wall was spinning backward');
      expect(newCursorPos).toBe(updatedText.length);
    });

    it('continues dictating mid-sentence without forced capitalization', () => {
      const initial = 'I looked out the window and';
      const { updatedText, newCursorPos } = insertTextAtCursor(
        initial,
        'saw the ocean glowing blue',
        initial.length,
        initial.length
      );
      expect(updatedText).toBe('I looked out the window and saw the ocean glowing blue');
      expect(newCursorPos).toBe(updatedText.length);
    });

    it('inserts dictated text into the middle of a sentence with correct spacing', () => {
      const initial = 'I opened the door and entered.';
      // Cursor between "the " and "door" (index 13)
      const { updatedText, newCursorPos } = insertTextAtCursor(initial, 'heavy wooden', 13, 13);
      expect(updatedText).toBe('I opened the heavy wooden door and entered.');
      expect(newCursorPos).toBe(13 + 'heavy wooden'.length);
    });

    it('replaces a highlighted selection with dictated text', () => {
      const initial = 'The sky was bright green and stormy.';
      // Select "bright green" (indices 12 to 24)
      const { updatedText, newCursorPos } = insertTextAtCursor(initial, 'deep violet', 12, 24);
      expect(updatedText).toBe('The sky was deep violet and stormy.');
      expect(newCursorPos).toBe(12 + 'deep violet'.length);
    });

    it('safely handles empty or whitespace-only dictated input', () => {
      const initial = 'Existing text preserved.';
      const { updatedText, newCursorPos } = insertTextAtCursor(initial, '   ', 10, 10);
      expect(updatedText).toBe('Existing text preserved.');
      expect(newCursorPos).toBe(10);
    });
  });

  describe('Browser compatibility detection', () => {
    const originalSpeechRecognition = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const originalWebkitSpeechRecognition = (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    afterEach(() => {
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    });

    it('returns false when SpeechRecognition APIs are missing', () => {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      expect(isSpeechRecognitionSupported()).toBe(false);
    });

    it('returns true when standard SpeechRecognition is defined', () => {
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = vi.fn();
      expect(isSpeechRecognitionSupported()).toBe(true);
    });

    it('returns true when webkitSpeechRecognition is defined', () => {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = vi.fn();
      expect(isSpeechRecognitionSupported()).toBe(true);
    });
  });

  describe('VoiceDictationController session management & error handling', () => {
    let mockInstance: {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      abort: ReturnType<typeof vi.fn>;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onresult: ((e: SpeechRecognitionEventLike) => void) | null;
      onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
    };

    beforeEach(() => {
      mockInstance = {
        continuous: false,
        interimResults: false,
        lang: '',
        start: vi.fn(),
        stop: vi.fn(),
        abort: vi.fn(),
        onstart: null,
        onend: null,
        onresult: null,
        onerror: null,
      };

      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = vi.fn(function () {
        return mockInstance;
      });
    });

    it('starts listening and notifies state change', () => {
      const onStateChange = vi.fn();
      const controller = new VoiceDictationController({
        onFinalResult: vi.fn(),
        onStateChange,
        onError: vi.fn(),
      });

      const started = controller.start('en-US');
      expect(started).toBe(true);
      expect(mockInstance.continuous).toBe(true);
      expect(mockInstance.interimResults).toBe(true);
      expect(mockInstance.start).toHaveBeenCalled();

      // Trigger start event
      mockInstance.onstart?.();
      expect(onStateChange).toHaveBeenCalledWith(true);
      expect(controller.active).toBe(true);
    });

    it('processes final results and ignores duplicate indices in continuous recognition', () => {
      const onFinalResult = vi.fn();
      const onInterimResult = vi.fn();

      const controller = new VoiceDictationController({
        onFinalResult,
        onInterimResult,
        onStateChange: vi.fn(),
        onError: vi.fn(),
      });

      controller.start();
      mockInstance.onstart?.();

      // Event 1: Interim chunk
      const event1: SpeechRecognitionEventLike = {
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: false,
            length: 1,
            0: { transcript: 'I looked down' },
          },
        },
      };
      mockInstance.onresult?.(event1);
      expect(onInterimResult).toHaveBeenCalledWith('I looked down');
      expect(onFinalResult).not.toHaveBeenCalled();

      // Event 2: Chunk finalized
      const event2: SpeechRecognitionEventLike = {
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript: 'I looked down at my hands' },
          },
        },
      };
      mockInstance.onresult?.(event2);
      expect(onFinalResult).toHaveBeenCalledWith('I looked down at my hands');
      expect(onFinalResult).toHaveBeenCalledTimes(1);

      // Event 3: Next result arrives, but includes previous result at index 0
      const event3: SpeechRecognitionEventLike = {
        resultIndex: 0,
        results: {
          length: 2,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript: 'I looked down at my hands' },
          },
          1: {
            isFinal: true,
            length: 1,
            0: { transcript: 'and counted six fingers' },
          },
        },
      };
      mockInstance.onresult?.(event3);
      // Index 0 was already processed, so onFinalResult should only receive index 1
      expect(onFinalResult).toHaveBeenCalledWith('and counted six fingers');
      expect(onFinalResult).toHaveBeenCalledTimes(2);
    });

    it('maps permission-denied errors and updates state', () => {
      const onError = vi.fn();
      const controller = new VoiceDictationController({
        onFinalResult: vi.fn(),
        onStateChange: vi.fn(),
        onError,
      });

      controller.start();
      mockInstance.onerror?.({ error: 'not-allowed' });

      expect(onError).toHaveBeenCalledWith(
        'permission-denied',
        expect.stringContaining('Microphone permission was denied')
      );
    });

    it('maps no-speech and network errors appropriately', () => {
      const onError = vi.fn();
      const controller = new VoiceDictationController({
        onFinalResult: vi.fn(),
        onStateChange: vi.fn(),
        onError,
      });

      controller.start();
      mockInstance.onerror?.({ error: 'no-speech' });
      expect(onError).toHaveBeenCalledWith('no-speech', expect.stringContaining('No speech was detected'));

      mockInstance.onerror?.({ error: 'network' });
      expect(onError).toHaveBeenCalledWith('network', expect.stringContaining('network error'));
    });

    it('ignores aborted events without surfacing noisy errors to the user', () => {
      const onError = vi.fn();
      const controller = new VoiceDictationController({
        onFinalResult: vi.fn(),
        onStateChange: vi.fn(),
        onError,
      });

      controller.start();
      mockInstance.onerror?.({ error: 'aborted' });
      expect(onError).not.toHaveBeenCalled();
    });

    it('resets processed results index on restarting dictation to prevent stale carry-over', () => {
      const onFinalResult = vi.fn();
      const controller = new VoiceDictationController({
        onFinalResult,
        onStateChange: vi.fn(),
        onError: vi.fn(),
      });

      // Session 1
      controller.start();
      mockInstance.onstart?.();
      mockInstance.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript: 'First session speech' },
          },
        },
      });
      expect(onFinalResult).toHaveBeenCalledTimes(1);

      controller.stop();
      mockInstance.onend?.();

      // Session 2 - New fresh instance
      controller.start();
      mockInstance.onstart?.();
      mockInstance.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript: 'Second session speech' },
          },
        },
      });
      expect(onFinalResult).toHaveBeenCalledWith('Second session speech');
      expect(onFinalResult).toHaveBeenCalledTimes(2);
    });
  });
});
