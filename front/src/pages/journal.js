import { getJournals, getCurrentUser, logout } from '../api.js';
import { renderThemeToggle } from '../components/theme-toggle.js';

export function renderJournal(appEl, navigate) {
  const user = getCurrentUser();
  const displayName = user?.name || user?.dev_uid || '朋友';

  appEl.innerHTML = `
    <!-- TopAppBar -->
    <header class="bg-surface/80 sticky top-0 z-50 backdrop-blur-xl">
      <div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div class="text-2xl font-semibold text-primary tracking-wide font-headline">Sanctuary</div>
        <nav class="hidden md:flex gap-8 items-center">
          <a id="nav-chat" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Chat</a>
          <a class="text-primary border-b-2 border-primary font-headline tracking-tight font-light transition-colors duration-300">Journal</a>
          <a id="nav-settings" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Settings</a>
        </nav>
        <div class="flex items-center gap-4">
          <div id="theme-toggle-container"></div>
          <button id="btn-logout" class="text-primary hover:opacity-80 transition-opacity">
            <span class="material-symbols-outlined uppercase">logout</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 pt-12 pb-32">
      <!-- Header Section -->
      <div class="mb-12">
        <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-primary mb-4">我的日誌</h1>
        <p class="text-on-surface-variant max-w-2xl leading-relaxed text-lg">回顧你的情感旅程，發現內心的寧靜與律動。</p>
      </div>

      <!-- Mood Trend Visual (Bento-style Glassmorphism) -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
        <div class="lg:col-span-2 bg-surface-container rounded-xl p-8 relative overflow-hidden">
          <div class="flex justify-between items-end mb-8 relative z-10">
            <div>
              <h3 class="text-sm font-semibold text-primary uppercase tracking-widest mb-1">本週情緒趨勢</h3>
              <p class="text-2xl font-bold text-on-surface">漸趨平穩</p>
            </div>
            <div class="text-right">
              <span class="text-xs text-on-surface-variant">最後更新: 今日</span>
            </div>
          </div>
          <!-- Simple Graphic -->
          <div class="w-full h-48 flex items-end justify-between gap-2 px-2 relative z-10">
            <div class="flex-1 flex flex-col items-center gap-2 group"><div class="w-full bg-primary-container/20 rounded-full h-24 relative overflow-hidden"><div class="absolute bottom-0 w-full bg-primary-container rounded-full h-1/2"></div></div></div>
            <div class="flex-1 flex flex-col items-center gap-2 group"><div class="w-full bg-primary-container/20 rounded-full h-32 relative overflow-hidden"><div class="absolute bottom-0 w-full bg-primary-container rounded-full h-2/3"></div></div></div>
            <div class="flex-1 flex flex-col items-center gap-2 group"><div class="w-full bg-primary-container/20 rounded-full h-40 relative overflow-hidden"><div class="absolute bottom-0 w-full bg-primary-container rounded-full h-3/4"></div></div></div>
            <div class="flex-1 flex flex-col items-center gap-2 group"><div class="w-full bg-primary-container/20 rounded-full h-28 relative overflow-hidden"><div class="absolute bottom-0 w-full bg-primary-container rounded-full h-1/3"></div></div></div>
            <div class="flex-1 flex flex-col items-center gap-2 group"><div class="w-full bg-primary-container/20 rounded-full h-36 relative overflow-hidden"><div class="absolute bottom-0 w-full bg-primary-container rounded-full h-4/5"></div></div></div>
            <div class="flex-1 flex flex-col items-center gap-2 group"><div class="w-full bg-primary-container/20 rounded-full h-44 relative overflow-hidden"><div class="absolute bottom-0 w-full bg-primary-container rounded-full h-5/6"></div></div></div>
            <div class="flex-1 flex flex-col items-center gap-2 group opacity-50"><div class="w-full bg-primary-container/20 rounded-full h-32"></div></div>
          </div>
          <!-- Abstract Grainy Overlay -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </div>

        <!-- Stats Highlight -->
        <div class="bg-secondary-container/50 rounded-xl p-8 flex flex-col justify-between border border-secondary-container/30">
          <div>
            <span class="material-symbols-outlined text-secondary text-4xl mb-4">auto_awesome</span>
            <h3 class="text-xl font-bold text-on-secondary-container mb-2">心情洞察</h3>
            <p id="insight-text" class="text-sm text-on-secondary-container/80 leading-relaxed">
              正在載入您的長期記憶與核心總結...
            </p>
          </div>
          <div class="mt-6">
            <button class="w-full py-4 bg-secondary text-on-secondary rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">查看完整分析報告</button>
          </div>
        </div>
      </section>

      <!-- Journal List -->
      <section id="journal-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- JS Appends cards here -->
      </section>
    </main>

    <!-- BottomNavBar (Mobile) -->
    <nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-4 bg-surface/80 backdrop-blur-xl md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.06)] rounded-t-[3rem]">
      <a id="nav-chat-mobile" class="flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:scale-105 transition-transform duration-400 cursor-pointer">
        <span class="material-symbols-outlined mb-1">chat_bubble</span>
        <span class="font-headline text-xs font-medium">Chat</span>
      </a>
      <a class="flex flex-col items-center justify-center bg-surface-container text-primary rounded-full px-6 py-2 hover:scale-105 transition-transform duration-400">
        <span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 1;">auto_stories</span>
        <span class="font-headline text-xs font-medium">Journal</span>
      </a>
      <a id="nav-settings-mobile" class="flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:scale-105 transition-transform duration-400 cursor-pointer">
        <span class="material-symbols-outlined mb-1">settings</span>
        <span class="font-headline text-xs font-medium">Settings</span>
      </a>
    </nav>
  `;

  renderThemeToggle(appEl.querySelector('#theme-toggle-container'));

  const navChat = appEl.querySelector('#nav-chat');
  const navChatMobile = appEl.querySelector('#nav-chat-mobile');
  const navSettings = appEl.querySelector('#nav-settings');
  const navSettingsMobile = appEl.querySelector('#nav-settings-mobile');
  const logoutBtn = appEl.querySelector('#btn-logout');

  if (navChat) navChat.addEventListener('click', () => navigate('chat'));
  if (navChatMobile) navChatMobile.addEventListener('click', () => navigate('chat'));
  if (navSettings) navSettings.addEventListener('click', () => navigate('settings'));
  if (navSettingsMobile) navSettingsMobile.addEventListener('click', () => navigate('settings'));
  logoutBtn.addEventListener('click', () => {
    logout();
    navigate('login');
  });

  loadJournals(appEl);
}

async function loadJournals(appEl) {
  const container = appEl.querySelector('#journal-list');
  const insightText = appEl.querySelector('#insight-text');
  container.innerHTML = '<div class="col-span-full py-12 text-center text-on-surface-variant">讀取中...</div>';

  try {
    const journals = await getJournals();
    if (!journals || journals.length === 0) {
      container.innerHTML = '<div class="col-span-full py-12 text-center text-on-surface-variant">目前還沒有日誌紀錄。多和治療師持續對話，系統會在背景為您自動總結並產生回顧卡片。</div>';
      insightText.textContent = "多累積一些對話後，這裡將會呈現您的情緒洞察。";
      return;
    }

    container.innerHTML = '';
    
    const allTopics = journals.flatMap(j => j.topics || []);
    const topicCounts = {};
    allTopics.forEach(t => topicCounts[t] = (topicCounts[t] || 0) + 1);
    const sortedTopics = Object.keys(topicCounts).sort((a,b) => topicCounts[b] - topicCounts[a]);
    
    if (sortedTopics.length > 0) {
      insightText.textContent = `從您近期的記錄中，我們發現最常出現的主題是「${sortedTopics.slice(0,2).join('」與「')}」。這裡整理了這些片刻的長期記憶。`;
    } else {
      insightText.textContent = "這是系統為您捕捉的深層回顧記錄。";
    }

    journals.forEach((j, index) => {
      const isFeatured = index === 0;
      const dateStr = new Date(j.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
      
      const themeColor = j.intensity > 7 ? 'error' : (j.intensity < 4 ? 'tertiary' : 'secondary');
      const moodLabel = j.intensity > 7 ? '強烈情緒' : (j.intensity < 4 ? '平靜/內省' : '一般狀態');

      const card = document.createElement('div');
      
      if (isFeatured && j.intensity > 5) {
        card.className = "group bg-primary-container p-8 rounded-xl hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex flex-col justify-between min-h-[320px] md:col-span-2 lg:col-span-1";
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-6">
              <span class="text-sm font-medium text-on-primary-container/70">${dateStr}</span>
              <div class="bg-white/40 px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-primary"></span>
                <span class="text-xs font-semibold text-on-primary-container">${moodLabel}</span>
              </div>
            </div>
            <h4 class="text-2xl font-bold text-on-primary-container mb-4 leading-snug">${escapeHtml(j.content)}</h4>
            <div class="flex flex-wrap gap-2 mb-6">
              ${(j.topics || []).map(t => `<span class="text-xs px-3 py-1 bg-white/30 rounded-full text-on-primary-container">#${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
          <div class="flex items-center text-on-primary-container font-bold text-sm group-hover:gap-3 gap-2 transition-all">
            回顧分析 <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        `;
      } else {
        card.className = "group bg-surface-container-low p-8 rounded-xl hover:bg-surface-container-high transition-all duration-500 cursor-pointer flex flex-col justify-between min-h-[320px]";
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-6">
              <span class="text-sm font-medium text-outline">${dateStr}</span>
              <div class="bg-${themeColor}-container/30 px-3 py-1 rounded-full flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-${themeColor}"></span>
                <span class="text-xs font-semibold text-on-${themeColor}-container">${moodLabel}</span>
              </div>
            </div>
            <h4 class="text-xl font-bold text-on-surface mb-4 leading-snug">${escapeHtml(j.content)}</h4>
            <div class="flex flex-wrap gap-2 mb-6">
              ${(j.topics || []).map(t => `<span class="text-xs px-3 py-1 bg-surface-variant rounded-full text-on-surface-variant">#${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
          <div class="flex items-center text-primary font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
            回顧分析 <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        `;
      }
      container.appendChild(card);
    });
  } catch(e) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-error">載入失敗: ${e.message}</div>`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
