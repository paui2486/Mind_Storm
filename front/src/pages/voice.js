import { streamChat, getCurrentUser } from '../api.js';

export function renderVoice(appEl, navigate) {
  const user = getCurrentUser();
  
  // State variables
  let state = 'idle'; // idle | listening | thinking | speaking
  let recognition = null;
  let synth = window.speechSynthesis;
  let currentUtterance = null;
  let transcribedText = '';
  let aiResponseText = '';

  // Initialize UI
  appEl.innerHTML = `
    <div class="fixed inset-0 bg-surface flex flex-col items-center justify-between py-16 px-6 overflow-hidden select-none">
      <!-- Top Bar -->
      <div class="w-full max-w-lg flex justify-between items-center z-20">
        <button id="btn-back" class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-headline font-semibold">
          <span class="material-symbols-outlined">arrow_back</span>
          返回
        </button>
        <div class="text-primary font-headline font-bold tracking-widest text-sm uppercase">Voice Mode</div>
      </div>

      <!-- Center Visualization -->
      <div class="relative flex items-center justify-center flex-1 w-full">
        <!-- Pulse Rings -->
        <div id="ring-1" class="absolute w-64 h-64 border-2 border-primary/10 rounded-full scale-0 transition-transform duration-500"></div>
        <div id="ring-2" class="absolute w-80 h-80 border border-primary/5 rounded-full scale-0 transition-transform duration-500"></div>
        
        <!-- Main Voice Blob -->
        <div id="voice-blob" class="voice-blob animate-wave-flow opacity-60 flex items-center justify-center text-on-primary">
          <span id="blob-icon" class="material-symbols-outlined text-5xl transition-all duration-500">mic</span>
        </div>
      </div>

      <!-- Bottom Content -->
      <div class="w-full max-w-2xl flex flex-col items-center gap-8 z-20">
        <!-- Subtitles / Feedback -->
        <div id="subtitle-box" class="text-center min-h-[4rem] px-4">
          <p id="subtitle-text" class="text-on-surface/60 font-body text-lg leading-relaxed transition-opacity duration-300">
            點擊下方按鈕開始對話
          </p>
        </div>

        <!-- Action Button -->
        <div class="flex flex-col items-center gap-4">
          <button id="btn-action" class="w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 group">
            <span id="action-icon" class="material-symbols-outlined text-4xl">mic</span>
          </button>
          <span id="status-label" class="text-xs font-headline font-bold text-outline uppercase tracking-widest">點擊說話</span>
        </div>
      </div>

      <!-- Background Decorations -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div class="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
    </div>
  `;

  const btnBack = appEl.querySelector('#btn-back');
  const btnAction = appEl.querySelector('#btn-action');
  const actionIcon = appEl.querySelector('#action-icon');
  const statusLabel = appEl.querySelector('#status-label');
  const subtitleText = appEl.querySelector('#subtitle-text');
  const voiceBlob = appEl.querySelector('#voice-blob');
  const blobIcon = appEl.querySelector('#blob-icon');
  const ring1 = appEl.querySelector('#ring-1');
  const ring2 = appEl.querySelector('#ring-2');

  // Helper: Update State UI
  function updateUI() {
    switch (state) {
      case 'idle':
        actionIcon.textContent = 'mic';
        statusLabel.textContent = '點擊說話';
        subtitleText.style.opacity = '0.6';
        voiceBlob.style.transform = 'scale(1)';
        voiceBlob.style.filter = 'blur(8px)';
        blobIcon.textContent = 'mic';
        ring1.classList.remove('animate-pulse-ring');
        ring1.style.transform = 'scale(0)';
        ring2.style.transform = 'scale(0)';
        break;
      case 'listening':
        actionIcon.textContent = 'stop';
        statusLabel.textContent = '聆聽中...';
        subtitleText.textContent = transcribedText || '正在聆聽您的聲音...';
        subtitleText.style.opacity = '1';
        voiceBlob.style.transform = 'scale(1.2)';
        voiceBlob.style.filter = 'blur(4px)';
        blobIcon.textContent = 'graphic_eq';
        ring1.classList.add('animate-pulse-ring');
        ring1.style.transform = 'scale(1)';
        ring2.style.transform = 'scale(1)';
        break;
      case 'thinking':
        actionIcon.textContent = 'hourglass_empty';
        statusLabel.textContent = '思考中...';
        subtitleText.textContent = transcribedText;
        subtitleText.style.opacity = '0.8';
        voiceBlob.style.transform = 'scale(0.9)';
        voiceBlob.style.filter = 'blur(12px)';
        blobIcon.textContent = 'psychology';
        ring1.classList.remove('animate-pulse-ring');
        break;
      case 'speaking':
        actionIcon.textContent = 'volume_up';
        statusLabel.textContent = '治療師正在說話';
        subtitleText.textContent = aiResponseText;
        subtitleText.style.opacity = '1';
        voiceBlob.style.transform = 'scale(1.1)';
        voiceBlob.style.filter = 'blur(2px)';
        blobIcon.textContent = 'auto_awesome';
        ring1.classList.add('animate-pulse-ring');
        break;
    }
  }

  // Initialize Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    subtitleText.textContent = '您的瀏覽器不支援語音辨識，請使用 Chrome 或 Safari。';
    btnAction.disabled = true;
    btnAction.style.opacity = '0.5';
  } else {
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      transcribedText = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      updateUI();
    };

    recognition.onend = () => {
      if (state === 'listening') {
        if (transcribedText.trim()) {
          startChatting(transcribedText);
        } else {
          state = 'idle';
          transcribedText = '';
          subtitleText.textContent = '沒聽清楚，請再試一次';
          updateUI();
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      state = 'idle';
      subtitleText.textContent = '發生錯誤，請稍後再試';
      updateUI();
    };
  }

  // Function: Start Chat Logic
  async function startChatting(message) {
    state = 'thinking';
    aiResponseText = '';
    updateUI();

    try {
      await streamChat(
        message,
        (chunk) => {
          aiResponseText += chunk;
          subtitleText.textContent = aiResponseText;
        },
        () => {
          // Finished streaming
          speak(aiResponseText);
        },
        (err) => {
          console.error('Chat error:', err);
          state = 'idle';
          subtitleText.textContent = '通訊發生錯誤';
          updateUI();
        }
      );
    } catch (err) {
      state = 'idle';
      updateUI();
    }
  }

  // Function: TTS Speak
  function speak(text) {
    if (!synth) return;
    
    // Stop any current reading
    synth.cancel();

    state = 'speaking';
    updateUI();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'zh-TW';
    // 試著找到更自然的中文聲音
    const voices = synth.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh-TW') || v.lang.includes('zh-HK')) || voices.find(v => v.lang.includes('zh'));
    if (zhVoice) currentUtterance.voice = zhVoice;

    currentUtterance.onend = () => {
      state = 'idle';
      transcribedText = '';
      updateUI();
    };

    currentUtterance.onerror = () => {
      state = 'idle';
      updateUI();
    };

    synth.speak(currentUtterance);
  }

  // Event Listeners
  btnBack.addEventListener('click', () => {
    if (recognition) recognition.stop();
    if (synth) synth.cancel();
    navigate('chat');
  });

  btnAction.addEventListener('click', () => {
    if (state === 'idle') {
      state = 'listening';
      transcribedText = '';
      updateUI();
      recognition.start();
    } else if (state === 'listening') {
      recognition.stop();
    } else if (state === 'speaking') {
      synth.cancel();
      state = 'idle';
      updateUI();
    }
  });

  // Cleanup on unmount (implicit in SPA)
  window.addEventListener('hashchange', () => {
    if (recognition) recognition.stop();
    if (synth) synth.cancel();
  }, { once: true });

  updateUI();
}
