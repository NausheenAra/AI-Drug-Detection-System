# 💊 Glacier Rx

> **AI-Powered Clinical Drug Interaction Analyzer** — Severity · Interaction Pairs · Side Effects · Patient Contraindications · Critical Alerts · Safer Alternatives for any drug combination

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%203.1%20Flash%20Lite-teal)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8)
![License](https://img.shields.io/badge/license-MIT-green)
![Medical](https://img.shields.io/badge/type-Medical%20Tool-red)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [How It Works](#-how-it-works)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [API Reference](#-api-reference)
- [TypeScript Types](#-typescript-types)
- [Usage Examples](#-usage-examples)
- [Export Features](#-export-features)
- [Available Scripts](#-available-scripts)
- [Medical Disclaimer](#-medical-disclaimer)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Glacier Rx** is a full-stack clinical drug interaction analyzer that combines **three independent intelligence sources** to deliver comprehensive, real-time pharmacological analysis for any combination of medications, supplements, or substances.

Unlike static databases that only cover pre-catalogued pairs, Glacier Rx uses the **Google Gemini AI API** to reason about any combination — including trios, multi-drug regimens, and interactions involving foods or supplements. A built-in **Express backend** with a 16-drug clinical knowledge base handles fast offline lookups for known pairs. Both analyses run **in parallel via `Promise.all`**, and results are merged, fuzzy-matched, and severity-sorted before rendering.

Every analysis is automatically saved — to **Firestore** for signed-in users or to **localStorage** for guests — so history is never lost regardless of auth state.

The system returns **seven structured outputs** for every query:

| Output | Description |
|---|---|
| 🔴 **Severity Rating** | Overall risk level — High / Medium / Low / None, derived from the highest-severity pair |
| 💊 **Interaction Pairs** | Every unique drug pair analyzed with severity, mechanism, and clinical recommendation |
| ⚠️ **Side Effects** | Combination-induced adverse effects from the Gemini analysis |
| 🧬 **Potential Risks** | Specific physiological risks — QT prolongation, serotonin syndrome, bleeding risk, etc. |
| 👥 **Patient Contraindications** | Population-specific warnings — elderly, pregnant, renally impaired |
| 🚨 **Critical Alerts** | Urgent warnings surfaced separately for immediate clinical attention |
| ✅ **Safer Alternatives** | AI-recommended substitute medications with lower interaction potential |

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| Multi-drug analysis | Analyze pairs, trios, and 5+ drug regimens simultaneously | ✅ Active |
| Parallel analysis engine | Backend + Gemini run simultaneously via `Promise.all` for maximum speed | ✅ Active |
| Complete pair coverage | Every unique drug pair (AB, AC, BC…) is explicitly analyzed — none skipped | ✅ Active |
| Fuzzy pair matching | Normalized string matching handles name variations from AI output | ✅ Active |
| Severity-sorted results | Interaction pairs sorted High → Medium → Low → None before display | ✅ Active |
| Gemini AI reasoning | `gemini-3.1-flash-lite-preview` with `ThinkingLevel.MINIMAL` + system instruction | ✅ Active |
| Schema-enforced output | Full `responseSchema` guarantees all seven output fields are present | ✅ Active |
| 16-drug rule-based DB | Express backend for instant known-pair lookups, prioritized over AI output | ✅ Active |
| Bidirectional lookup | Backend checks both A→B and B→A interaction directions | ✅ Active |
| Light / dark theme | System-preference-aware toggle, persisted to `localStorage` | ✅ Active |
| Firebase Google Auth | One-click Google sign-in via `signInWithPopup` | ✅ Active |
| Firestore history | Real-time per-user history via `onSnapshot`, auto-synced | ✅ Active |
| Guest localStorage history | Anonymous users get up to 50 history entries stored locally | ✅ Active |
| Dual history delete | Per-entry and clear-all deletion for both Firestore and localStorage | ✅ Active |
| PDF report export | Full clinical report via jsPDF + autoTable, severity-colored header | ✅ Active |
| CSV history export | All history entries exported as a CSV with date, drugs, severity, description | ✅ Active |
| Drug autocomplete | Debounced 300ms search against `/api/drugs/search` | ✅ Active |
| Framer Motion UI | Animated view transitions and staggered card reveals | ✅ Active |
| Responsive layout | Desktop, tablet, and mobile compatible | ✅ Active |
| Error boundary | Structured Firestore errors surfaced in a graceful crash UI | ✅ Active |

---

## 🛠️ Tech Stack

### Frontend
- **React 18 + TypeScript** — component-driven UI with strict typing throughout
- **Vite** — fast dev server with HMR and optimized production builds
- **Tailwind CSS v4** — utility-first styling; dark theme via `:root` CSS variables, light theme via `.light` class on `<html>`
- **Framer Motion** (`motion/react`) — animated page transitions and staggered card reveals
- **Lucide React** — icon set (Sun/Moon for theme toggle, clinical icons throughout)
- **jsPDF + jspdf-autotable** — fully client-side PDF generation; table headers colored by severity
- **Axios** — HTTP client with a preconfigured instance pointing at `/api`
- **clsx + tailwind-merge** — conditional class merging via the `cn()` utility

### Backend
- **Node.js + Express** — REST API server exposing `/api/analyze` and `/api/drugs/search`
- **TypeScript** — full type safety shared with the frontend
- **16-drug clinical knowledge base** — hardcoded expert system; backend results are always prioritized over AI output during the merge step

### AI Engine
- **Model:** `gemini-3.1-flash-lite-preview`
- **Google Gemini API** via `@google/genai` — structured JSON output enforced via `responseSchema`
- **`ThinkingLevel.MINIMAL`** — balances speed with clinical accuracy
- **System instruction** — dedicated pharmacist persona with explicit rules for pair coverage and drug name fidelity
- **Dynamic user prompt** — explicitly lists every unique pair to analyze (AB, AC, BC…) to prevent any pair being silently skipped

### Auth & Database
- **Firebase Authentication** — Google sign-in via `signInWithPopup` with `GoogleAuthProvider`
- **Cloud Firestore** — per-user `history` collection with real-time `onSnapshot` listener; `isAuthReady` flag prevents premature queries
- **localStorage fallback** — guests get up to 50 history entries stored in `local_history`; entries prefixed `local_` are routed to localStorage on delete
- **Structured Firestore error logging** — full auth state (uid, email, emailVerified, isAnonymous, providerData) serialized to JSON and thrown for the `ErrorBoundary` to parse

---

## 🏗️ Architecture
---

## ⚙️ How It Works

### 1. Drug Input

The user types a drug name into the input field. A `useEffect` watches the `input` state and fires `searchDrugs()` after a **300ms debounce**, hitting `GET /api/drugs/search?q=` on the Express backend. The backend searches both top-level drug entries and all `interactsWith` target names (covering substances like `Grapefruit Juice` and `Vitamin K` that only exist as interaction targets). Suggestions render in an animated dropdown via Framer Motion.

When the user presses Enter or clicks a suggestion, the drug is added to the `drugs[]` array. Duplicates are silently ignored.

### 2. Parallel Analysis — `Promise.all`

Clicking **Run Analysis** triggers `handleAnalyze()`, which runs both data sources simultaneously:
```typescript
const [backendData, aiData] = await Promise.all([
  analyzeDrugs(drugs),         // Express backend — rule-based 16-drug DB
  analyzeInteractions(drugs)   // Gemini AI — full clinical reasoning
]);
```

Running them in parallel rather than sequentially means total latency equals whichever takes longer, not the sum of both.

### 3. Gemini AI — System Instruction + Dynamic Pair Prompt

`geminiService.ts` sends two separate inputs to Gemini. The **system instruction** establishes the pharmacist persona and critical rules: use exact drug names, analyze every unique pair, and prioritize high-severity outcomes. The **user prompt** is dynamically generated to explicitly name every unique pair:
```typescript
const userPrompt = `Analyze: ${drugs.join(", ")}.
Pairs to cover: ${drugs.flatMap((d1, i) => drugs.slice(i+1).map(d2 => `(${d1}, ${d2})`)).join(", ")}.`;
```

This two-part prompt structure — combined with `ThinkingLevel.MINIMAL` for speed and the full `responseSchema` for reliability — ensures Gemini returns a complete, schema-valid JSON object every time.

### 4. Merge, Fuzzy Match, and Sort

After both calls resolve, the frontend constructs the final interaction list by iterating over every unique pair and applying this priority order:

**Step 1 — Enumerate all pairs.** The code generates every combination (AB, AC, BC…) from the `drugs[]` array.

**Step 2 — Backend-first lookup.** For each pair, the code first checks `backendData.interactions` using **normalized string matching** (lowercase, non-alphanumeric stripped). Backend results are always preferred because they come from verified clinical rules.

**Step 3 — Fuzzy AI fallback.** If no backend match is found, the code checks `aiData.interactions` with a more permissive match — it accepts pairs where one name *contains* the other, catching cases where Gemini abbreviates a drug name.

**Step 4 — None default.** If neither source matched the pair, the interaction is given a `Severity.NONE` with a standard clinical confirmation message. No pair is ever silently dropped.

**Step 5 — Sort by severity.** All final interactions are sorted `High → Medium → Low → None` before being stored in state, so the most critical information always appears at the top of the results view.

**Step 6 — Derive overall severity.** The overall `severity` field on the `AnalysisResult` is computed from the maximum severity found across all final pairs — not taken blindly from the AI.

### 5. History — Dual-Track Persistence

`saveToHistory()` checks whether a user is signed in and routes accordingly. Signed-in users get their analysis written to the Firestore `history` collection, which the `onSnapshot` listener picks up instantly without any manual refresh. Guest users get their entry written to `localStorage` under the key `local_history`, capped at 50 entries. Entries saved locally are prefixed `local_` so `deleteHistoryEntry()` knows to route deletions to `localStorage` rather than Firestore.

### 6. Theme Toggle

Theme state initializes from `localStorage` on first load. A `useEffect` applies the `light` or `dark` class directly to `document.documentElement` whenever the theme changes, and persists the choice back to `localStorage`. The CSS in `index.css` defines all colors as CSS variables on `:root` (dark) and `.light`, so the entire app re-themes instantly with zero re-render of individual components.

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Google Cloud project with Gemini API enabled — get a key at [aistudio.google.com](https://aistudio.google.com)
- Firebase project with **Authentication** (Google provider) and **Firestore** enabled

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/your-username/glacier-rx.git
cd glacier-rx
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your environment file**
```bash
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

**4. Add your Firebase config**

Create `firebase-applet-config.json` in the project root using the config object from your Firebase console (Project Settings → Your Apps → SDK setup and configuration):
```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "...",
  "firestoreDatabaseId": "(default)"
}
```

**5. Start the development server**
```bash
npm run dev
```

**6. Open your browser**
http://localhost:5173

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | — | Google Gemini API key from aistudio.google.com |
| `PORT` | Optional | `3001` | Express backend server port |

> Never commit `.env.local` or `firebase-applet-config.json` to version control. Both are already in `.gitignore`.

---

## 🔥 Firebase Setup

**Authentication**
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Google** as a provider
3. Add your development domain (`localhost`) to Authorized Domains

**Firestore**
1. Go to Firebase Console → Firestore Database → Create database
2. Start in **test mode** for development, or use these security rules for production:
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /history/{docId} {
allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
}
}
}

---

## 📡 API Reference

### `POST /api/analyze`

Runs a rule-based lookup against the 16-drug clinical knowledge base for the given combination.

**Request Body**
```json
{
  "drugs": ["Warfarin", "Aspirin", "Ibuprofen"]
}
```

**Response**
```json
{
  "interactions": [
    {
      "drugA": "Warfarin",
      "drugB": "Aspirin",
      "severity": "High",
      "description": "Increased bleeding risk due to additive anticoagulant effects.",
      "recommendation": "Avoid combination or monitor INR closely."
    }
  ]
}
```

> The backend returns only `interactions[]` for known pairs. All other output fields — `sideEffects`, `problems`, `alternatives`, `alerts`, `patientContraindications`, `description` — come from the Gemini AI response and are merged at the frontend.

---

### `GET /api/drugs/search?q={query}`

Returns matching drug name suggestions for autocomplete. Searches both top-level database entries and all nested `interactsWith` target names so substances like `Grapefruit Juice`, `Alcohol`, and `Vitamin K` are discoverable.

**Example**
GET /api/drugs/search?q=warfa
→ { "results": ["Warfarin"] }
GET /api/drugs/search?q=grape
→ { "results": ["Grapefruit Juice"] }

---

## 📐 TypeScript Types
```typescript
// types.ts

export enum Severity {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
  NONE = "None"
}

export interface Interaction {
  drugA: string;
  drugB: string;
  severity: Severity;
  description: string;
  recommendation?: string;
}

export interface InteractionResult {
  severity: Severity;
  description: string;
  interactions: Interaction[];
  sideEffects: string[];
  problems: string[];
  alternatives: string[];
  alerts: string[];
  patientContraindications?: {
    elderly: string[];
    pregnant: string[];
    renallyImpaired: string[];
    other?: string[];
  };
}

export interface HistoryEntry {
  id: string;
  uid: string;
  timestamp: number;
  drugs: string[];
  result: InteractionResult;
}
```

---

## 💡 Usage Examples

| Drug Combination | Type | Expected Severity |
|---|---|---|
| Warfarin + Aspirin | Drug + Drug | 🔴 High |
| Sildenafil + Nitrates | Drug + Drug | 🔴 High |
| Simvastatin + Grapefruit Juice | Drug + Food | 🟠 Medium |
| Metformin + Contrast Dye | Drug + Substance | 🟠 Medium |
| Lisinopril + Ibuprofen | Drug + NSAID | 🟠 Medium |
| Warfarin + Vitamin K | Drug + Supplement | 🟠 Medium |
| Aspirin + Omeprazole | Drug + Drug | 🟢 Low |
| Amiodarone + Beta Blocker + Digoxin | Triple Combo | 🔴 High |
| Metformin + Lisinopril + Atorvastatin | Triple Combo | 🟠 Medium |

---

## 📤 Export Features

### PDF Report (`exportReportToPDF`)

Generates a full clinical PDF using **jsPDF** and **jspdf-autotable** entirely in the browser — no server required. The PDF includes the medication list, overall severity (color-coded red/orange/green matching the severity level), clinical summary, an interaction pairs table, and a patient population contraindications table. The file is saved as `drug_report_DrugA_DrugB_DrugC.pdf`.

### CSV History Export (`exportHistoryToCSV`)

Exports the entire history list as a `.csv` file with four columns: Date, Drugs, Severity, and Description. String values are double-quoted and internal quotes are escaped. The file is saved as `drug_interaction_history_YYYY-MM-DD.csv`.

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the full-stack dev server (Vite + Express concurrently) |
| `npm run build` | Build the frontend for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run server` | Start only the Express backend |
| `npm run lint` | Run TypeScript / ESLint checks |
| `npm run type-check` | Run TypeScript compiler without emitting |

---

## ⚕️ Medical Disclaimer

> **⚠️ Important**
>
> Glacier Rx is intended for **educational and informational purposes only.**
>
> - This tool does **NOT** replace professional medical advice, diagnosis, or treatment.
> - Always consult a licensed pharmacist or physician before making any medication decisions.
> - AI-generated information may contain errors or omissions.
> - **Do not use this tool in emergencies** — call your local emergency services.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request with a clear description of your changes

Please follow the existing TypeScript conventions and ensure all changes are type-safe.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

---

## 🙏 Acknowledgements

- [Google DeepMind](https://deepmind.google) — for the Gemini API powering the clinical reasoning engine
- [Firebase](https://firebase.google.com) — for Authentication and Firestore
- [Vite](https://vitejs.dev) — for the fast frontend build tooling
- [Express.js](https://expressjs.com) — for the lightweight Node.js backend
- [Framer Motion](https://www.framer.com/motion/) — for the animation system
- The open-source TypeScript community

---

<p align="center"> Build By Nausheen Ara &nbsp;•&nbsp; Glacier Rx v2.0.0</p>