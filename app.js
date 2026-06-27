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
      <div class="ui-foreground">
        <div class="glass-panel" id="glassPanel">
          <div class="panel-reflection"></div>
          <div class="laser-line"></div>
          <div class="panel-corner-tr"></div>
          <div class="panel-corner-bl"></div>
          <div class="logo-container">
            <h1 class="logo-main">
              <span class="logo-word">JUST</span>
              <span class="logo-word">SMILE</span>
            </h1>
            <div class="logo-sub-text">ULTIMATE X</div>
          </div>
          <div class="panel-divider"></div>
          <p class="subtitle">The Future of Offline Entertainment</p>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("particleCanvas");
  const panel = document.getElementById("glassPanel");
  const bloom = document.getElementById("mouseBloom");
  const orbLayer = document.getElementById("orbLayer");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width, height, particles;

  const mouse = { x: 0, y: 0, lx: 0, ly: 0 };
  const parallax = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };

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
    tilt.x = lerp(tilt.x, ty * 8, 0.06);
    tilt.y = lerp(tilt.y, -tx * 8, 0.06);

    if (orbLayer) {
      orbLayer.style.transform =
        `translate(${parallax.x * -22}px, ${parallax.y * -22}px)`;
    }
    if (panel) {
      panel.style.transform =
        `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`;
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
