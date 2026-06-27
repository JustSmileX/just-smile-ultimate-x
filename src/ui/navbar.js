export function createNavbar() {
  const nav = document.createElement('header');
  nav.className = 'shell-topnav';
  nav.innerHTML = `
    <div class="topnav-logo">
      <div class="topnav-logo-main">JUST SMILE ULTIMATE X</div>
      <div class="topnav-logo-sub">Next-Gen Media Center</div>
    </div>
    <div class="topnav-search">
      <span class="topnav-search-icon">⌕</span>
      <input class="topnav-search-input"
             type="text"
             placeholder="Search movies, shows, anime…"
             autocomplete="off"
             spellcheck="false">
    </div>
    <div class="topnav-right">
      <div class="topnav-clock" id="topnavClock">
        <span class="clock-time" id="clockTime">00:00:00</span>
        <span class="clock-date" id="clockDate">---</span>
      </div>
      <div class="topnav-avatar" title="Profile">◇</div>
    </div>
  `;

  // Live digital clock
  function tick() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    const ss  = String(now.getSeconds()).padStart(2, '0');
    const days   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const months = ['JAN','FEB','MAR','APR','MAY','JUN',
                    'JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = `${days[now.getDay()]} ${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]}`;

    const tEl = nav.querySelector('#clockTime');
    const dEl = nav.querySelector('#clockDate');
    if (tEl) tEl.textContent = `${hh}:${mm}:${ss}`;
    if (dEl) dEl.textContent = d;
  }

  tick();
  setInterval(tick, 1000);

  return nav;
}