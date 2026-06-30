# JUST-SMILE-ULTIMATE-X

**The Ultimate Offline AI-Powered Media Center**

A zero-config, vanilla JavaScript media library and player powered by the File System Access API. Browse local directories, scan for video files, and play them back in a premium glass-morphism interface — no server, no database, no build step.

[![Status](https://img.shields.io/badge/status-active%20development-2ea44f?style=flat-square)](#)
[![Browser](https://img.shields.io/badge/browser-Chromium%20%2B%20Edge-blue?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](#)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](#)
[![Size](https://img.shields.io/badge/zero%20dependencies-vanilla%20JS-f1c40f?style=flat-square)](#)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Why JUST SMILE?](#why-just-smile)
- [Features](#features)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Supported Formats](#supported-formats)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Browser Support](#browser-support)
- [Folder Structure](#folder-structure)
- [Documentation](#documentation)
- [Version History](#version-history)
- [Upcoming Features](#upcoming-features)
- [Roadmap](#roadmap)
- [Known Issues](#known-issues)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Project Overview

JUST SMILE ULTIMATE X is a next-generation **offline-first media center** that runs entirely in the browser. It uses the **File System Access API** to scan local directories for video files, extracts metadata (duration, resolution, codec hints) without external tools, and presents everything in a cinematic glass-morphism UI.

Built with **zero dependencies** — no npm, no bundlers, no server-side code. Just HTML, CSS, and vanilla JavaScript (ES Modules). The application is designed for **Chromium-based browsers** (Chrome, Edge, Brave) and is currently in active development.

---

## Why JUST SMILE?

| Problem | Solution |
|---|---|
| Media libraries that phone home | Fully offline — your files never leave your machine |
| Heavy framework overhead | Pure vanilla JS — instant load, no build step |
| External transcoding dependencies | Browser-native decode via `<video>` element |
| Cluttered, heavy UIs | Glass-morphism, dark theme, animated backgrounds |
| Manual metadata tracking | Automatic scan, thumbnail, and resolution extraction |

---

## Features

| Feature | Description |
|---|---|
| **Local Directory Scanner** | Recursively scans any local folder using the File System Access API |
| **Media Library Grid** | Auto-fit responsive grid with staggered entrance animations |
| **Metadata Extraction** | Reads duration, resolution, MIME type, and file size via hidden `<video>` elements; 4-concurrent-worker queue with 10 s timeout |
| **Premium Video Player** | Fullscreen glass overlay with loading spinner, error state, and keyboard dismissal (Escape) |
| **GPU-Aware Playback** | Pauses particle canvas, gradient orbs, and backdrop filters during video playback to prevent compositor contention |
| **Codec Capability Detection** | Probes `canPlayType()` and `MediaCapabilities.decodingInfo()` for H.264, H.265, VP9, AV1, AAC, Opus, FLAC, and more |
| **Live Digital Clock** | Navbar clock updates every second with day/date display |
| **Sidebar Navigation** | 8 sections (Home, Movies, TV Shows, Anime, Library, Favorites, Collections, Settings) with active state |
| **Background Visual Effects** | 8 floating gradient orbs, fog layer, scanlines, light beams, mouse-bloom, and a 2D canvas particle system |
| **Human-Readable Formatting** | File sizes in B/KB/MB/GB/TB; resolution labels (4K, 1440p, 1080p, 720p, 480p) |
| **Responsive Layout** | Grid adapts at 768 px and 480 px breakpoints |

---

## Screenshots

| View | Preview |
|---|---|
| **Home** | *Screenshot coming soon* |
| **Library** | *Screenshot coming soon* |
| **Player** | *Screenshot coming soon* |
| **Settings** | *Screenshot coming soon* |
| **Collections** | *Screenshot coming soon* |

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Language** | JavaScript (ES Modules, no transpilation) |
| **Markup** | HTML5 |
| **Styling** | CSS3 (custom properties, glassmorphism, keyframe animations, CSS grid) |
| **Bundler** | None — zero-config, pure vanilla |
| **File System** | `window.showDirectoryPicker()` (File System Access API) |
| **Graphics** | Canvas 2D (particle system) |
| **Offline** | Service Worker (registered, implementation pending) |
| **Modules** | Native ECMAScript modules (`import` / `export`) |

---

## Architecture Overview

The application follows a modular single-page architecture. Below is a simplified data flow:

```
index.html
   │
   ├── <link> ── src/styles/*.css (theme, layout, components, animations)
   │
   └── <script type="module"> ── app.js
                                    │
                        ┌───────────┼────────────┐
                        │           │            │
                        ▼           ▼            ▼
                   src/ui/      src/core/     src/pages/
                   navbar.js    (stubs)       (stubs)
                   sidebar.js
                                    │
                                    ▼
                              Browser APIs
                        (File System Access,
                         Media Capabilities,
                         Canvas 2D, Service Worker)
```

The main entry point (`index.html`) loads `app.js`, which orchestrates the scanner, metadata extraction, library rendering, player overlay, and media capability detection. UI components (`sidebar.js`, `navbar.js`) are mounted declaratively. Planned page modules (`home.js`, `library.js`, etc.) will handle view-level routing in future phases.

---

## Supported Formats

### Video Extensions

The scanner detects files with the following extensions:

| Extension | Common Codec |
|---|---|
| `.mp4` | H.264 / H.265 / AV1 |
| `.mkv` | Any (container) |
| `.webm` | VP9 / VP8 |
| `.mov` | H.264 / ProRes |
| `.avi` | Any (container) |
| `.m4v` | H.264 |
| `.ts` | MPEG-TS |
| `.mpg` / `.mpeg` | MPEG-1/2 |
| `.flv` | Flash Video |
| `.wmv` | Windows Media |

### Codec Detection

Capability detection covers the following codecs via `canPlayType()` and `MediaCapabilities.decodingInfo()`:

**Video**

| Codec | Detection String |
|---|---|
| H.264 / AVC | `video/mp4; codecs="avc1.42E01E"` |
| H.265 / HEVC | `video/mp4; codecs="hev1.1.6.L120.90"` |
| VP9 | `video/webm; codecs="vp9"` |
| AV1 | `video/mp4; codecs="av01.0.08M.08"` |

**Audio**

| Codec | Detection String |
|---|---|
| AAC | `audio/mp4; codecs="mp4a.40.2"` |
| MP3 | `audio/mpeg` |
| Opus | `audio/ogg; codecs="opus"` |
| Vorbis | `audio/ogg; codecs="vorbis"` |
| FLAC | `audio/flac` |
| AC-3 (Dolby Digital) | `audio/mp4; codecs="ac-3"` |
| E-AC-3 (Dolby Digital Plus) | `audio/mp4; codecs="ec-3"` |
| DTS | `audio/vnd.dts` |
| TrueHD | `audio/truehd` |

---

## Installation

JUST SMILE has **zero dependencies**. No package manager required.

```bash
# Clone the repository
git clone https://github.com/JustSmileX/just-smile-ultimate-x.git

# Navigate into the project
cd just-smile-ultimate-x

# No install step — open in your browser
```

---

## Quick Start

1. **Serve the project locally** (required for the File System Access API):

   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000` in **Chrome, Edge, or another Chromium-based browser**.

3. Click **SCAN FOLDER** and select a directory containing video files.

4. Browse the generated library grid and click any card to open the player.

> **Note:** The File System Access API (`showDirectoryPicker`) is only available in secure contexts (HTTPS or localhost). Opening `index.html` directly via `file://` will not work.

---

## Browser Support

| Browser | Status | Notes |
|---|---|---|
| Google Chrome | &check; Fully supported | Recommended; best File System Access API support |
| Microsoft Edge | &check; Fully supported | Chromium-based, identical API surface |
| Brave | &check; Fully supported | Chromium-based; may require fingerprinting settings |
| Opera | &check; Supported | Chromium-based |
| Mozilla Firefox | &cross; Not supported | Missing `showDirectoryPicker()` |
| Apple Safari | &cross; Not supported | Missing `showDirectoryPicker()` |

---

## Folder Structure

```
├── app.js                        # Main application logic
├── index.html                    # Entry point
├── sw.js                         # Service Worker (stub)
├── manifest.webmanifest          # PWA manifest (placeholder)
│
├── src/
│   ├── styles/
│   │   ├── theme.css             # Design tokens / CSS custom properties
│   │   ├── base.css              # Reset and global styles
│   │   ├── layout.css            # Grid, shell, sidebar, navbar, orbs, fog
│   │   ├── components.css        # Glass panels, scanner, library, player
│   │   └── animations.css        # All @keyframes definitions
│   │
│   ├── ui/
│   │   ├── sidebar.js            # Sidebar navigation component
│   │   └── navbar.js             # Top navigation bar with clock
│   │
│   ├── core/                     # Application framework (stubs)
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── events.js
│   │   └── router.js
│   │
│   ├── pages/                    # Page modules (stubs)
│   │   ├── home.js
│   │   ├── library.js
│   │   ├── player.js
│   │   ├── collections.js
│   │   └── settings.js
│   │
│   ├── animations/               # Animation modules (planned)
│   ├── components/               # Reusable components (planned)
│   ├── database/                 # IndexedDB persistence (planned)
│   ├── effects/                  # Visual effect modules (planned)
│   ├── player/                   # Player engine (planned)
│   ├── scanner/                  # Scanner engine (planned)
│   └── utils/                    # Utility helpers (planned)
│
├── assets/                       # Static assets (fonts, icons, images, etc.)
├── docs/                         # Project documentation (in progress)
└── tests/                        # Test suite (planned)
```

---

## Documentation

In-progress documentation is available in the `docs/` directory:

| Document | Status |
|---|---|
| `ARCHITECTURE.md` | Planned |
| `CHANGELOG.md` | Planned |
| `CODE_STYLE.md` | Planned |
| `CONTRIBUTING.md` | Planned |
| `DECISIONS.md` | Planned |
| `DEVELOPMENT.md` | Planned |
| `FAQ.md` | Planned |
| `LICENSE-NOTES.md` | Planned |
| `ROADMAP.md` | Planned |
| `TESTING.md` | Planned |

---

## Version History

| Version | Date | Highlights |
|---|---|---|
| v1.0.0 | Planned | Full release — codec-aware filtering, favorites, PWA |
| v0.9.1-player-fixed | 2026-Q2 | GPU freeze fixed, production cleanup, stable playback |
| v0.9.0-player-stable | 2026-Q2 | Stable player milestone, feature-flag removal |
| v0.8.0 | 2026-Q2 | Media capability detection (Phase 1), feature-flag system |
| v0.7.0 | 2026-Q1 | Premium video player overlay, GPU-aware effect pausing |
| v0.6.0 | 2026-Q1 | Local directory scanner + metadata extraction queue |
| v0.5.0 | 2026-Q1 | Initial project scaffold, sidebar, navbar, background effects |

---

## Upcoming Features

- **Codec-Aware Format Filtering** — Filter library by detected codec support
- **Favorites & Collections** — Curated watchlists with local persistence
- **Watch History** — Resume playback from last position
- **PWA & Service Worker Streaming** — Offline-capable progressive streaming for large files
- **Keyboard Shortcuts** — Full keyboard navigation for the player and library
- **Multi-language Support** — i18n for the entire UI
- **Cross-browser Compatibility** — Explore fallback paths for Firefox and Safari

---

## Roadmap

- **Phase 1** &check; Local scanner + metadata extraction
- **Phase 2** &check; Premium video player + GPU optimization
- **Phase 3** &check; Media capability detection
- **Phase 4** &square; Codec-aware playlist and format filtering
- **Phase 5** &square; Favorites, collections, and watch history
- **Phase 6** &square; Full PWA with service-worker streaming
- **Phase 7** &square; Test suite and cross-browser compatibility

---

## Known Issues

- **MKV with E-AC3, DTS, or TrueHD audio may play without sound.** These audio codecs are not natively supported by Chromium-based browsers. The video track plays normally, but the audio track is silent. A future phase may handle this via codec-aware stream selection or transcoding fallback guidance.
- **File System Access API is Chromium-only.** Firefox and Safari do not implement `showDirectoryPicker()`. Cross-browser support is on the roadmap.
- **Large libraries (>10,000 files)** may experience UI lag during scan and render. Virtual scrolling is planned for a future optimization phase.

---

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Commit your changes with a clear message.
4. Open a pull request against `main`.

This project uses **no build tools** — keep your changes vanilla. Match the existing code style (no semicolons where the project omits them, consistent quotes, etc.).

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Author

**Author:** Santosh Ahir
**GitHub:** [https://github.com/JustSmileX](https://github.com/JustSmileX)

---

*Built with &hearts; using vanilla JavaScript, CSS, and the open web.*
