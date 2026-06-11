# LuminaRead 🎙️📖✨

**LuminaRead** is a 100% client-side, offline-capable Progressive Web App (PWA) designed to help 6-year-old children learn to read by serving as an interactive, encouraging, and privacy-preserving voice companion on iPads.

By leveraging advanced on-device AI models running directly in the browser via WebGPU/WASM, LuminaRead provides real-time word highlighting, feedback prevention, gamified visual rewards, and acoustic patience features—requiring zero cloud backend and costing nothing to host.

---

## 🌟 Key Features

- **On-Device Whisper Speech Recognition**: Runs `Xenova/whisper-tiny.en` locally using WebGPU acceleration (with a WASM fallback). Audio remains fully private and runs offline.
- **Patience-First Reading Logic**: Smart Levenshtein-distance fuzzy matching ignores repetition struggles (like a child repeating "The... The...") and allows minor speech inaccuracies without blocking progress.
- **Interactive Pronunciation Help**: A child can tap a button to hear the correct pronunciation of the current highlighted word using synthesized text-to-speech. Features built-in **acoustic feedback prevention** (the app pauses mic recording while speaking to prevent self-triggering).
- **Auto-Activating Microphone**: Moving to the next sentence automatically restarts the voice capture so children can read continuously without having to tap a microphone button repeatedly.
- **Dynamic Flower Confetti & Celebrations**: Employs vector-drawn Cherry Blossoms, Daisies, Sunflowers, Roses, and Hibiscuses drawn dynamically in-memory using Canvas 2D API for smooth performance.
- **Progressive Web App (PWA)**: Installable on iPads/tablets, caches large ONNX WASM binaries (up to 30MB limit configurations), and operates 100% offline.
- **Editable Stories**: Load stories dynamically from `/stories.json`, making it easy for teachers and parents to expand the reading selection.

---

## 🏗️ Architecture

```
🎙️ Mic Capture (useAudioRecorder)
  │ (Capture native PCM stream, downsample to 16kHz mono)
  ▼
🤖 Speech Recognition Hook (useSpeechRecognition)
  │ (Accumulate audio, throttle/lock worker every 1.5s)
  ▼
🧵 Web Worker (whisper.worker.ts)
  │ (Execute Xenova/whisper-tiny.en on WebGPU / WASM fallbacks)
  ▼
🎯 UI Word Matcher (ReadingScreen & WordHighlighter)
  │ (Apply Levenshtein fuzzy match and repetitions safe-gate)
  ▼
🎉 Celebration system (confettiHelper & flowerShapes)
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (version specified in `.nvmrc`)
- Modern web browser (Chrome, Edge, or Safari with WebGPU support for local acceleration)

### Installation
1. Clone the repository and navigate to the project root:
   ```bash
   git clone <repo-url>
   cd lumina-read
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Development
Start the local development server:
```bash
npm run dev
```
The application will serve ONNX Runtime WebAssembly and worker scripts locally from `node_modules` during development.

### Production Build
Compile code, copy WASM assets, and build the PWA Service Worker:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📂 Project Structure

- `/src/components`: UI components (`ReadingScreen`, `WordHighlighter`, `StartButton`).
- `/src/hooks`: Custom React hooks for browser integration (`useAudioRecorder`, `useSpeechRecognition`).
- `/src/workers`: Whisper Web Worker setup for offline AI execution.
- `/src/utils`: Helper functions (`fuzzyMatch`, `flowerShapes` and custom canvas confetti logic).
- `/public/stories.json`: List of configurable stories for the application.

---

## 📄 Documentation Reference
For deep technical insights on local WASM serving, workbox service worker configurations, and on-device pipeline optimizations, see the [LuminaRead Developer Guide](GEMINI.md).
