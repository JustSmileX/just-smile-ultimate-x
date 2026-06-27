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

  if (scanBtn) {
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
  // ─── End Local Scanner Engine ─────────────────────────────────────────────

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
    ctx.clearRect(0, 0, width, height);
    updateParallax();
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }

  resize();
  animate();
});
