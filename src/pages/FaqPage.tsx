import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HelpCircle,
  Mic,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'dictation' | 'sync' | 'privacy';
  question: string;
  answer: React.ReactNode;
}

export const FaqPage: React.FC = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'dictation' | 'sync' | 'privacy'>(
    location.hash === '#voice-dictation' ? 'dictation' : 'all'
  );
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
    const isVoice = location.hash === '#voice-dictation';
    const initialMap: Record<string, boolean> = {
      'why-dictation-unavailable': true,
      'firefox-enable-steps': true,
      'brave-enable-steps': isVoice,
    };
    return initialMap;
  });

  // Handle hash scrolling if navigating to #voice-dictation
  useEffect(() => {
    if (location.hash === '#voice-dictation') {
      const el = document.getElementById('voice-dictation');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const faqItems: FaqItem[] = [
    {
      id: 'why-dictation-unavailable',
      category: 'dictation',
      question: 'Why does Oneiric say "Dictation Unavailable"?',
      answer: (
        <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <p>
            Oneiric uses the standard <strong>Web Speech API</strong> (<code className="text-blue-300 bg-slate-900 px-1.5 py-0.5 rounded text-xs">SpeechRecognition</code>) built directly into modern web browsers. This enables hands-free morning dream dictation without requiring third-party plugins.
          </p>
          <p>
            If Oneiric displays <strong>Dictation Unavailable</strong>, your current web browser does not have speech recognition enabled by default, or lacks support for the Web Speech API.
          </p>
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Browser Support Overview:</h4>
            <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-400">
              <li><strong className="text-slate-200">Google Chrome / Microsoft Edge:</strong> Supported out-of-the-box on desktop and mobile.</li>
              <li><strong className="text-slate-200">Apple Safari (macOS & iOS):</strong> Supported out-of-the-box using Apple on-device speech processing.</li>
              <li><strong className="text-slate-200">Mozilla Firefox:</strong> Disabled by default; can be enabled via experimental settings in <code className="text-blue-300 bg-slate-950 px-1 py-0.5 rounded">about:config</code>.</li>
              <li><strong className="text-slate-200">Brave Browser:</strong> Disabled by default due to Brave Shields; requires toggling Google Speech Services in Brave Settings.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'firefox-enable-steps',
      category: 'dictation',
      question: 'How do I enable voice dictation in Mozilla Firefox?',
      answer: (
        <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <p>
            Mozilla Firefox includes experimental Web Speech recognition support that is turned off by default. You can enable it through Firefox's internal configuration:
          </p>
          <ol className="space-y-2.5 list-decimal list-inside text-slate-300 pl-1 text-xs sm:text-sm">
            <li>
              Open a new tab in Firefox and navigate to <code className="text-blue-400 bg-slate-900 px-2 py-0.5 rounded font-mono">about:config</code>.
            </li>
            <li>
              Click <strong>Accept the Risk and Continue</strong> when the warning page appears.
            </li>
            <li>
              In the search bar at the top, search for:
              <div className="my-1.5 p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-blue-300 flex items-center justify-between">
                <span>media.webspeech.recognition.enable</span>
                <span className="text-slate-400">Set to: <strong>true</strong></span>
              </div>
              Double-click the entry or click the Toggle button to change it from <code className="text-red-400">false</code> to <code className="text-emerald-400">true</code>.
            </li>
            <li>
              Search for the second preference:
              <div className="my-1.5 p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-blue-300 flex items-center justify-between">
                <span>media.webspeech.recognition.force_enable</span>
                <span className="text-slate-400">Set to: <strong>true</strong></span>
              </div>
              Toggle it to <code className="text-emerald-400">true</code> as well.
            </li>
            <li>
              <strong>Restart Firefox</strong> completely, reopen Oneiric, and grant microphone permissions when prompted.
            </li>
          </ol>
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/50 text-xs text-blue-300">
            <strong>Note:</strong> Firefox's implementation relies on external recognition services that may vary depending on your OS build. If Firefox still fails to capture audio on your system, we recommend using Chromium, Chrome, or Safari for voice dictation sessions.
          </div>
        </div>
      ),
    },
    {
      id: 'brave-enable-steps',
      category: 'dictation',
      question: 'How do I enable speech recognition in Brave Browser?',
      answer: (
        <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <p>
            By default, Brave Shields blocks Google Speech Services to protect privacy, causing the speech recognition API to report unavailable. To enable it:
          </p>
          <ol className="space-y-2 list-decimal list-inside text-slate-300 text-xs sm:text-sm pl-1">
            <li>Open Brave Settings (<code className="text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">brave://settings/privacy</code>).</li>
            <li>Scroll to <strong>Privacy and security</strong>.</li>
            <li>Enable <strong>"Use Google services for speech recognition"</strong>.</li>
            <li>Reload Oneiric and allow microphone access when clicking Voice Dictation.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'chrome-edge-permissions',
      category: 'dictation',
      question: 'How do I grant microphone permissions in Chrome, Edge, or Safari?',
      answer: (
        <div className="space-y-2.5 text-slate-300 text-sm leading-relaxed">
          <p>If you accidentally blocked microphone permissions:</p>
          <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-300">
            <li>
              <strong>Chrome & Edge:</strong> Click the <em>View site information</em> (tune/lock) icon on the left side of the browser address bar, locate <strong>Microphone</strong>, and switch it to <strong>Allow</strong>. Then refresh the page.
            </li>
            <li>
              <strong>Safari (macOS):</strong> Go to <em>Safari &gt; Settings &gt; Websites &gt; Microphone</em>, find Oneiric in the list, and set it to <strong>Allow</strong>.
            </li>
            <li>
              <strong>Safari (iOS / iPadOS):</strong> Go to <em>Settings &gt; Safari &gt; Microphone</em>, and ensure it is set to <strong>Ask</strong> or <strong>Allow</strong>.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'privacy-audio-processing',
      category: 'privacy',
      question: 'Does voice dictation send my audio to the cloud?',
      answer: (
        <div className="space-y-2.5 text-slate-300 text-sm leading-relaxed">
          <p>
            <strong>Oneiric itself never transmits, stores, or listens to your voice audio.</strong> Oneiric is a strictly local-first application with zero backend servers, zero analytics, and zero audio logging.
          </p>
          <p>
            However, because the Web Speech API is an operating-system and browser-level feature, audio transcription is handled by your browser vendor:
          </p>
          <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-400">
            <li><strong>Apple Safari (iOS/macOS):</strong> Dictation is processed on-device via Apple's Neural Engine.</li>
            <li><strong>Google Chrome & Microsoft Edge:</strong> Audio snippets are transcribed by Google or Microsoft speech recognition servers over secure HTTPS.</li>
          </ul>
          <p className="text-xs text-slate-400">
            If you require 100% offline air-gapped privacy without browser speech services, you can always type narratives manually using the standard keyboard input.
          </p>
        </div>
      ),
    },
    {
      id: 'offline-sync-faq',
      category: 'sync',
      question: 'Can I synchronize my journal across devices while offline?',
      answer: (
        <div className="space-y-2.5 text-slate-300 text-sm leading-relaxed">
          <p>
            <strong>No, multi-device synchronization requires an active internet connection.</strong>
          </p>
          <p>
            Here is how offline operation works:
          </p>
          <ol className="text-xs space-y-1.5 list-decimal list-inside text-slate-300">
            <li>While offline, you can continue recording dreams, editing entries, and browsing your journal with zero restrictions. Everything is stored locally in your device's IndexedDB database.</li>
            <li>When your internet connection is restored, click the <strong>Sync</strong> button in the top header or allow automatic synchronization to securely exchange encrypted updates with your other devices.</li>
            <li>If you try to sync without Wi-Fi or data, Oneiric will display an informative <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">Offline (No Connection)</code> status.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'local-data-storage',
      category: 'privacy',
      question: 'Where is my dream journal data stored?',
      answer: (
        <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
          <p>
            All dream entries, tags, techniques, dream signs, and settings are stored locally on your device inside your browser's persistent <strong>IndexedDB</strong> database.
          </p>
          <p>
            Your narratives never leave your device unless you explicitly configure encrypted cloud sync or export a manual backup file in Settings.
          </p>
        </div>
      ),
    },
    {
      id: 'recently-deleted-retention',
      category: 'privacy',
      question: 'How does Undo Delete and Recently Deleted work?',
      answer: (
        <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
          <p>
            When you delete a dream from your journal:
          </p>
          <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-300">
            <li>An immediate <strong>Undo</strong> notification appears on your screen for 6 seconds.</li>
            <li>The deleted dream is moved to the <strong>Recently Deleted</strong> trash in Settings, where it is preserved for <strong>30 days</strong>.</li>
            <li>You can restore it to your journal at any time within those 30 days, or permanently erase it with confirmation.</li>
          </ul>
        </div>
      ),
    },
  ];

  const filteredItems = faqItems.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const questionMatch = item.question.toLowerCase().includes(q);
      return questionMatch;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-blue-400" />
          <span>Frequently Asked Questions & Help Guide</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
          Step-by-step guides for browser setup, voice dictation, offline operation, data privacy, and synchronization.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics (e.g., Firefox, voice dictation, offline sync, privacy)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-1 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            All Topics ({faqItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('dictation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
              selectedCategory === 'dictation'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-blue-400" />
            <span>Voice Dictation</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('sync')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
              selectedCategory === 'sync'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync & Offline</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('privacy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
              selectedCategory === 'privacy'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Privacy & Data</span>
          </button>
        </div>
      </div>

      {/* Voice Dictation Specific Anchor */}
      <div id="voice-dictation" className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <p className="text-slate-400 text-sm">No help topics matched your search query.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Reset search
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOpen = Boolean(openItems[item.id]);
            return (
              <div
                key={item.id}
                className="rounded-xl bg-[#101a38] border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 hover:bg-slate-900/50 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-slate-100 text-sm sm:text-base flex items-center gap-2.5">
                    {item.category === 'dictation' && <Mic className="w-4 h-4 text-blue-400 shrink-0" />}
                    {item.category === 'sync' && <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {item.category === 'privacy' && <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />}
                    <span>{item.question}</span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/80 bg-[#0d152e]">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
