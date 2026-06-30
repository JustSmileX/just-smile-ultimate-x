import { createSidebar } from "./src/ui/sidebar.js";
import { createNavbar  } from "./src/ui/navbar.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="screen-container" id="scene">
      <div class="bg-gradients" id="orbLayer">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
        <div class="gradient-orb orb-4"></div>
        <div class="gradient-orb orb-5"></div>
        <div class="gradient-orb orb-6"></div>
        <div class="gradient-orb orb-7"></div>
        <div class="gradient-orb orb-8"></div>
      </div>
      <div class="fog-layer" id="fogLayer"></div>
      <div class="scanlines"></div>
      <div class="light-beam beam-1"></div>
      <div class="light-beam beam-2"></div>
      <canvas id="particleCanvas" class="particle-canvas"></canvas>
      <div class="mouse-bloom" id="mouseBloom"></div>
      <div class="app-shell" id="appShell">
        <main class="shell-content" id="shellContent">
          <div class="scanner-container">
            <div class="glass-panel scanner-panel" id="scannerPanel">
              <div class="panel-reflection"></div>
              <div class="laser-line"></div>
              <div class="panel-corner-tr"></div>
              <div class="panel-corner-bl"></div>
              <div class="scanner-icon">◈</div>
              <h2 class="scanner-title">LOCAL MEDIA SCANNER</h2>
              <p class="scanner-desc">Select a local directory to scan recursively. Discovered video tracks will be loaded into an active memory library session.</p>
              <button class="scanner-btn" id="scanBtn">SCAN FOLDER</button>
              <div class="scanner-status" id="scannerStatus">Status: Idle</div>
              <div class="scanner-stats" id="scannerStats">
                <div class="stat-item">
                  <span class="stat-label">VIDEOS FOUND</span>
                  <span class="stat-value" id="statVideos">—</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">FOLDERS SCANNED</span>
                  <span class="stat-value" id="statFolders">—</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">SCAN TIME</span>
                  <span class="stat-value" id="statTime">—</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  // Mount components
  const shell = document.getElementById("appShell");
  shell.prepend(createNavbar());
  shell.prepend(createSidebar());

  // ─── Local Scanner Engine (Phase 1) ──────────────────────────────────────
  const VIDEO_EXTENSIONS = new Set([
    "mp4", "mkv", "avi", "mov", "webm", "m4v", "ts", "mpg", "mpeg", "flv", "wmv"
  ]);
  let videoFiles = [];   // in-memory only — no IndexedDB, no persistence
  const metadataCache = new Map(); // keyed by file.path → { duration, resolution, width, height, mime, lastModified }
  let currentClosePlayer = null;   // global reference to active player's close/cleanup function
  let swRegistration = null;       // service worker registration handle
  let particlesPaused = false;     // pauses rAF particle loop during playback

  const scanBtn       = document.getElementById("scanBtn");
  const scannerStatus = document.getElementById("scannerStatus");
  const statVideos    = document.getElementById("statVideos");
  const statFolders   = document.getElementById("statFolders");
  const statTime      = document.getElementById("statTime");

  let folderCount = 0;

  async function scanDirectory(dirHandle, relativePath = "") {
    folderCount++;
    for await (const entry of dirHandle.values()) {
      const currentPath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;
      if (entry.kind === "directory") {
        await scanDirectory(entry, currentPath);
      } else if (entry.kind === "file") {
        const ext = entry.name.split(".").pop().toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          const file = await entry.getFile();
          videoFiles.push({
            name:   entry.name,
            path:   currentPath,
            size:   file.size,
            type:   file.type || `video/${ext}`,
            handle: entry
          });
        }
      }
    }
  }

  function printScanResults(elapsedMs) {
    // Sort alphabetically by full virtual path
    videoFiles.sort((a, b) => a.path.localeCompare(b.path));

    console.clear();
    console.log(
      "%c[JUST SMILE ULTIMATE X]%c  Local Scanner — Phase 1",
      "color:#00f0ff;font-weight:900;font-size:1.15rem;",
      "color:#ffffff;font-size:1.05rem;"
    );
    console.log(
      `%c  ${videoFiles.length} video track(s) found | ${folderCount} folder(s) scanned | ${elapsedMs} ms`,
      "color:#00ff88;font-weight:700;"
    );
    console.table(
      videoFiles.map(f => ({
        "File Name":    f.name,
        "Virtual Path": f.path,
        "Size (MB)":    (f.size / (1024 * 1024)).toFixed(2)
      }))
    );
    console.log("%c  Raw in-memory handles:", "color:#bd00ff;font-weight:700;", videoFiles);
  }

  function updateStats(elapsedMs) {
    if (statVideos)  statVideos.textContent  = videoFiles.length;
    if (statFolders) statFolders.textContent = folderCount;
    if (statTime)    statTime.textContent    = `${elapsedMs} ms`;
  }

  // ─── Format bytes → human-readable ──────────────────────────────────────
  function formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
  }

  // ─── Milestone 6 — Native Media Metadata Engine ──────────────────────────

  function formatDuration(secs) {
    if (!isFinite(secs) || isNaN(secs)) return "--";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatResolution(w, h) {
    if (!w || !h) return "Unknown";
    const RESOLUTION_LABELS = new Map([
      ["3840x2160", "2160p (4K)"],
      ["2560x1440", "1440p"],
      ["1920x1080", "1080p"],
      ["1280x720",  "720p"],
      ["854x480",   "480p"],
    ]);
    const key = `${w}x${h}`;
    if (RESOLUTION_LABELS.has(key)) return RESOLUTION_LABELS.get(key);
    return `${w} × ${h}`;  // fallback: e.g. "1920 × 800"
  }

  function updateCardMetadata(filePath, duration, resolution) {
    const card = document.querySelector(
      `.media-card[data-path="${CSS.escape(filePath)}"]`
    );
    if (!card) return;
    const dEl = card.querySelector(".meta-duration");
    const rEl = card.querySelector(".meta-resolution");
    if (dEl) dEl.textContent = `Duration: ${duration}`;
    if (rEl) rEl.textContent = `Resolution: ${resolution}`;
  }

  function extractVideoMetadata(file) {
    return new Promise(async (resolve, reject) => {
      let objectUrl = null;
      let video     = null;
      let timer     = null;

      const cleanup = () => {
        if (timer)     { clearTimeout(timer); timer = null; }
        if (video)     {
          video.onloadedmetadata = null;
          video.onerror          = null;
          video.src              = "";
          video = null;
        }
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      };

      try {
        const rawFile = await file.handle.getFile();
        objectUrl     = URL.createObjectURL(rawFile);
        video         = document.createElement("video");
        video.preload    = "metadata";
        video.muted      = true;
        video.playsInline = true;

        // ── 10-second timeout guard ───────────────────────────────────────
        timer = setTimeout(() => {
          cleanup();
          reject(new Error("Metadata timeout (10 s)"));
        }, 10_000);

        video.onloadedmetadata = () => {
          const width        = video.videoWidth;
          const height       = video.videoHeight;
          const duration     = formatDuration(video.duration);
          const resolution   = formatResolution(width, height);
          const mime         = rawFile.type;
          const lastModified = rawFile.lastModified;
          cleanup();
          resolve({ duration, resolution, width, height, mime, lastModified });
        };

        video.onerror = () => {
          cleanup();
          reject(new Error("Video metadata load error"));
        };

        video.src = objectUrl;

      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  // ─── Premium Video Player (Milestone 7) ──────────────────────────────────
  async function openPlayer(file, triggerBtn) {
    if (typeof currentClosePlayer === "function") {
      currentClosePlayer();
    }

    const scene = document.getElementById("scene") || document.body;

    // ─── Pause background GPU effects during video playback ──────
    const pauseStyle = document.createElement('style');
    pauseStyle.id = 'jsux-pause-fx';
    pauseStyle.textContent = `
      .jsux-player-active .gradient-orb { filter: blur(0) !important; }
      .jsux-player-active .glass-panel, .jsux-player-active .media-card,
      .jsux-player-active .shell-sidebar, .jsux-player-active .shell-topnav {
        backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
      }
      .jsux-player-active #mouseBloom { display: none !important; }
      .jsux-player-active .gradient-orb, .jsux-player-active .fog-layer,
      .jsux-player-active .light-beam, .jsux-player-active .logo-main,
      .jsux-player-active .sidebar-brand-logo, .jsux-player-active .topnav-logo-main,
      .jsux-player-active .library-title, .jsux-player-active .glass-panel,
      .jsux-player-active .panel-reflection, .jsux-player-active .laser-line,
      .jsux-player-active .clock-time, .jsux-player-active .scanner-icon {
        animation-play-state: paused !important;
      }`;
    document.head.appendChild(pauseStyle);
    scene.classList.add('jsux-player-active');
    particlesPaused = true;

    const overlay = document.createElement("div");
    overlay.id = "playerOverlay";
    overlay.className = "player-overlay";
    overlay.innerHTML = `
      <div class="player-glass"></div>
      <div class="player-container">
        <button class="player-close-btn" aria-label="Close Player">&#x2715;</button>
        <div class="player-loading">
          <div class="player-spinner"></div>
          <span>Loading Video...</span>
        </div>
        <div class="player-error" style="display: none;">
          <div class="player-error-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none"
                 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 3L22 21H2L12 3Z"
                    stroke="currentColor" stroke-width="1.8"
                    stroke-linejoin="round" fill="none"/>
              <line x1="12" y1="10" x2="12" y2="15"
                    stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round"/>
              <circle cx="12" cy="18.5" r="1"
                      fill="currentColor"/>
            </svg>
          </div>
          <span class="player-error-msg">Failed to load video track.</span>
        </div>
        <video class="player-video" style="display: none;"></video>
      </div>
    `;

    scene.appendChild(overlay);

    const closeBtn  = overlay.querySelector(".player-close-btn");
    const loadingEl = overlay.querySelector(".player-loading");
    const errorEl   = overlay.querySelector(".player-error");
    const video     = overlay.querySelector(".player-video");

    // Replace expensive backdrop-filter with static background
    const glassEl = overlay.querySelector('.player-glass');
    if (glassEl) {
      glassEl.style.backdropFilter = 'none';
    }

    let objectUrl   = null;
    let isCleanedUp = false;
    let diagTimer   = null;
    const diagEvt   = {};

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    const cleanup = (forceRemove = true) => {
      if (isCleanedUp) return;
      if (diagTimer) { clearInterval(diagTimer); diagTimer = null; }
      if (video) {
        Object.keys(diagEvt).forEach((k) => video.removeEventListener(k, diagEvt[k]));
        try {
          video.pause();
          video.currentTime = 0;
        } catch (e) {
          console.warn("Video cleanup pause failed:", e);
        }
        video.src = "";
      }
      if (forceRemove) {
        isCleanedUp = true;
        overlay.remove();
        document.body.style.overflow = ""; // Restore body scroll
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("pagehide", handleUnload);
        if (currentClosePlayer === cleanup) currentClosePlayer = null;
        if (triggerBtn) triggerBtn.focus();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      }

      // Restore background animations
      {
        const ps = document.getElementById('jsux-pause-fx');
        if (ps) ps.remove();
        scene.classList.remove('jsux-player-active');
      }
      particlesPaused = false;
      if (glassEl) glassEl.style.backdropFilter = '';
    };

    currentClosePlayer = cleanup;

    const handleKeyDown = (e) => { if (e.key === "Escape") cleanup(); };
    const handleUnload  = () => cleanup();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pagehide", handleUnload);

    closeBtn.addEventListener("click", () => cleanup(true));
    overlay.querySelector(".player-glass").addEventListener("click", () => cleanup(true));

    closeBtn.focus();

    try {
      const rawFile = await file.handle.getFile();
      objectUrl     = URL.createObjectURL(rawFile);

      video.preload  = "metadata";
      video.controls = true;
      video.src      = objectUrl;

      // ─── Diagnostics: event logging ──────────────────────────────
      const diagLog = (type) => (e) => {
        if (isCleanedUp) return;
        console.log(`[DIAG] ${type}`,
          `t=${video.currentTime.toFixed(2)}s`,
          `rs=${video.readyState}`,
          `ns=${video.networkState}`);
      };
      ['play','pause','waiting','stalled','suspend','progress','timeupdate',
       'seeking','seeked','ended','error'].forEach((ev) => {
        diagEvt[ev] = diagLog(ev);
        video.addEventListener(ev, diagEvt[ev]);
      });
      diagTimer = setInterval(() => {
        if (isCleanedUp) { clearInterval(diagTimer); return; }
        const ranges = [];
        for (let i = 0; i < video.buffered.length; i++) {
          ranges.push(
            `[${video.buffered.start(i).toFixed(2)}–${video.buffered.end(i).toFixed(2)}]`);
        }
        console.log(`[DIAG] state`,
          `t=${video.currentTime.toFixed(2)}s`,
          `rs=${video.readyState}`,
          `ns=${video.networkState}`,
          `buf=${ranges.join(',') || '∅'}`,
          `paused=${video.paused}`,
          `ended=${video.ended}`);
      }, 1000);

      video.oncanplay = () => {
        if (isCleanedUp) return;
        loadingEl.style.display = "none";
        video.style.display     = "block";
        video.play().catch(err => {
          console.warn("Video autoplay failed:", err);
        });
      };

      video.onerror = () => {
        if (isCleanedUp) return;
        loadingEl.style.display = "none";
        errorEl.style.display   = "flex";
        cleanup(false);
      };
    } catch (err) {
      if (isCleanedUp) return;
      loadingEl.style.display = "none";
      errorEl.style.display   = "flex";
      cleanup(false);
    }
  }

    // ─── Render library grid ──────────────────────────────────────────────────
  function renderLibraryGrid() {
    const content = document.getElementById("shellContent");
    if (!content) return;

    // Sort alphabetically by filename before rendering
    videoFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

    content.innerHTML = `
      <div class="library-header">
        <h2 class="library-title">LOCAL LIBRARY</h2>
        <span class="library-count">${videoFiles.length} TITLES</span>
        <button class="library-rescan-btn" id="rescanBtn">◈ RESCAN</button>
      </div>
      <div class="library-grid" id="libraryGrid"></div>
    `;

    const grid = document.getElementById("libraryGrid");

    videoFiles.forEach((file, index) => {
      const ext  = file.name.split(".").pop().toUpperCase();
      const name = file.name.replace(/\.[^/.]+$/, "");
      const size = formatSize(file.size);

      const card = document.createElement("div");
      card.className = "media-card";
      card.setAttribute("data-path", file.path);
      card.style.animationDelay = `${index * 0.04}s`;
      card.innerHTML = `
        <div class="media-card-poster">
          <div class="poster-placeholder">
            <div class="poster-icon">
              <svg class="poster-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <rect x="2"  y="8"  width="44" height="32" rx="3" ry="3"
                      fill="none" stroke="currentColor" stroke-width="2"/>
                <rect x="2"  y="13" width="6"  height="6"
                      fill="currentColor" opacity="0.7"/>
                <rect x="2"  y="29" width="6"  height="6"
                      fill="currentColor" opacity="0.7"/>
                <rect x="40" y="13" width="6"  height="6"
                      fill="currentColor" opacity="0.7"/>
                <rect x="40" y="29" width="6"  height="6"
                      fill="currentColor" opacity="0.7"/>
                <line x1="10" y1="8"  x2="10" y2="40"
                      stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
                <line x1="38" y1="8"  x2="38" y2="40"
                      stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
              </svg>
            </div>
            <div class="poster-ext">${ext}</div>
          </div>
          <button class="card-play-btn" title="Play (coming soon)">▶</button>
        </div>
        <div class="media-card-info">
          <div class="media-card-name" title="${file.name}">${name}</div>
          <div class="media-card-meta">
            <span class="meta-ext">${ext}</span>
            <span class="meta-size">${size}</span>
            <span class="meta-duration">Duration: Loading...</span>
            <span class="meta-resolution">Resolution: Loading...</span>
          </div>
        </div>
      `;

      const playBtn = card.querySelector(".card-play-btn");
      if (playBtn) {
        playBtn.title = "Play Video";
        playBtn.addEventListener("click", () => openPlayer(file, playBtn));
      }
      grid.appendChild(card);
    });

    // ─── Queue-based metadata loader (4 concurrent workers) ──────────────
    const queue = [...videoFiles];
    let qi = 0;

    async function worker() {
      while (qi < queue.length) {
        const file = queue[qi++];
        try {
          let meta;
          if (metadataCache.has(file.path)) {
            meta = metadataCache.get(file.path);         // cache hit — skip extraction
          } else {
            meta = await extractVideoMetadata(file);
            metadataCache.set(file.path, meta);          // store for future RESCAN
          }
          updateCardMetadata(file.path, meta.duration, meta.resolution);
        } catch (err) {
          // Timeout, decode error, or handle failure — show graceful fallback.
          // The while-loop continues: remaining files are never blocked.
          console.warn("[Metadata] Skipped:", file.path, err.message);
          updateCardMetadata(file.path, "--", "Unknown");
        }
      }
    }

    // Spawn exactly min(4, total) workers — no Promise.allSettled on the library
    for (let i = 0; i < Math.min(4, queue.length); i++) worker();

    // Rescan button wires back to the scanner
    const rescanBtn = document.getElementById("rescanBtn");
    if (rescanBtn) {
      rescanBtn.addEventListener("click", () => {
        content.innerHTML = `
          <div class="scanner-container">
            <div class="glass-panel scanner-panel" id="scannerPanel">
              <div class="panel-reflection"></div>
              <div class="laser-line"></div>
              <div class="panel-corner-tr"></div>
              <div class="panel-corner-bl"></div>
              <div class="scanner-icon">◈</div>
              <h2 class="scanner-title">LOCAL MEDIA SCANNER</h2>
              <p class="scanner-desc">Select a local directory to scan recursively. Discovered video tracks will be loaded into an active memory library session.</p>
              <button class="scanner-btn" id="scanBtn">SCAN FOLDER</button>
              <div class="scanner-status" id="scannerStatus">Status: Idle</div>
              <div class="scanner-stats" id="scannerStats">
                <div class="stat-item">
                  <span class="stat-label">VIDEOS FOUND</span>
                  <span class="stat-value" id="statVideos">—</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">FOLDERS SCANNED</span>
                  <span class="stat-value" id="statFolders">—</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">SCAN TIME</span>
                  <span class="stat-value" id="statTime">—</span>
                </div>
              </div>
            </div>
          </div>
        `;
        bindScanner();
      });
    }
  }

  function bindScanner() {
    const scanBtn       = document.getElementById("scanBtn");
    const scannerStatus = document.getElementById("scannerStatus");
    const statVideos    = document.getElementById("statVideos");
    const statFolders   = document.getElementById("statFolders");
    const statTime      = document.getElementById("statTime");

    if (!scanBtn) return;
    scanBtn.addEventListener("click", async () => {
      if (typeof window.showDirectoryPicker !== "function") {
        scannerStatus.textContent =
          "Error: File System Access API not supported. Use Chrome, Edge, or Opera.";
        return;
      }

      try {
        const dirHandle = await window.showDirectoryPicker();

        scanBtn.disabled      = true;
        scanBtn.style.opacity = "0.5";
        scanBtn.style.cursor  = "not-allowed";
        scannerStatus.className   = "scanner-status scanning";
        scannerStatus.textContent = "Status: Scanning…";
        if (statVideos)  statVideos.textContent  = "—";
        if (statFolders) statFolders.textContent = "—";
        if (statTime)    statTime.textContent    = "—";

        videoFiles  = [];
        folderCount = 0;

        const t0 = performance.now();
        await scanDirectory(dirHandle);
        const elapsedMs = Math.round(performance.now() - t0);

        printScanResults(elapsedMs);
        updateStats(elapsedMs);

        scannerStatus.className   = "scanner-status success";
        scannerStatus.textContent =
          `Success: ${videoFiles.length} video track(s) found. ` +
          `Check the developer console for details.`;

        // ── Transition to library grid ─────────────────────────────────────
        setTimeout(() => renderLibraryGrid(), 900);

      } catch (err) {
        if (err.name === "AbortError") {
          scannerStatus.className   = "scanner-status";
          scannerStatus.textContent = "Status: Scan cancelled.";
        } else {
          console.error("[Scanner] Unexpected error:", err);
          scannerStatus.className   = "scanner-status";
          scannerStatus.textContent = `Error: ${err.message}`;
        }
      } finally {
        scanBtn.disabled      = false;
        scanBtn.style.opacity = "";
        scanBtn.style.cursor  = "";
      }
    });
  }

  // Initial bind on page load
  bindScanner();

  // ─── Service Worker Registration (Milestone 1) ──────────────────────
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return console.warn('[SW] Not supported');
    }
    try {
      swRegistration = await navigator.serviceWorker.register('./sw.js');
      console.log('[SW] Registered:', swRegistration.scope);
      await navigator.serviceWorker.ready;
      console.log('[SW] Ready:', navigator.serviceWorker.controller);
    } catch (err) {
      console.error('[SW] Registration failed:', err);
    }
  }
  registerServiceWorker();

  const canvas = document.getElementById("particleCanvas");
  const bloom = document.getElementById("mouseBloom");
  const orbLayer = document.getElementById("orbLayer");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width, height, particles;

  const mouse = { x: 0, y: 0, lx: 0, ly: 0 };
  const parallax = { x: 0, y: 0 };

  function calcParticleCount() {
    return Math.min(Math.floor((width * height) / 18000), 120);
  }

  function buildParticles() {
    particles = [];
    const count = calcParticleCount();
    for (let i = 0; i < count; i++) particles.push(new Particle(true));
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    buildParticles();
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (bloom) {
      bloom.style.left = mouse.x + "px";
      bloom.style.top = mouse.y + "px";
    }
  });

  class Particle {
    constructor(initOnScreen) {
      this.reset(initOnScreen);
    }
    reset(initOnScreen) {
      this.x = Math.random() * width;
      this.y = initOnScreen ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedY = -(Math.random() * 0.45 + 0.15);
      this.speedX = Math.random() * 0.3 - 0.15;
      this.alpha = Math.random() * 0.55 + 0.1;
      this.baseAlpha = this.alpha;
      this.colorType = Math.random() > 0.5 ? "blue" : "purple";
      this.oSpeed = Math.random() * 0.018 + 0.004;
      this.oDist = Math.random() * 1.2 + 0.3;
      this.angle = Math.random() * Math.PI * 2;
      this.twinkle = Math.random() * Math.PI * 2;
      this.twinkleSpeed = Math.random() * 0.03 + 0.01;
    }
    update() {
      this.y += this.speedY;
      this.angle += this.oSpeed;
      this.twinkle += this.twinkleSpeed;
      this.x += this.speedX + Math.sin(this.angle) * this.oDist * 0.08;
      this.alpha = this.baseAlpha * (0.7 + 0.3 * Math.sin(this.twinkle));
      if (this.y < -10 || this.x < -10 || this.x > width + 10) this.reset(false);
    }
    draw() {
      const color = this.colorType === "blue" ? "#00f0ff" : "#bd00ff";
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = this.size * 5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function updateParallax() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const tx = (mouse.x - cx) / cx;
    const ty = (mouse.y - cy) / cy;
    parallax.x = lerp(parallax.x, tx, 0.04);
    parallax.y = lerp(parallax.y, ty, 0.04);

    if (orbLayer) {
      orbLayer.style.transform =
        `translate(${parallax.x * -22}px, ${parallax.y * -22}px)`;
    }
  }

  function animate() {
    if (!particlesPaused) {
      ctx.clearRect(0, 0, width, height);
      updateParallax();
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
    }
    requestAnimationFrame(animate);
  }

  resize();
  animate();
});
