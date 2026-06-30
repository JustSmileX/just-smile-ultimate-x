# MKV Audio Support - Technical Design Document

**Project:** JUST-SMILE-ULTIMATE-X
**Author:** Santosh Ahir
**Repository:** [JustSmileX/just-smile-ultimate-x](https://github.com/JustSmileX/just-smile-ultimate-x)
**Branch:** `feature/mkv-audio`
**License:** MIT

---

## 1. Project Goal

Enable JUST-SMILE-ULTIMATE-X to detect, classify, and communicate MKV audio codec support to the user before playback begins. When a user opens an MKV file whose audio track uses a codec the browser cannot decode (E-AC3, DTS, TrueHD), the player must display a clear warning and offer actionable next steps rather than playing silent video.

---

## 2. Current Problem

### 2.1 Why MKV files play without audio

Chromium-based browsers (Chrome, Edge, Brave) ship with a fixed set of audio decoders. The supported set includes **AAC**, **MP3**, **Opus**, **Vorbis**, and **FLAC**. It does **not** include **E-AC-3** (Dolby Digital Plus), **DTS** (Digital Theater Systems), or **TrueHD** (Dolby TrueHD).

When a user opens an MKV container whose audio stream uses one of these unsupported codecs, the `<video>` element:

1. Decodes the video track successfully (typically H.264 or H.265).
2. Encounters an audio packet it cannot decompress.
3. Silently drops the audio track — no error event, no warning, no fallback.
4. Plays the video at normal speed with zero audio output.

The user sees no error, no loading spinner, and no indication anything is wrong. The file appears to play correctly until they notice the absence of sound.

### 2.2 Audio codec landscape

| Codec | Full Name | Container Affinity | Chromium Support |
|---|---|---|---|
| AAC | Advanced Audio Coding | MP4, MKV | Native |
| MP3 | MPEG-1 Audio Layer 3 | MP4, MKV | Native |
| Opus | Opus Interactive Audio | WebM, MKV | Native |
| Vorbis | Vorbis | WebM, MKV | Native |
| FLAC | Free Lossless Audio Codec | FLAC, MKV, Ogg | Native |
| AC-3 | Dolby Digital | MKV, MP4 | Native (limited) |
| E-AC-3 | Dolby Digital Plus | MKV, MP4 | **Not supported** |
| DTS | Digital Theater Systems | MKV | **Not supported** |
| TrueHD | Dolby TrueHD | MKV | **Not supported** |
| PCM | Pulse-Code Modulation | MKV, MP4, AVI | Native (LPCM only) |

**AC-3 caveat:** Chromium can decode AC-3 when the audio is delivered via an MP4 container with the `ac-3` codec string. Many MKV files contain AC-3 tracks mapped to the same codec ID — support varies by operating system and audio hardware. The `canPlayType()` result for AC-3 in MKV is often `"maybe"` rather than `"probably"`.

---

## 3. Browser Limitations

### 3.1 HTML5 `<video>` element

The HTML5 `<video>` element delegates all decoding to the browser's underlying media pipeline. Application code cannot:

- Inspect individual tracks inside a container before playback.
- Choose which audio track to decode.
- Install third-party decoders at runtime.
- Detect silent audio-track failure via events.

The element fires `error` only when the container itself is corrupt or the MIME type is unrecognized. A perfectly valid MKV with an unsupported audio track produces no error event.

### 3.2 `HTMLMediaElement.canPlayType()`

```javascript
const el = document.createElement('video');
el.canPlayType('audio/mp4; codecs="mp4a.40.2"');
// Returns "probably", "maybe", or ""
```

This synchronous API checks whether the browser **might** be able to play a given MIME + codec combination. It is the primary detection mechanism available without loading a media file. Limitations:

- It tests codecs against the **browser's registered decoder list**, not against a specific file.
- It cannot distinguish "supported in MP4 but not in MKV" for the same codec.
- It does not consider audio hardware, OS version, or DRM.

The project's `getMediaCapabilities()` function already wraps this API for 4 video and 9 audio codecs.

### 3.3 `MediaCapabilities.decodingInfo()`

```javascript
const result = await navigator.mediaCapabilities.decodingInfo({
  type: 'file',
  audio: {
    contentType: 'audio/mp4; codecs="ec-3"',
    channels: 6,
    samplerate: 48000
  }
});
// Returns { supported: boolean, smooth: boolean, powerEfficient: boolean }
```

This asynchronous API returns a richer result, including `smooth` and `powerEfficient` flags. It is available in Chromium 86+ and Safari 15+. The project uses it to downgrade `"maybe"` results to `false` when `supported` is explicitly `false`.

---

## 4. Technical Architecture

### 4.1 Current system flow

```
┌────────────────────────────────────────────────────────────────┐
│                     index.html                                  │
│  <link> CSS  <script type="module" src="app.js">               │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│  app.js                                                        │
│                                                                │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Scanner       │  │  getMediaCaps()  │  │  openPlayer() │  │
│  │                │  │                  │  │               │  │
│  │  showDirPicker │  │  canPlayType()   │  │  overlay      │  │
│  │  scanRecursive │  │  decodingInfo()  │  │  glass        │  │
│  │  metadataQueue │  │  cache result    │  │  video element │  │
│  └────────┬───────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                  │                      │          │
│           ▼                  ▼                      ▼          │
│    videoFiles[]         caps object             playback       │
│    metadataCache        (Module scope)          diagnostics    │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Proposed architecture with codec-aware warning

```
┌────────────────────────────────────────────────────────────────────┐
│                        app.js                                       │
│                                                                     │
│  ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │  Scanner       │   │  getMediaCaps()  │   │  MKV Audio Check │  │
│  │                │   │                  │   │                  │  │
│  │  showDirPicker │   │  4 video codecs  │   │  read audio codec │  │
│  │  scanRecursive │   │  9 audio codecs  │   │  from file        │  │
│  │  metadataQueue │   │  cached result   │   │  if MKV:          │  │
│  └────────┬───────┘   └────────┬─────────┘   │  match vs caps   │  │
│           │                   │              │  emit warning     │  │
│           ▼                   ▼              └────────┬─────────┘  │
│    videoFiles[]          caps object                  │            │
│    metadataCache         (Module scope)               │            │
│                                                       ▼            │
│                                              ┌──────────────────┐  │
│                                              │  Player Overlay  │  │
│                                              │                  │  │
│                                              │  if warning:     │  │
│                                              │  show banner     │  │
│                                              │  user dismisses  │  │
│                                              │  or cancels      │  │
│                                              └──────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 4.3 Future decoder pipeline (Phase 4+)

```
┌────────────┐    ┌────────────────┐    ┌──────────────────┐
│  User      │    │  Browser       │    │  FFmpeg WASM     │
│  selects   ├───►│  <video>       ├───►│  (fallback)      │
│  MKV file  │    │  starts decode │    │                  │
└────────────┘    └───────┬────────┘    │  audio decode    │
                          │             │  PCM output      │
                          ▼             │  AudioWorklet    │
                   ┌──────────────┐     └──────────────────┘
                   │  Success?    │
                   │  ┌───┐ ┌───┐│
                   │  │Yes│ │No ││
                   │  └───┘ └─┬─┘│
                   └──────────┼──┘
                              ▼
                     ┌──────────────────┐
                     │  FFmpeg WASM     │
                     │  decode audio    │
                     │  + render via    │
                     │  AudioWorklet    │
                     └──────────────────┘
```

---

## 5. Development Phases

### Phase 1 — Browser Capability Detection

**Status:** Complete

- Implemented `getMediaCapabilities()` in `app.js`.
- 4 video codecs (H.264, H.265, VP9, AV1) and 9 audio codecs (AAC, MP3, Opus, Vorbis, FLAC, AC-3, E-AC-3, DTS, TrueHD) are probed via `canPlayType()`.
- Results are refined with `MediaCapabilities.decodingInfo()` where available.
- Result object is cached for the page lifetime.
- Values are strings (`"probably"`, `"maybe"`, `""`) with `false` where MediaCapabilities confirms unsupported.

### Phase 2 — MKV Metadata Detection

- When the user opens an MKV file, read the container's audio codec before starting playback.
- Approach: fetch the first ~4 KB of the file via `Blob.slice()` or `File.slice()`, parse the Matroska Element IDs to extract the audio codec ID (`A_AAC`, `A_AC3`, `A_EAC3`, `A_DTS`, `A_TRUEHD`, etc.).
- Match the detected codec ID against `getMediaCapabilities().audio` to determine whether the browser can decode it.
- Store a `warnings` field on the metadata cache entry.
- No UI changes in this phase.

### Phase 3 — Codec-Aware UI

- Add a warning banner to the player overlay shown before/during playback when an unsupported audio codec is detected.
- Banner copy: *"This file contains [codec name] audio, which your browser does not support. Playback may be silent."*
- Options: "Play Anyway" and "Cancel".
- Style: amber/yellow glass banner, non-blocking, dismissible.
- Extend the library grid card to show a small badge for files with known audio codec issues.

### Phase 4 — Optional FFmpeg WASM (Investigation)

- Evaluate [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for client-side audio decoding.
- Scope: decode audio only, not video.
- Feed decoded PCM samples to an `AudioWorklet` node.
- Constraints: 30 MB+ WASM binary, no multithreading in cross-origin isolation, significant CPU overhead per decode.
- Decision gate: if performance benchmarks show >15% battery drain per hour of playback, mark as optional opt-in.

### Phase 5 — Advanced Playback Engine

- Build a track-aware player that can switch between browser-native decode and WASM decode per audio track.
- Support track selection UI when multiple audio tracks exist in the MKV.
- Expose audio codec info in the player info panel.

---

## 6. Supported Audio Codecs

| Codec | Browser Support | MKV Support | Hardware Decode | License | Quality | Notes |
|---|---|---|---|---|---|---|
| **AAC** | Chromium, Firefox, Safari | Yes | Yes (most SoCs) | Patent-encumbered | Good | Primary codec for MP4; universally supported |
| **MP3** | All browsers | Yes | Yes | Patent-expired | Medium | Legacy format; adequate for speech/low-bitrate |
| **Opus** | Chromium, Firefox, Safari 11+ | Yes | Partial | Royalty-free | Excellent | Best quality-per-bit; recommended for WebM |
| **Vorbis** | All browsers | Yes | Partial | Royalty-free | Good | Legacy WebM codec; replaced by Opus |
| **FLAC** | Chromium, Firefox, Safari 11+ | Yes | No | Royalty-free | Lossless | Largest file size; no hardware decode path |
| **AC-3** | Chromium (partial) | Yes | Yes (TVs, soundbars) | Patent-encumbered | Good | `canPlayType()` returns `"maybe"`; no MKV path in Chrome |
| **E-AC-3** | **Not supported** | Yes | Yes (HDMI/eARC) | Patent-encumbered | Very good | No browser decoder; requires WASM fallback |
| **DTS** | **Not supported** | Yes | Yes (AV receivers) | Proprietary | Very good | No browser decoder; requires WASM fallback |
| **TrueHD** | **Not supported** | Yes | Yes (HDMI/eARC) | Proprietary | Lossless | No browser decoder; largest bitrate (~9 Mbps) |
| **PCM** | Partial (LPCM only) | Yes | Yes | None | Lossless | Only uncompressed LPCM in WAV containers is widely supported |

---

## 7. Supported Video Codecs

| Codec | Browser Decode | MKV Common | Hardware Decode | Notes |
|---|---|---|---|---|
| **H.264 / AVC** | Chromium, Firefox, Safari | Always | Yes (universal) | Baseline decode target; lowest CPU cost |
| **H.265 / HEVC** | Chromium (varies by OS), Safari | Frequent | Yes (recent GPUs) | Licensing fragmentation limits browser support |
| **VP9** | Chromium, Firefox | Common | Yes (Chromebooks, Android) | Royalty-free; default for WebM |
| **AV1** | Chromium 70+, Firefox 67+ | Growing | Partial (RTX 30+, ARC) | Royalty-free; high decode CPU cost; best compression |
| **MPEG-2** | Varies | Rare | Yes (legacy) | Not probed by current detection; uncommon in modern files |
| **VC-1** | **Not supported** | Rare | Yes (legacy GPUs) | Not probed; no browser decoder |

---

## 8. Future Roadmap

| Milestone | Target | Deliverable |
|---|---|---|
| Phase 2 completion |Phase 3| MKV audio codec detection integrated into `openPlayer()` |
| Phase 3 completion | | Warning banner in player overlay + library card badge |
| Phase 4 decision | phase 4 | Benchmark report for ffmpeg.wasm audio-only decode |
| Phase 4 implementation | 2027-Q1 | Optional WASM audio decoder behind a feature flag |
| Phase 5 | phase 5| Multi-track audio selector, player info panel |
| Codec database | phase 4| Public codec-support table rendered in-app as `/codecs` view |

---

## 9. Testing Strategy

### Unit tests

- `getMediaCapabilities()` returns correct shape `{ video: { .. }, audio: { .. } }`.
- `canPlayType()` wrapper returns string or boolean as expected.
- `MediaCapabilities` refinement does not throw when API is absent.
- Cached result is returned on subsequent calls.

### Integration tests

- Open an MKV file with AAC audio → no warning shown.
- Open an MKV file with E-AC-3 audio → warning shown, play proceeds on user confirmation.
- Open an MP4 file with AC-3 audio → `canPlayType()` result checked, logic follows.
- Rapid open/close of player does not leak warning state.

### Manual tests

- Chrome (Windows, macOS, Linux) — all codec combinations.
- Edge (Windows) — identical Chromium behaviour.
- Brave (with fingerprinting protection) — no false positives from `canPlayType()` restrictions.
- Large 50 GB+ MKV with TrueHD 7.1 — first 4 KB read does not cause memory spike.
- Mixed audio tracks (one supported, one unsupported) — only the problematic track triggers a warning.

### Non-goals (out of scope for this feature)

- Transcoding audio server-side.
- Extracting or downloading audio separately.
- Supporting Firefox or Safari for MKV playback (both lack `showDirectoryPicker()`).

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| MKV element parsing requires >4 KB header | Increased I/O per file, slower library load | Cap read at 16 KB; log and skip unparseable files |
| `canPlayType()` returns `"maybe"` for AC-3 but actual MKV playback fails | False positive (warning not shown, audio silent) | Treat `"maybe"` as trustworthy for decision; Phase 4 WASM can override |
| FFmpeg WASM binary size (30+ MB) | Slow page load, high memory | Lazy-load on first unsupported-codec playback; cached after first fetch |
| AudioWorklet latency | Lip-sync drift | Use `AudioContext` with `latencyHint: 'playback'`; measure and report drift |
| Cross-origin isolation required for `SharedArrayBuffer` (WASM threading) | Single-threaded decode only, higher CPU | Accept single-threaded for audio-only; acceptable for <8ch at 48 kHz |

---

## 11. References

| Resource | URL |
|---|---|
| Matroska Codec IDs | https://www.matroska.org/technical/codec-specs.html |
| HTMLMediaElement.canPlayType() | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canPlayType |
| MediaCapabilities.decodingInfo() | https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo |
| Chromium audio codec support matrix | https://chromium.googlesource.com/chromium/src/+/main/media/base/supported_types.cc |
| ffmpeg.wasm | https://github.com/ffmpegwasm/ffmpeg.wasm |
| AudioWorklet specification | https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet |
| MKV element parsing in JavaScript | https://github.com/JustSmileX/just-smile-ultimate-x/issues (planned) |

---

## 12. Conclusion

JUST-SMILE-ULTIMATE-X already has the codec detection infrastructure from Phase 1. Extending it to read MKV audio codec IDs from the file header closes a critical UX gap: silent playback with no user feedback. The phased approach ensures each increment is independently testable and deployable.

The WASM decoder path (Phase 4) is deferred to a decision gate because of the binary size and performance trade-offs. If benchmarks show acceptable battery impact, it becomes an optional enhancement — the core feature (detection + warning) does not depend on it.
