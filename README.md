# Oneiric

> **A local-first, zero-knowledge encrypted dream journal and lucid-dreaming research workbench.**

Oneiric is an analytical, local-first web application designed for personal dream recording, pattern discovery, and lucid-dreaming research. Built with React 19, TypeScript, Dexie.js (IndexedDB v2), and the Web Crypto API, Oneiric provides high-density analytics, rule-based dream-sign detection, a cross-dream correlation engine, and end-to-end encrypted multi-device synchronization—with **zero telemetry, zero tracking, and no external AI models reading your private dreams**.

---

## Table of Contents

- [Core Principles](#core-principles)
- [Key Features](#key-features)
  - [Analytical Dashboard & Recall Frequency](#analytical-dashboard--recall-frequency)
  - [Dream Journal & Multi-Scene Timeline](#dream-journal--multi-scene-timeline)
  - [Cross-Dream Correlation Engine](#cross-dream-correlation-engine)
  - [Rule-Based Dream Signs Detection & Library](#rule-based-dream-signs-detection--library)
  - [False Awakening Archive & Pattern Tracker](#false-awakening-archive--pattern-tracker)
  - [End-to-End Encrypted Multi-Device Sync](#end-to-end-encrypted-multi-device-sync)
  - [Data Sovereignty, Import & Export](#data-sovereignty-import--export)
- [Architecture & Technology Stack](#architecture--technology-stack)
  - [Database Schema (IndexedDB v2)](#database-schema-indexeddb-v2)
  - [Cryptographic Security Model](#cryptographic-security-model)
  - [Design Tokens & Anti-Vibecoding Philosophy](#design-tokens--anti-vibecoding-philosophy)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Testing & Quality Checks](#testing--quality-checks)
  - [Production Build](#production-build)
- [License](#license)

---

## Core Principles

1. **Absolute Privacy by Default**: Dream narratives are deeply personal records. Oneiric stores all data locally on your device in IndexedDB. Dream narratives, personal notes, and identifying information are never transmitted unencrypted to external services.
2. **Zero-Knowledge Multi-Device Sync**: Multi-device synchronization uses client-side **AES-256-GCM** encryption with keys derived via **PBKDF2** (100,000 SHA-256 iterations). The cloud relay server only ever receives opaque ciphertext.
3. **Statistical Integrity**: All pattern discovery and correlation features use deterministic algorithms based on empirical journal records. Comparisons always report sample sizes ($n \ge X$), differentiate zero from missing data, and respect distinct dream entry boundaries (a word repeated 10 times in one dream counts as 1 dream, not 10).
4. **Anti-Vibecoding Workbench Aesthetics**: Designed as an analytical research laboratory rather than a consumer marketing page. No artificial neon glows, no fake sparkles, no melodramatic cosmic fluff. A calm, disciplined midnight palette (`#0b132b`) with clear typography and visible keyboard focus rings.

---

## Key Features

### Analytical Dashboard & Recall Frequency

The Oneiric Dashboard provides an immediate analytical overview of your nocturnal patterns and recall consistency:

- **Key Performance Indicators**: Total recorded dreams, weekly dream count, overall lucidity percentage, and consecutive journaling streak.
- **Interactive Recall Activity Graph**: Visualize recall patterns over time with flexible date range filters:
  - **1 Week** (7 days, weekday view)
  - **2 Weeks** (14 days)
  - **3 Weeks** (21 days)
  - **1 Month** (30 days)
  - **All Time** (from your earliest recorded dream to today)
- **Total vs. Lucid Breakdown**: Layered area charts distinguishing total dreams remembered from verified lucid experiences per night.
- **Unremembered Days Audit**: Easily log nights where no dreams were recalled. These check-ins maintain streak transparency without polluting your dream narratives.

---

### Dream Journal & Multi-Scene Timeline

Capture dream narratives with high analytical fidelity:

- **Rich Entry Details**: Title, date, wake-up time, vividness rating (1–5 scale), recall clarity (Fragment, Hazy, Detailed, Hyper-Vivid), and lucidity level (Non-Lucid, Semi-Lucid, Lucid).
- **Multi-Scene Support**: Record multi-stage dreams with scene breaks, tracking shifts in location, characters, and lucidity level per scene.
- **Emotional Tagging**: Categorize emotional tones (Wonder, Fear, Confusion, Joy, Euphoria, Neutral) to discover mood patterns.
- **Full-Text Instant Search & Filters**: Filter by lucidity status, date ranges, vividness, custom tags, or dream signs with sub-millisecond local queries.

---

### Cross-Dream Correlation Engine

Discover meaningful descriptive relationships across your nocturnal records:

- **Dream Signs vs. Lucidity**: Measures which recurring signs correlate with successful lucidity induction.
- **Techniques vs. Outcomes**: Evaluate the empirical recall and lucidity rates of different techniques (MILD, WILD, WBTB, Reality Checks, All-Day Awareness).
- **Scene Counts vs. Control & Vividness**: Analyzes whether multi-scene dreams correlate with higher lucidity confidence and dream control.
- **Sample Size Transparency**: Every correlation card displays the exact sample size ($n$), preventing misleading conclusions from small datasets.

---

### Rule-Based Dream Signs Detection & Library

Identify recurring motifs without relying on external cloud APIs:

- **Local Detection Engine**: Scans dream titles, narratives, and scene descriptions for recurring anomalies, locations, people, objects, and actions.
- **Distinct Entry Boundary Rule**: Requires occurrences across at least two distinct calendar dates. Repetition within a single dream narrative is correctly counted as one dream.
- **Sign Lifecycle Management**:
  - **Suggested**: Detected by the rule-based scanner based on keyword recurrence.
  - **Confirmed**: Promoted by the user as an active personal dream sign.
  - **Dismissed**: Silently suppressed so irrelevant words never reappear as suggestions.
- **Bulk Operations**: Multi-select support to confirm, dismiss, delete, or merge signs across your entire journal.

---

### False Awakening Archive & Pattern Tracker

False awakenings—vivid dreams of waking up when still asleep—are critical phenomena for lucid dreaming practice:

- **Dedicated Archive**: Isolate and analyze false awakening incidents.
- **Conversion Tracking**: Track whether a false awakening led to a lucidity trigger or disorientation.
- **Trigger Analysis**: Catalog common triggers (alarms, room anomalies, clock checks) to build reliable reality-check habits.

---

### End-to-End Encrypted Multi-Device Sync

Synchronize seamlessly across desktop computers, tablets, and smartphones without creating a third-party account:

- **Zero-Knowledge Architecture**:
  - **Encryption**: AES-256-GCM authenticated encryption.
  - **Key Derivation**: PBKDF2 with SHA-256 and 100,000 iterations from a 6-word secret passphrase.
  - **Unique IVs**: A fresh 12-byte initialization vector (`iv`) is generated for every sync payload.
- **Unified Sync Key (`ONR-SYNC-...`)**: Pairs secondary devices with a single string containing your vault identifier and secret key.
- **Two-Way Tombstoned Merge**: Ensures deletes, updates, and creates merge deterministically across multiple active devices.
- **Offline / Air-Gapped Transfer**: Generate direct encrypted transfer packages to copy and paste between devices without using a cloud relay.

---

### Data Sovereignty, Import & Export

- **JSON Data Portability**: Export your complete database (dreams, technique logs, custom tags, dream signs) into clean, human-readable, validated JSON.
- **Safe Import Merging**: Preview import files with detailed validation summaries (total records, dates, tags) before applying changes.
- **Sample Data Toggle**: Experiment with sample data for demonstration, and remove it with one click without affecting your personal entries.

---

## Architecture & Technology Stack

```
Oneiric Architecture
├── UI Layer (React 19, TypeScript, Tailwind CSS v4, Lucide Icons)
│   ├── Pages (/dashboard, /journal, /analytics, /signs, /correlations, /timeline, /settings)
│   ├── Components (RecallChart, DreamEditor, MonthCalendar, StatCards)
│   └── Routing (React Router v7)
├── Service Layer (Deterministic Business Logic & Analytics)
│   ├── dreamService.ts (CRUD, dashboard stats, range recall calculations)
│   ├── dreamSignService.ts (Rule-based scanner, confirmation/dismissal)
│   ├── correlationService.ts (Descriptive statistics & correlation discovery)
│   ├── syncService.ts (Two-way tombstoned merge, cloud relay dispatch)
│   ├── cryptoService.ts (Client-side Web Crypto AES-256-GCM / PBKDF2)
│   └── backupService.ts (JSON schema validation & migration)
└── Persistence Layer (Dexie.js / IndexedDB v2)
    ├── dreams (id, date, lucidity, vividness, scenes, tags, emotions)
    ├── techniqueLogs (id, date, technique, outcome, notes)
    ├── dreamSigns (id, name, category, status, keywords)
    └── customTags (id, name, createdAt)
```

### Database Schema (IndexedDB v2)

```typescript
interface DreamEntry {
  id: string;
  title: string;
  narrative: string;
  date: string; // YYYY-MM-DD
  wakeUpTime?: string; // HH:MM
  vividness: 1 | 2 | 3 | 4 | 5;
  recallQuality: 'fragment' | 'hazy' | 'detailed' | 'hyper-vivid';
  lucidity: 'non-lucid' | 'semi-lucid' | 'lucid';
  dreamControl?: 1 | 2 | 3 | 4 | 5;
  falseAwakening?: boolean;
  falseAwakeningDetails?: string;
  scenes?: DreamScene[];
  emotions: string[];
  tags: string[];
  dreamSignsNotes?: string;
  createdAt: number;
  updatedAt: number;
}
```

### Cryptographic Security Model

| Component | Standard | Specification |
|:---|:---|:---|
| **Cipher** | AES-GCM | 256-bit key length, 128-bit authentication tag |
| **Key Derivation** | PBKDF2 | SHA-256 digest, 100,000 iterations, 16-byte cryptographically secure salt |
| **Entropy Source** | Web Crypto | `crypto.getRandomValues()` for IVs and salts |
| **Password Hygiene** | DOM Protection | Zero `type="password"` inputs; CSS text masking (`-webkit-text-security`) prevents browser credential manager interception |

### Design Tokens & Anti-Vibecoding Philosophy

Oneiric enforces strict design discipline to maintain an analytical laboratory atmosphere:

- **Base Background**: `#0b132b` (Deep midnight navy)
- **Surface Panels**: `#101a38` (Dark slate surface)
- **Raised Surfaces**: `#152248`
- **Subtle Borders**: `rgba(255, 255, 255, 0.08)` / `#1e293b`
- **Primary Cobalt Accent**: `#2563eb` (`hover: #1d4ed8`)
- **Typography**: Clean system sans font stack with high-contrast text (`#f8fafc`, `#94a3b8`)
- **Radius Hierarchy**: `rounded-md` (6px badges), `rounded-lg` (8px inputs & buttons), `rounded-xl` (12px top-level cards). Never `rounded-2xl` or `rounded-3xl` as generic wrappers.

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm` (v9+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mikzqc/oneiric.git
   cd oneiric
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Start the local Vite development server:
```bash
npm run dev
```

The application will be running at **`http://localhost:5180/`**.

### Testing & Quality Checks

Run the automated test suite (60 unit and integration tests across 9 suites):
```bash
npm test
```

Run Oxlint for fast, strict TypeScript and React linting:
```bash
npm run lint
```

### Production Build

Type-check and compile the application for production:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
