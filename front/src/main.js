/**
 * main.js — Sanctuary SPA Router & Entry Point
 * Hash-based routing: #login, #chat
 */

import './styles/tokens.css';
import { isLoggedIn } from './api.js';
import { initTheme } from './components/theme-toggle.js';
import { renderLogin } from './pages/login.js';
import { renderChat } from './pages/chat.js';
import { renderJournal } from './pages/journal.js';
import { renderSettings } from './pages/settings.js';
import { renderVoice } from './pages/voice.js';

// ── App container ──
const appEl = document.getElementById('app');

/** Navigate to a route */
function navigate(route) {
  window.location.hash = `#${route}`;
}

/** Route handler */
function handleRoute() {
  const hash = window.location.hash.replace('#', '') || '';

  // Auth guard
  if (hash !== 'login' && !isLoggedIn()) {
    navigate('login');
    return;
  }
  if (hash === 'login' && isLoggedIn()) {
    navigate('chat');
    return;
  }

  // Clear app
  appEl.innerHTML = '';
  appEl.style.cssText = 'display:flex;flex-direction:column;min-height:100vh;';

  switch (hash) {
    case 'login':
      renderLogin(appEl, navigate);
      break;
    case 'chat':
      renderChat(appEl, navigate);
      break;
    case 'journal':
      renderJournal(appEl, navigate);
      break;
    case 'settings':
      renderSettings(appEl, navigate);
      break;
    case 'voice':
      renderVoice(appEl, navigate);
      break;
    default:
      navigate(isLoggedIn() ? 'chat' : 'login');
  }
}

// ── Initialize ──
initTheme();
window.addEventListener('hashchange', handleRoute);
handleRoute();
