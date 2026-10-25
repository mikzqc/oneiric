// Voice Dictation Service using standard Web Speech API
// Strictly local browser interface with transparent privacy disclosures.

export interface SpeechRecognitionResultItem {
  transcript: string;
  confidence?: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

/**
 * Checks whether the current browser environment supports the Web Speech API.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Retrieves the available SpeechRecognition constructor if supported.
 */
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * Inserts recognized speech text into an existing body of text at the given cursor/selection range.
 * Preserves existing text, intelligently manages surrounding spaces, and capitalizes initial sentences.
 */
export function insertTextAtCursor(
  currentText: string,
  newText: string,
  selectionStart: number,
  selectionEnd: number
): { updatedText: string; newCursorPos: number } {
  const cleanNew = newText.trim();
  if (!cleanNew) {
    return { updatedText: currentText, newCursorPos: selectionStart };
  }

  // Ensure bounds are safe
  const start = Math.max(0, Math.min(selectionStart, currentText.length));
  const end = Math.max(start, Math.min(selectionEnd, currentText.length));

  const before = currentText.slice(0, start);
  const after = currentText.slice(end);

  // Determine needed space before
  let prefix = '';
  if (before.length > 0 && !/\s$/.test(before)) {
    prefix = ' ';
  }

  // Determine needed space after
  let suffix = '';
  if (after.length > 0 && !/^\s/.test(after)) {
    suffix = ' ';
  }

  // Capitalize first letter if at start of narrative or immediately following sentence-ending punctuation (.!?)
  let formattedNew = cleanNew;
  const isStartOrSentence = before.trim().length === 0 || /[.!?]\s*$/.test(before);
  if (isStartOrSentence && formattedNew.length > 0) {
    formattedNew = formattedNew.charAt(0).toUpperCase() + formattedNew.slice(1);
  }

  const insertion = prefix + formattedNew + suffix;
  const updatedText = before + insertion + after;
  const newCursorPos = before.length + prefix.length + formattedNew.length;

  return { updatedText, newCursorPos };
}

export type DictationErrorCode =
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'audio-capture'
  | 'unsupported'
  | 'unknown';

export interface VoiceDictationCallbacks {
  onFinalResult: (finalText: string) => void;
  onInterimResult?: (interimText: string) => void;
  onStateChange: (isListening: boolean) => void;
  onError: (code: DictationErrorCode, userMessage: string) => void;
}

/**
 * Controller managing speech recognition lifecycle, session isolation, and error mapping.
 */
export class VoiceDictationController {
  private instance: SpeechRecognitionInstance | null = null;
  private callbacks: VoiceDictationCallbacks;
  private isListening = false;
  private processedIndex = 0;

  constructor(callbacks: VoiceDictationCallbacks) {
    this.callbacks = callbacks;
  }

  public get active(): boolean {
    return this.isListening;
  }

  public start(lang?: string): boolean {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      this.callbacks.onError(
        'unsupported',
        'Voice dictation is not supported by your current browser. Standard keyboard input is unaffected.'
      );
      return false;
    }

    // Stop existing instance if already active
    if (this.instance) {
      try {
        this.instance.abort();
      } catch {
        // ignore
      }
      this.instance = null;
    }

    try {
      this.processedIndex = 0;
      const rec = new RecognitionCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US';

      rec.onstart = () => {
        this.isListening = true;
        this.callbacks.onStateChange(true);
      };

      rec.onend = () => {
        this.isListening = false;
        this.callbacks.onStateChange(false);
        this.instance = null;
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const error = event.error;
        let code: DictationErrorCode = 'unknown';
        let msg = `Speech recognition error: ${error}`;

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          code = 'permission-denied';
          msg = 'Microphone permission was denied. Please allow microphone access in your browser settings to dictate.';
        } else if (error === 'no-speech') {
          code = 'no-speech';
          msg = 'No speech was detected. Please check your microphone and speak clearly.';
        } else if (error === 'network') {
          code = 'network';
          msg = 'Speech recognition network error. Please check your internet connection.';
        } else if (error === 'audio-capture') {
          code = 'audio-capture';
          msg = 'No microphone was detected. Please verify your audio input hardware is connected.';
        } else if (error === 'aborted') {
          // Aborted by user or cleanup; do not surface noisy error
          return;
        }

        this.callbacks.onError(code, msg);
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let interimCombined = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (!item || item.length === 0) continue;

          const transcript = item[0].transcript;
          if (item.isFinal) {
            // Guard against duplicate processing of already committed segments
            if (i >= this.processedIndex) {
              this.callbacks.onFinalResult(transcript);
              this.processedIndex = i + 1;
            }
          } else {
            interimCombined += transcript;
          }
        }

        if (this.callbacks.onInterimResult) {
          this.callbacks.onInterimResult(interimCombined);
        }
      };

      this.instance = rec;
      rec.start();
      return true;
    } catch (err) {
      this.isListening = false;
      this.callbacks.onStateChange(false);
      this.callbacks.onError(
        'unknown',
        err instanceof Error ? err.message : 'Failed to initialize speech recognition.'
      );
      return false;
    }
  }

  public stop(): void {
    if (this.instance) {
      try {
        this.instance.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.callbacks.onStateChange(false);
  }

  public abort(): void {
    if (this.instance) {
      try {
        this.instance.abort();
      } catch {
        // ignore
      }
      this.instance = null;
    }
    this.isListening = false;
    this.callbacks.onStateChange(false);
  }
}
