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

        <!-- 3. Voice Settings -->
        <section>
          <h2 class="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined">record_voice_over</span>
            語音設定
          </h2>
          <div class="bg-surface-container rounded-xl p-8 space-y-8 border border-outline/10">
            <!-- STT Language -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-on-surface">辨識語言</p>
                <p class="text-sm text-on-surface-variant">語音轉文字的目標語言</p>
              </div>
              <select id="voice-stt-lang" class="bg-surface-container-high text-on-surface rounded-xl px-4 py-3 outline-none border-2 border-outline/10 focus:border-primary transition-colors min-w-[180px] font-medium cursor-pointer">
                <option value="zh-TW">繁體中文</option>
                <option value="zh-CN">簡體中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
              </select>
            </div>

            <div class="h-px bg-outline/10"></div>

            <!-- TTS Rate -->
            <div>
              <div class="flex justify-between items-center mb-3">
                <div>
                  <p class="font-semibold text-on-surface">語速</p>
                  <p class="text-sm text-on-surface-variant">AI 朗讀的速度</p>
                </div>
                <span id="voice-rate-value" class="text-xl font-black text-primary tabular-nums">1.0</span>
              </div>
              <input id="voice-rate" type="range" min="0.5" max="2.0" step="0.1" value="1.0"
                class="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary" />
              <div class="flex justify-between text-[10px] text-outline mt-1 font-bold"><span>慢 0.5</span><span>快 2.0</span></div>
            </div>

            <div class="h-px bg-outline/10"></div>

            <!-- TTS Pitch -->
            <div>
              <div class="flex justify-between items-center mb-3">
                <div>
                  <p class="font-semibold text-on-surface">音調</p>
                  <p class="text-sm text-on-surface-variant">AI 聲音的高低</p>
                </div>
                <span id="voice-pitch-value" class="text-xl font-black text-primary tabular-nums">1.0</span>
              </div>
              <input id="voice-pitch" type="range" min="0.5" max="2.0" step="0.1" value="1.0"
                class="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary" />
              <div class="flex justify-between text-[10px] text-outline mt-1 font-bold"><span>低 0.5</span><span>高 2.0</span></div>
            </div>

            <div class="h-px bg-outline/10"></div>

            <!-- TTS Voice Selection -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-on-surface">TTS 聲音</p>
                <p class="text-sm text-on-surface-variant">選擇系統可用的語音引擎</p>
              </div>
              <select id="voice-tts-voice" class="bg-surface-container-high text-on-surface rounded-xl px-4 py-3 outline-none border-2 border-outline/10 focus:border-primary transition-colors min-w-[180px] font-medium cursor-pointer">
                <option value="">系統自動偵測</option>
              </select>
            </div>

            <div class="h-px bg-outline/10"></div>

            <!-- Auto-Read Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-on-surface">自動朗讀</p>
                <p class="text-sm text-on-surface-variant">AI 回覆後自動以語音朗讀</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input id="voice-auto-read" type="checkbox" checked class="sr-only peer" />
                <div class="w-14 h-8 bg-surface-container-highest rounded-full peer peer-checked:bg-primary transition-colors duration-300 after:content-[''] after:absolute after:top-1 after:left-1 after:w-6 after:h-6 after:bg-white after:rounded-full after:transition-all after:duration-300 peer-checked:after:translate-x-6 after:shadow-md"></div>
              </label>
            </div>

            <div class="h-px bg-outline/10"></div>

            <!-- Preview Button -->
            <button id="btn-voice-preview" class="w-full py-4 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-lg">play_arrow</span>
              試聽目前設定
            </button>
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

  // ── Voice Settings Logic ──
  const VOICE_SETTINGS_KEY = 'voice_settings';
  const defaultSettings = { sttLang: 'zh-TW', rate: 1.0, pitch: 1.0, voiceName: '', autoRead: true };

  function loadVoiceSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(VOICE_SETTINGS_KEY));
      return { ...defaultSettings, ...saved };
    } catch { return { ...defaultSettings }; }
  }

  function saveVoiceSettings(s) {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(s));
  }

  const vs = loadVoiceSettings();
  const sttLangSelect = appEl.querySelector('#voice-stt-lang');
  const rateSlider = appEl.querySelector('#voice-rate');
  const rateValue = appEl.querySelector('#voice-rate-value');
  const pitchSlider = appEl.querySelector('#voice-pitch');
  const pitchValue = appEl.querySelector('#voice-pitch-value');
  const ttsVoiceSelect = appEl.querySelector('#voice-tts-voice');
  const autoReadCheckbox = appEl.querySelector('#voice-auto-read');
  const previewBtn = appEl.querySelector('#btn-voice-preview');

  // Apply saved values to UI
  sttLangSelect.value = vs.sttLang;
  rateSlider.value = vs.rate;
  rateValue.textContent = vs.rate.toFixed(1);
  pitchSlider.value = vs.pitch;
  pitchValue.textContent = vs.pitch.toFixed(1);
  autoReadCheckbox.checked = vs.autoRead;

  // Populate TTS voice list
  function populateVoices() {
    const voices = window.speechSynthesis.getVoices();
    ttsVoiceSelect.innerHTML = '<option value="">系統自動偵測</option>';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.name === vs.voiceName) opt.selected = true;
      ttsVoiceSelect.appendChild(opt);
    });
  }
  populateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Event handlers — auto-save on change
  sttLangSelect.addEventListener('change', () => {
    vs.sttLang = sttLangSelect.value;
    saveVoiceSettings(vs);
  });

  rateSlider.addEventListener('input', () => {
    vs.rate = parseFloat(rateSlider.value);
    rateValue.textContent = vs.rate.toFixed(1);
    saveVoiceSettings(vs);
  });

  pitchSlider.addEventListener('input', () => {
    vs.pitch = parseFloat(pitchSlider.value);
    pitchValue.textContent = vs.pitch.toFixed(1);
    saveVoiceSettings(vs);
  });

  ttsVoiceSelect.addEventListener('change', () => {
    vs.voiceName = ttsVoiceSelect.value;
    saveVoiceSettings(vs);
  });

  autoReadCheckbox.addEventListener('change', () => {
    vs.autoRead = autoReadCheckbox.checked;
    saveVoiceSettings(vs);
  });

  // Preview button
  previewBtn.addEventListener('click', () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance('你好，我是你的心理治療師。這是目前的語音設定預覽。');
    utterance.lang = vs.sttLang;
    utterance.rate = vs.rate;
    utterance.pitch = vs.pitch;
    if (vs.voiceName) {
      const selectedVoice = synth.getVoices().find(v => v.name === vs.voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    previewBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-pulse">volume_up</span> 播放中...';
    utterance.onend = () => {
      previewBtn.innerHTML = '<span class="material-symbols-outlined text-lg">play_arrow</span> 試聽目前設定';
    };
    utterance.onerror = () => {
      previewBtn.innerHTML = '<span class="material-symbols-outlined text-lg">play_arrow</span> 試聽目前設定';
    };
    synth.speak(utterance);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
