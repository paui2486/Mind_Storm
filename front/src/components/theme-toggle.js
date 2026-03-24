/**
 * theme-toggle.js — Warm/Cool Theme Toggle Component
 * Persists choice in localStorage.
 */

const STORAGE_KEY = 'sanctuary_theme';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'warm';
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Initialize theme from stored preference */
export function initTheme() {
  setTheme(getTheme());
}

/**
 * Renders the theme toggle pill into a container element.
 * @param {HTMLElement} container
 */
export function renderThemeToggle(container) {
  const current = getTheme();

  container.innerHTML = `
    <div class="theme-toggle" style="
      display: inline-flex;
      align-items: center;
      background: var(--surface-container);
      border-radius: 9999px;
      padding: 4px;
      gap: 2px;
    ">
      <button id="theme-warm" aria-label="暖色調" style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px; height: 36px;
        border-radius: 9999px;
        border: none;
        cursor: pointer;
        background: ${current === 'warm' ? 'var(--primary)' : 'transparent'};
        color: ${current === 'warm' ? 'var(--on-primary)' : 'var(--on-surface-variant)'};
        transition: all 0.3s ease;
      ">
        <span class="material-symbols-outlined" style="font-size: 18px;">light_mode</span>
      </button>
      <button id="theme-cool" aria-label="冷色調" style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px; height: 36px;
        border-radius: 9999px;
        border: none;
        cursor: pointer;
        background: ${current === 'cool' ? 'var(--primary)' : 'transparent'};
        color: ${current === 'cool' ? 'var(--on-primary)' : 'var(--on-surface-variant)'};
        transition: all 0.3s ease;
      ">
        <span class="material-symbols-outlined" style="font-size: 18px;">dark_mode</span>
      </button>
    </div>
  `;

  container.querySelector('#theme-warm').addEventListener('click', () => {
    setTheme('warm');
    renderThemeToggle(container); // re-render to update active state
  });
  container.querySelector('#theme-cool').addEventListener('click', () => {
    setTheme('cool');
    renderThemeToggle(container);
  });
}
