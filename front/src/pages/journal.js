import { getJournals, getCurrentUser, logout } from '../api.js';
import { renderThemeToggle } from '../components/theme-toggle.js';

export function renderJournal(appEl, navigate) {
  const user = getCurrentUser();

  appEl.innerHTML = `
    <!-- TopAppBar -->
    <header class="bg-surface/80 sticky top-0 z-50 backdrop-blur-xl border-b border-outline-variant/10">
      <div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div class="text-2xl font-bold text-primary tracking-tight font-headline">Sanctuary</div>
        <nav class="hidden md:flex gap-8 items-center">
          <a id="nav-chat" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Chat</a>
          <a class="text-primary border-b-2 border-primary font-headline tracking-tight font-semibold transition-colors duration-300">Journal</a>
          <a id="nav-settings" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Settings</a>
        </nav>
        <div class="flex items-center gap-4">
          <div id="theme-toggle-container"></div>
          <button id="btn-logout" class="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 pt-12 pb-32">
      <!-- Header Section -->
      <div class="mb-12 animate-fade-in-up">
        <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-primary mb-4">我的日誌</h1>
        <p class="text-on-surface-variant max-w-2xl leading-relaxed text-lg">回顧你的情感旅程，發現內心的寧靜與律動。</p>
      </div>

      <!-- Mood Trend Visual & Insight -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
        <!-- Dynamic Chart Column -->
        <div class="lg:col-span-2 bg-surface-container rounded-3xl p-8 relative overflow-hidden animate-fade-in-up" style="animation-delay: 0.1s">
          <div class="flex justify-between items-end mb-8 relative z-10">
            <div>
              <h3 class="text-xs font-bold text-primary uppercase tracking-widest mb-1">本週情緒趨勢</h3>
              <p id="trend-label" class="text-2xl font-bold text-on-surface">正在分析...</p>
            </div>
            <div class="text-right">
              <span id="last-update" class="text-xs text-on-surface-variant">最後更新: 剛剛</span>
            </div>
          </div>
          
          <!-- Dynamic Bar Chart -->
          <div id="mood-chart" class="w-full h-48 flex items-end justify-between gap-3 px-2 relative z-10">
            <!-- Bars will be injected here -->
          </div>
          
          <!-- Background Decoration -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </div>

        <!-- Insight Column -->
        <div class="bg-secondary-container/30 rounded-3xl p-8 flex flex-col justify-between border border-secondary-container/20 animate-fade-in-up" style="animation-delay: 0.2s">
          <div>
            <span class="material-symbols-outlined text-secondary text-4xl mb-6">auto_awesome</span>
            <h3 class="text-xl font-bold text-on-secondary-container mb-3 tracking-tight">心情洞察</h3>
            <p id="insight-text" class="text-sm text-on-secondary-container/80 leading-relaxed">
              正在從長期記憶中萃取您的情緒模式...
            </p>
          </div>
          <div class="mt-8">
            <button id="btn-show-report" class="w-full py-4 bg-secondary text-on-secondary rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-secondary/10">查看完整分析報告</button>
          </div>
        </div>
      </section>

      <!-- Journal List -->
      <section id="journal-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- JS Appends cards here -->
      </section>
    </main>

    <!-- Modal Container -->
    <div id="modal-root" class="fixed inset-0 z-[100] hidden">
      <div id="modal-backdrop" class="absolute inset-0 bg-surface/80 backdrop-blur-md opacity-0 transition-opacity duration-300"></div>
      <div id="modal-content" class="absolute inset-0 flex items-center justify-center p-6 scale-95 opacity-0 transition-all duration-300 pointer-events-none">
        <!-- Modal UI will be dynamic -->
      </div>
    </div>

    <!-- BottomNavBar (Mobile) -->
    <nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-4 bg-surface/80 backdrop-blur-xl md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.06)] rounded-t-[3rem]">
      <a id="nav-chat-mobile" class="flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:scale-105 transition-transform duration-400 cursor-pointer">
        <span class="material-symbols-outlined mb-1">chat_bubble</span>
        <span class="font-headline text-xs font-medium uppercase tracking-tighter">Chat</span>
      </a>
      <a class="flex flex-col items-center justify-center bg-surface-container text-primary rounded-full px-6 py-2 hover:scale-105 transition-transform duration-400">
        <span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 1;">auto_stories</span>
        <span class="font-headline text-xs font-medium uppercase tracking-tighter">Journal</span>
      </a>
      <a id="nav-settings-mobile" class="flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:scale-105 transition-transform duration-400 cursor-pointer">
        <span class="material-symbols-outlined mb-1">settings</span>
        <span class="font-headline text-xs font-medium uppercase tracking-tighter">Settings</span>
      </a>
    </nav>
  `;

  renderThemeToggle(appEl.querySelector('#theme-toggle-container'));

  // Navigation handlers
  appEl.querySelector('#nav-chat').onclick = () => navigate('chat');
  appEl.querySelector('#nav-chat-mobile').onclick = () => navigate('chat');
  appEl.querySelector('#nav-settings').onclick = () => navigate('settings');
  appEl.querySelector('#nav-settings-mobile').onclick = () => navigate('settings');
  appEl.querySelector('#btn-logout').onclick = () => { logout(); navigate('login'); };

  loadJournals(appEl);
}

async function loadJournals(appEl) {
  const listContainer = appEl.querySelector('#journal-list');
  const moodChart = appEl.querySelector('#mood-chart');
  const insightText = appEl.querySelector('#insight-text');
  const trendLabel = appEl.querySelector('#trend-label');
  const btnShowReport = appEl.querySelector('#btn-show-report');

  try {
    const journals = await getJournals();
    if (!journals || journals.length === 0) {
      listContainer.innerHTML = '<div class="col-span-full py-24 text-center text-on-surface-variant opacity-60">目前暫無日誌記錄。您的對話將在背景轉化為長期記憶與洞察。</div>';
      trendLabel.textContent = "尚無資料";
      moodChart.innerHTML = '<div class="w-full flex justify-center text-xs text-outline italic">對話累積後將顯示趨勢</div>';
      return;
    }

    // --- 1. Mood Chart Dynamics ---
    const recent7 = journals.slice(0, 7).reverse();
    moodChart.innerHTML = recent7.map(j => {
      const height = (j.intensity / 10) * 100;
      const themeColor = j.intensity > 7 ? 'primary' : 'primary-container';
      return `
        <div class="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
          <div class="w-full bg-primary-container/10 rounded-full h-full relative overflow-hidden">
            <div class="absolute bottom-0 w-full bg-${themeColor} rounded-full transition-all duration-1000 ease-out" style="height: ${height}%"></div>
          </div>
          <span class="text-[10px] text-outline font-headline font-bold opacity-0 group-hover:opacity-100 transition-opacity">${new Date(j.created_at).getDate()}日</span>
        </div>
      `;
    }).join('');

    // --- 2. Trend Label Logic ---
    if (recent7.length >= 2) {
      const first = recent7[0].intensity;
      const last = recent7[recent7.length - 1].intensity;
      if (Math.abs(first - last) < 2) trendLabel.textContent = "趨於平穩";
      else if (last > first) trendLabel.textContent = "情緒波動";
      else trendLabel.textContent = "逐漸放鬆";
    }

    // --- 3. Enhanced Insight Text ---
    const allTopics = journals.flatMap(j => j.topics || []);
    const topicCounts = {};
    allTopics.forEach(t => topicCounts[t] = (topicCounts[t] || 0) + 1);
    const sortedTopics = Object.keys(topicCounts).sort((a,b) => topicCounts[b] - topicCounts[a]);
    
    if (sortedTopics.length > 0) {
      const avgIntensity = journals.reduce((acc, current) => acc + current.intensity, 0) / journals.length;
      let moodSuffix = avgIntensity > 7 ? "近期情緒張力較強，請多給自己喘息空間。" : "整體狀態平靜，是一個適合內省的時期。";
      insightText.textContent = `在最近的對話中，「${sortedTopics.slice(0,2).join('」與「')}」是我們探討最多的核心。${moodSuffix}`;
    }

    // --- 4. Journal List Rendering ---
    listContainer.innerHTML = '';
    journals.forEach((j, index) => {
      const dateStr = new Date(j.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const themeColor = j.intensity > 7 ? 'error' : (j.intensity < 4 ? 'tertiary' : 'secondary');
      const moodLabel = j.intensity > 7 ? '強烈情緒' : (j.intensity < 4 ? '平靜/內省' : '一般狀態');
      
      const card = document.createElement('div');
      card.className = "group bg-surface-container-low p-8 rounded-[2rem] hover:bg-surface-container-high transition-all duration-500 cursor-pointer border border-outline-variant/30 flex flex-col justify-between min-h-[300px] animate-fade-in-up";
      card.style.animationDelay = `${0.1 * index}s`;
      
      card.innerHTML = `
        <div>
          <div class="flex justify-between items-center mb-6">
            <span class="text-xs font-bold text-outline-variant tracking-wider">${dateStr}</span>
            <div class="px-3 py-1 rounded-full flex items-center gap-2 border border-${themeColor}/20 bg-${themeColor}-container/10">
              <span class="w-1.5 h-1.5 rounded-full bg-${themeColor} animate-pulse"></span>
              <span class="text-[10px] font-bold text-on-${themeColor}-container uppercase tracking-widest">${moodLabel}</span>
            </div>
          </div>
          <p class="text-lg font-bold text-on-surface mb-6 line-clamp-4 leading-relaxed tracking-tight font-headline">
            ${escapeHtml(j.content)}
          </p>
          <div class="flex flex-wrap gap-2 mb-4">
            ${(j.topics || []).map(t => `<span class="text-[10px] px-2.5 py-1 bg-surface-container-highest rounded-full text-on-surface-variant font-bold border border-outline-variant/10"># ${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        <div class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
          回顧分析 <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </div>
      `;

      card.addEventListener('click', () => openDetailModal(appEl, j));
      listContainer.appendChild(card);
    });

    // --- 5. Analysis Report Modal ---
    btnShowReport.onclick = () => openReportModal(appEl, journals, sortedTopics);

  } catch (err) {
    listContainer.innerHTML = `<div class="col-span-full py-24 text-center text-error font-headline font-bold">載入失敗: ${err.message}</div>`;
  }
}

// ── Modal UI Logic ─────────────────────────────────────────────────────────

function openModal(appEl, htmlContent) {
  const root = appEl.querySelector('#modal-root');
  const backdrop = appEl.querySelector('#modal-backdrop');
  const content = appEl.querySelector('#modal-content');

  content.innerHTML = htmlContent;
  root.classList.remove('hidden');
  
  // Animate in
  setTimeout(() => {
    backdrop.classList.replace('opacity-0', 'opacity-100');
    content.classList.replace('scale-95', 'scale-100');
    content.classList.replace('opacity-0', 'opacity-100');
    content.classList.add('pointer-events-auto');
  }, 10);

  const close = () => {
    backdrop.classList.replace('opacity-100', 'opacity-0');
    content.classList.replace('scale-100', 'scale-95');
    content.classList.replace('opacity-100', 'opacity-0');
    content.classList.remove('pointer-events-auto');
    setTimeout(() => root.classList.add('hidden'), 300);
  };

  backdrop.onclick = close;
  const btnClose = content.querySelector('#modal-close');
  if (btnClose) btnClose.onclick = close;
}

function openDetailModal(appEl, journal) {
  const dateStr = new Date(journal.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  const themeColor = journal.intensity > 7 ? 'error' : (journal.intensity < 4 ? 'tertiary' : 'secondary');

  const html = `
    <div class="bg-surface-container-highest w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[85vh] relative border border-outline-variant/20">
      <button id="modal-close" class="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
        <span class="material-symbols-outlined text-on-surface-variant">close</span>
      </button>

      <div class="mb-10">
        <div class="text-xs font-bold text-primary uppercase tracking-widest mb-3">${dateStr}</div>
        <h2 class="text-3xl font-extrabold text-on-surface leading-tight font-headline">回顧分析</h2>
      </div>

      <div class="flex items-center gap-4 mb-8 p-4 bg-surface rounded-2xl border border-outline-variant/10">
        <div class="flex-1">
          <div class="text-[10px] font-bold text-outline-variant uppercase mb-2">情緒強度指標</div>
          <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div class="h-full bg-${themeColor} rounded-full" style="width: ${journal.intensity * 10}%"></div>
          </div>
        </div>
        <div class="text-2xl font-black text-on-surface">${journal.intensity}<span class="text-xs text-outline ml-1">/ 10</span></div>
      </div>

      <div class="prose prose-on-surface mb-10">
        <p class="text-xl leading-relaxed text-on-surface font-body italic opacity-90">
          "${escapeHtml(journal.content)}"
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        ${(journal.topics || []).map(t => `<span class="px-4 py-2 bg-primary/10 rounded-xl text-primary font-bold text-xs"># ${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>
  `;
  openModal(appEl, html);
}

function openReportModal(appEl, journals, sortedTopics) {
  const avgIntensity = journals.reduce((a, b) => a + b.intensity, 0) / journals.length;
  
  const html = `
    <div class="bg-surface-container-high w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[85vh] relative border border-outline-variant/30">
      <button id="modal-close" class="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
        <span class="material-symbols-outlined text-on-surface-variant">close</span>
      </button>

      <div class="text-center mb-12">
        <h2 class="text-4xl font-black text-primary mb-2 font-headline">全期分析報告</h2>
        <p class="text-on-surface-variant text-sm tracking-wide font-medium">根據您的長期對話摘要計算</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-10">
        <div class="bg-surface p-6 rounded-3xl border border-outline-variant/10 text-center">
          <div class="text-[10px] font-bold text-outline uppercase mb-2">已累積對話塊</div>
          <div class="text-3xl font-black text-on-surface">${journals.length}</div>
        </div>
        <div class="bg-surface p-6 rounded-3xl border border-outline-variant/10 text-center">
          <div class="text-[10px] font-bold text-outline uppercase mb-2">平均情緒強度</div>
          <div class="text-3xl font-black text-on-surface">${avgIntensity.toFixed(1)}</div>
        </div>
      </div>

      <div class="mb-10">
        <h3 class="text-sm font-bold text-primary uppercase mb-6 tracking-widest pl-2">主題關鍵字排行</h3>
        <div class="space-y-4">
          ${sortedTopics.slice(0, 5).map((topic, i) => {
            const count = journals.filter(j => j.topics?.includes(topic)).length;
            const percent = (count / journals.length) * 100;
            return `
              <div class="flex items-center gap-4">
                <div class="w-24 text-xs font-bold text-on-surface truncate"># ${topic}</div>
                <div class="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                   <div class="h-full bg-primary rounded-full opacity-${90 - i * 15}" style="width: ${percent}%"></div>
                </div>
                <div class="w-10 text-right text-[10px] font-black text-outline">${count}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="p-6 bg-secondary-container/20 rounded-3xl border border-secondary-container/10">
        <h4 class="text-xs font-bold text-secondary uppercase mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">tips_and_updates</span> AI 進度分析
        </h4>
        <p class="text-sm text-on-secondary-container/80 leading-relaxed font-medium">
          基於您的對話頻率與情緒波動，系統觀察到您在處理「${sortedTopics[0] || '生活'}」相關議題時展現了顯著的洞察力。持續的自我對話正逐步幫助您建立更穩固的心理防禦。
        </p>
      </div>
    </div>
  `;
  openModal(appEl, html);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
