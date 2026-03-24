import { getCurrentUser, logout, deleteUserMemory } from '../api.js';
import { renderThemeToggle } from '../components/theme-toggle.js';

export function renderSettings(appEl, navigate) {
  const user = getCurrentUser();
  const displayName = user?.name || user?.dev_uid || '朋友';
  const email = user?.email || (user?.dev_uid ? `${user.dev_uid}@gmail.com` : '無信箱資訊');

  appEl.innerHTML = `
    <!-- TopAppBar -->
    <header class="bg-surface/80 sticky top-0 z-50 backdrop-blur-xl border-b border-surface-container">
      <div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div class="text-2xl font-semibold text-primary tracking-wide font-headline">Sanctuary</div>
        <nav class="hidden md:flex gap-8 items-center">
          <a id="nav-chat" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Chat</a>
          <a id="nav-journal" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Journal</a>
          <a class="text-primary border-b-2 border-primary font-headline tracking-tight font-light transition-colors duration-300">Settings</a>
        </nav>
        <div class="flex items-center gap-4">
          <div id="theme-toggle-container"></div>
          <button id="btn-logout" title="登出" class="text-on-surface-variant hover:text-error transition-colors">
            <span class="material-symbols-outlined uppercase">logout</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-6 pt-12 pb-32">
      <h1 class="text-5xl font-extrabold text-on-surface tracking-tight mb-12">Settings</h1>
      
      <div class="space-y-16">
        <!-- 1. Profile Section -->
        <section>
          <h2 class="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined">person</span>
            個人資料
          </h2>
          <div class="bg-surface-container rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 border border-outline/10">
            <div class="relative group">
              <div class="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-4xl font-bold shadow-lg border-4 border-surface overflow-hidden">
                ${displayName.charAt(0).toUpperCase()}
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span class="material-symbols-outlined text-white">edit</span>
              </div>
            </div>
            <div class="flex-grow text-center md:text-left">
              <h3 class="text-2xl font-bold text-on-surface mb-1">${escapeHtml(displayName)}</h3>
              <p class="text-on-surface-variant flex items-center justify-center md:justify-start gap-2 mb-4">
                <span class="material-symbols-outlined text-sm">mail</span>
                ${escapeHtml(email)}
              </p>
              <div class="inline-flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full text-sm text-secondary font-medium">
                <span class="material-symbols-outlined text-sm">verified_user</span>
                帳號已驗證
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Interface Preferences -->
        <section>
          <h2 class="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined">palette</span>
            介面偏好
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="theme-warm" class="bg-surface-container p-6 rounded-xl flex items-center justify-between border-2 border-primary cursor-pointer transition-all">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container">
                  <span class="material-symbols-outlined">light_mode</span>
                </div>
                <div>
                  <p class="font-semibold text-on-surface">暖色模式</p>
                  <p class="text-sm text-on-surface-variant">柔和大地色系</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-primary theme-check" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            </div>
            <div id="theme-cool" class="bg-surface-container-low p-6 rounded-xl flex items-center justify-between hover:bg-surface-container transition-all cursor-pointer border-2 border-transparent">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container">
                  <span class="material-symbols-outlined">dark_mode</span>
                </div>
                <div>
                  <p class="font-semibold text-on-surface">冷色模式</p>
                  <p class="text-sm text-on-surface-variant">沉靜森林與午夜</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant theme-check hidden">check_circle</span>
            </div>
          </div>
        </section>

        <!-- 3. Voice Settings (Stub) -->
        <section class="opacity-60 grayscale-[0.5]">
          <h2 class="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined">record_voice_over</span>
            語音設定 (即將推出)
          </h2>
          <div class="bg-surface-container rounded-xl p-8 space-y-8">
            <div class="flex justify-between items-center text-on-surface-variant italic text-sm">
              <p>語音互動功能正在開發中，敬請期待 Phase 2.3。</p>
            </div>
          </div>
        </section>

        <!-- 4. Privacy & Security -->
        <section>
          <h2 class="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined">security</span>
            隱私與安全
          </h2>
          <div class="bg-surface-container-low rounded-xl overflow-hidden border border-outline/10">
            <button class="w-full flex items-center justify-between p-6 hover:bg-surface-container transition-colors group">
              <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary">download</span>
                <span class="font-medium">匯出我的資料 (CSV/JSON)</span>
              </div>
              <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
            </button>
            <div class="h-px bg-surface-container mx-6"></div>
            <button id="btn-clear-memory" class="w-full flex items-center justify-between p-6 hover:bg-error/10 transition-colors group">
              <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-error">delete_forever</span>
                <span class="font-medium text-error">清除所有記憶並重置對話</span>
              </div>
              <span class="material-symbols-outlined text-outline-variant">chevron_right</span>
            </button>
          </div>
        </section>
      </div>
    </main>

    <!-- Modal for Deletion Confirmation -->
    <div id="modal-confirm" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm hidden animate-in fade-in duration-300">
      <div class="bg-surface max-w-md w-full rounded-2xl shadow-2xl p-8 border border-outline/20">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center text-error">
            <span class="material-symbols-outlined">warning</span>
          </div>
          <h2 class="text-2xl font-bold text-on-surface">確定要清除記憶嗎？</h2>
        </div>
        <p class="text-on-surface-variant mb-8 leading-relaxed">
          此操作將永久刪除您的**所有長期摘要與當前对话歷史**。AI 治療師將不再記得過去的對談。這是一個不可逆的操作。
        </p>
        <div class="mb-8">
          <label class="block text-sm font-semibold text-on-surface mb-2">請輸入「確認刪除」以執行：</label>
          <input id="confirm-input" type="text" placeholder="確認刪除" class="w-full bg-surface-container border-2 border-outline/20 focus:border-error rounded-xl px-4 py-3 outline-none transition-all text-center font-bold tracking-widest" />
        </div>
        <div class="flex gap-4">
          <button id="btn-modal-cancel" class="flex-1 py-4 bg-surface-container-high text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest transition-colors">取消</button>
          <button id="btn-modal-delete" disabled class="flex-1 py-4 bg-error text-on-error font-semibold rounded-xl opacity-30 cursor-not-allowed transition-all">執行清除</button>
        </div>
      </div>
    </div>

    <!-- BottomNavBar (Mobile) -->
    <nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-4 bg-surface/80 backdrop-blur-xl md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.06)] rounded-t-[3rem]">
      <a id="nav-chat-mobile" class="flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:scale-105 transition-transform duration-400 cursor-pointer">
        <span class="material-symbols-outlined mb-1">chat_bubble</span>
        <span class="font-headline text-xs font-medium">Chat</span>
      </a>
      <a id="nav-journal-mobile" class="flex flex-col items-center justify-center text-on-surface-variant px-6 py-2 hover:scale-105 transition-transform duration-400 cursor-pointer">
        <span class="material-symbols-outlined mb-1">auto_stories</span>
        <span class="font-headline text-xs font-medium">Journal</span>
      </a>
      <a class="flex flex-col items-center justify-center bg-surface-container text-primary rounded-full px-6 py-2 hover:scale-105 transition-transform duration-400">
        <span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' 1;">settings</span>
        <span class="font-headline text-xs font-medium">Settings</span>
      </a>
    </nav>
  `;

  // ── Theme Sync ──
  const isDark = document.documentElement.classList.contains('dark');
  const warmCard = appEl.querySelector('#theme-warm');
  const coolCard = appEl.querySelector('#theme-cool');
  
  const updateThemeUI = (dark) => {
    if (dark) {
      coolCard.classList.add('border-primary', 'bg-surface-container');
      coolCard.classList.remove('border-transparent', 'bg-surface-container-low');
      coolCard.querySelector('.theme-check').classList.remove('hidden', 'text-outline-variant');
      coolCard.querySelector('.theme-check').classList.add('text-primary');
      
      warmCard.classList.remove('border-primary', 'bg-surface-container');
      warmCard.classList.add('border-transparent', 'bg-surface-container-low');
      warmCard.querySelector('.theme-check').classList.add('hidden');
    } else {
      warmCard.classList.add('border-primary', 'bg-surface-container');
      warmCard.classList.remove('border-transparent', 'bg-surface-container-low');
      warmCard.querySelector('.theme-check').classList.remove('hidden');
      
      coolCard.classList.remove('border-primary', 'bg-surface-container');
      coolCard.classList.add('border-transparent', 'bg-surface-container-low');
      coolCard.querySelector('.theme-check').classList.add('hidden');
    }
  };
  updateThemeUI(isDark);

  renderThemeToggle(appEl.querySelector('#theme-toggle-container'));

  // ── Navigation ──
  appEl.querySelector('#nav-chat').addEventListener('click', () => navigate('chat'));
  appEl.querySelector('#nav-chat-mobile').addEventListener('click', () => navigate('chat'));
  appEl.querySelector('#nav-journal').addEventListener('click', () => navigate('journal'));
  appEl.querySelector('#nav-journal-mobile').addEventListener('click', () => navigate('journal'));
  appEl.querySelector('#btn-logout').addEventListener('click', () => {
    logout();
    navigate('login');
  });

  // ── Memory Clear Logic ──
  const clearBtn = appEl.querySelector('#btn-clear-memory');
  const modal = appEl.querySelector('#modal-confirm');
  const cancelBtn = appEl.querySelector('#btn-modal-cancel');
  const deleteBtn = appEl.querySelector('#btn-modal-delete');
  const confirmInput = appEl.querySelector('#confirm-input');

  clearBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    confirmInput.value = '';
    deleteBtn.disabled = true;
    deleteBtn.classList.add('opacity-30', 'cursor-not-allowed');
    confirmInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  confirmInput.addEventListener('input', (e) => {
    if (e.target.value === '確認刪除') {
      deleteBtn.disabled = false;
      deleteBtn.classList.remove('opacity-30', 'cursor-not-allowed');
    } else {
      deleteBtn.disabled = true;
      deleteBtn.classList.add('opacity-30', 'cursor-not-allowed');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    deleteBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> 執行中...';
    try {
      await deleteUserMemory();
      modal.classList.add('hidden');
      alert('所有記憶已清除。對話已重置。');
      navigate('chat');
    } catch (e) {
      alert('清除失敗：' + e.message);
      deleteBtn.textContent = '執行清除';
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
