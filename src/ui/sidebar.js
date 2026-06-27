export function createSidebar() {
  const navItems = [
    { id: 'home',        icon: '▲',  label: 'Home',        active: true  },
    { id: 'movies',      icon: '▶',  label: 'Movies'       },
    { id: 'tvshows',     icon: '■',  label: 'TV Shows'     },
    { id: 'anime',       icon: '●',  label: 'Anime'        },
    { id: 'library',     icon: '◫',  label: 'Library'      },
    { id: 'favorites',   icon: '★',  label: 'Favorites'    },
    { id: 'collections', icon: '◆',  label: 'Collections'  },
    { id: 'settings',    icon: '⎔',  label: 'Settings'     },
  ];

  const sidebar = document.createElement('aside');
  sidebar.className = 'shell-sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-logo">JUST SMILE</div>
      <div class="sidebar-brand-sub">ULTIMATE X</div>
    </div>
    <nav class="sidebar-nav" id="sidebarNav"></nav>
  `;

  const nav = sidebar.querySelector('#sidebarNav');

  navItems.forEach(item => {
    const el = document.createElement('div');
    el.className = 'nav-item' + (item.active ? ' active' : '');
    el.dataset.page = item.id;
    el.innerHTML = `
      <span class="nav-item-icon">${item.icon}</span>
      <span class="nav-item-label">${item.label}</span>
    `;
    el.addEventListener('click', () => {
      nav.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
    });
    nav.appendChild(el);
  });

  return sidebar;
}