/**
 * chat.js — Chat Page (Therapy Space)
 * Adapted from Stitch「治療空間 - 暖色調 (中文版)」design.
 */

import { streamChat, editChatStream, getChatHistory, getCurrentUser, logout } from '../api.js';
import { renderThemeToggle } from '../components/theme-toggle.js';

let isLoading = false;

/** Escape HTML to prevent XSS */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** Render a single message bubble */
function createBubble(role, content) {
  const isUser = role === 'user';
  const wrapper = document.createElement('div');
  wrapper.className = 'animate-fade-in-up';
  wrapper.style.cssText = `
    display:flex;
    justify-content:${isUser ? 'flex-end' : 'flex-start'};
    opacity:0;
  `;

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    max-width:80%;
    padding:20px 32px;
    line-height:1.7;
    font-size:0.95rem;
    transition:transform 0.2s ease;
    ${isUser
      ? `background:color-mix(in srgb, var(--primary) 90%, transparent);
         color:var(--on-primary);
         border-radius:24px 24px 6px 24px;
         box-shadow:0 4px 16px color-mix(in srgb, var(--primary) 8%, transparent);`
      : `background:var(--surface-container-high);
         color:var(--on-surface);
         border-radius:24px 24px 24px 6px;
         border:1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent);`
    }
  `;

  // Format content: convert newlines to <br>
  bubble.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');

  bubble.addEventListener('mouseenter', () => { bubble.style.transform = 'translateY(-2px)'; });
  bubble.addEventListener('mouseleave', () => { bubble.style.transform = 'translateY(0)'; });

  wrapper.appendChild(bubble);
  return wrapper;
}

/** Create the thinking indicator */
function createThinkingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.id = 'thinking-indicator';
  wrapper.className = 'animate-fade-in-up';
  wrapper.style.cssText = 'display:flex;justify-content:flex-start;opacity:0;';

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    background:var(--surface-container-high);
    color:var(--on-surface);
    padding:20px 32px;
    border-radius:24px 24px 24px 6px;
    border:1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent);
    display:flex;
    flex-direction:column;
    gap:12px;
  `;

  bubble.innerHTML = `
    <p style="font-style:italic;color:var(--on-surface-variant);opacity:0.8;font-size:0.9rem;">深入地思考...</p>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:8px;height:8px;border-radius:50%;background:color-mix(in srgb, var(--primary) 40%, transparent);animation:bounce-dot 1.4s ease-in-out infinite;"></span>
      <span style="width:8px;height:8px;border-radius:50%;background:color-mix(in srgb, var(--primary) 40%, transparent);animation:bounce-dot 1.4s ease-in-out infinite 0.2s;"></span>
      <span style="width:8px;height:8px;border-radius:50%;background:color-mix(in srgb, var(--primary) 40%, transparent);animation:bounce-dot 1.4s ease-in-out infinite 0.4s;"></span>
    </div>
  `;

  wrapper.appendChild(bubble);
  return wrapper;
}

/** Scroll message container to bottom */
function scrollToBottom(container) {
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

/** Get greeting based on time of day */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '早安';
  if (hour < 18) return '午安';
  return '晚安';
}

export function renderChat(appEl, navigate) {
  const user = getCurrentUser();
  const displayName = user?.name || user?.dev_uid || '朋友';

  appEl.innerHTML = `
    <!-- Organic Background Decorations -->
    <div style="position:fixed;top:160px;left:-80px;width:256px;height:256px;background:color-mix(in srgb, var(--primary-container) 15%, transparent);border-radius:60% 40% 30% 70% / 60% 30% 70% 40%;filter:blur(48px);z-index:-1;animation:pulse-soft 10s ease-in-out infinite;pointer-events:none;"></div>
    <div style="position:fixed;bottom:80px;right:-80px;width:384px;height:384px;background:color-mix(in srgb, var(--secondary-container) 25%, transparent);border-radius:60% 40% 30% 70% / 60% 30% 70% 40%;filter:blur(48px);z-index:-1;pointer-events:none;"></div>

    <!-- TopAppBar -->
    <header style="
      position:sticky;top:0;z-index:50;
      background:color-mix(in srgb, var(--surface) 80%, transparent);
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:18px 32px;max-width:1400px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="material-symbols-outlined" style="color:var(--primary);font-size:24px;">spa</span>
          <h1 class="font-headline" style="font-size:1.5rem;font-weight:600;letter-spacing:-0.05em;color:var(--on-surface);">Sanctuary</h1>
        </div>

        <nav class="hidden md:flex gap-8 items-center">
          <a class="text-primary border-b-2 border-primary font-headline tracking-tight font-light transition-colors duration-300">Chat</a>
          <a id="nav-journal" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Journal</a>
          <a id="nav-settings" class="text-on-surface-variant font-headline tracking-tight font-light hover:text-primary cursor-pointer transition-colors duration-300">Settings</a>
        </nav>

        <div style="display:flex;align-items:center;gap:16px;">
          <button id="nav-voice" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors group" title="語音模式">
            <span class="material-symbols-outlined text-2xl group-hover:text-primary transition-colors">mic</span>
          </button>
          <button id="btn-nav-journal-mobile" class="md:hidden text-on-surface-variant hover:text-primary transition-colors" title="日誌">
            <span class="material-symbols-outlined">auto_stories</span>
          </button>
          <div id="theme-toggle-container"></div>
          <button id="btn-logout" title="登出" style="
            padding:8px;
            color:var(--on-surface-variant);
            background:none;
            border:none;
            cursor:pointer;
            border-radius:50%;
            transition:all 0.3s;
          ">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content: Chat Space -->
    <main id="chat-main" style="
      flex:1;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
      overflow-y:auto;
      padding:0 24px 160px 24px;
    ">
      <div id="messages-container" style="width:100%;max-width:720px;margin-top:48px;display:flex;flex-direction:column;gap:40px;">
        <!-- Greeting -->
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;margin-bottom:32px;">
          <h2 class="font-headline" style="font-size:clamp(2rem,5vw,3rem);font-weight:800;letter-spacing:-0.03em;color:var(--on-background);">${getGreeting()}，${escapeHtml(displayName)}。</h2>
          <p style="color:var(--on-surface-variant);font-size:1.125rem;max-width:420px;">深呼吸。這裡是你的安全空間。你現在感覺身體狀況如何？</p>
        </div>
      </div>
    </main>

    <!-- Floating Input Area -->
    <div style="
      position:fixed;bottom:48px;left:0;width:100%;
      display:flex;justify-content:center;padding:0 24px;z-index:50;
    ">
      <form id="chat-form" style="
        width:100%;max-width:640px;
        background:color-mix(in srgb, var(--surface-bright) 90%, transparent);
        backdrop-filter:blur(32px);
        -webkit-backdrop-filter:blur(32px);
        border-radius:9999px;
        padding:8px;
        box-shadow:0 15px 40px rgba(74,74,68,0.08);
        display:flex;align-items:center;gap:8px;
        border:1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent);
      ">
        <input id="chat-input" type="text" placeholder="告訴我你在想什麼..." autocomplete="off" style="
          flex:1;
          background:transparent;
          border:none;
          outline:none;
          color:var(--on-surface);
          padding:12px 16px;
          font-size:1rem;
          font-family:'Inter',sans-serif;
        "/>
        <button type="submit" id="btn-send" style="
          width:48px;height:48px;
          display:flex;align-items:center;justify-content:center;
          border-radius:50%;
          background:var(--primary);
          color:var(--on-primary);
          border:none;
          cursor:pointer;
          box-shadow:0 4px 16px color-mix(in srgb, var(--primary) 20%, transparent);
          transition:all 0.2s ease;
        ">
          <span class="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  `;

  // ── DOM refs ──
  // ── DOM refs ──
  const messagesContainer = appEl.querySelector('#messages-container');
  const chatMain = appEl.querySelector('#chat-main');
  const chatForm = appEl.querySelector('#chat-form');
  const chatInput = appEl.querySelector('#chat-input');
  const btnSend = appEl.querySelector('#btn-send');
  
  const navJournal = appEl.querySelector('#nav-journal');
  const navJournalMobile = appEl.querySelector('#btn-nav-journal-mobile');
  const navSettings = appEl.querySelector('#nav-settings');
  
  if (navJournal) navJournal.addEventListener('click', () => navigate('journal'));
  if (navJournalMobile) navJournalMobile.addEventListener('click', () => navigate('journal'));
  if (navSettings) navSettings.addEventListener('click', () => navigate('settings'));

  // ── Theme toggle ──
  renderThemeToggle(appEl.querySelector('#theme-toggle-container'));

  // ── Voice Mode ──
  appEl.querySelector('#nav-voice').addEventListener('click', () => {
    navigate('voice');
  });

  // ── Logout ──
  appEl.querySelector('#btn-logout').addEventListener('click', () => {
    logout();
    navigate('login');
  });

  // ── Message Rendering Helper ──
  let lastUserBubbleWrapper = null;
  let isEditingMessage = false;

  function addMessageToContainer(role, content) {
    const wrapper = createBubble(role, content);
    messagesContainer.appendChild(wrapper);
    
    if (role === 'user') {
      // 移除上一個編輯按鈕
      if (lastUserBubbleWrapper) {
        const oldBtn = lastUserBubbleWrapper.querySelector('.edit-msg-btn');
        if (oldBtn) oldBtn.remove();
        // 恢復透明度（如果是從編輯模式取消）
        lastUserBubbleWrapper.style.opacity = '1';
      }
      lastUserBubbleWrapper = wrapper;
      
      const innerBubble = wrapper.firstElementChild;
      innerBubble.style.position = 'relative';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-msg-btn';
      editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">edit</span>';
      editBtn.title = '編輯此訊息 (修改並重新送出)';
      editBtn.style.cssText = `
        position: absolute;
        right: -36px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--primary);
        opacity: 0.3;
        cursor: pointer;
        transition: opacity 0.2s;
        padding: 4px;
      `;
      editBtn.onmouseenter = () => { editBtn.style.opacity = '1'; };
      editBtn.onmouseleave = () => { editBtn.style.opacity = '0.3'; };
      
      editBtn.onclick = () => {
        if (isLoading) return;
        chatInput.value = content;
        chatInput.focus();
        isEditingMessage = true;
        btnSend.innerHTML = '<span class="material-symbols-outlined">update</span>';
        wrapper.style.opacity = '0.5'; // 提示正在編輯
      };
      
      innerBubble.appendChild(editBtn);
    }
  }

  // ── Load history ──
  (async () => {
    try {
      const data = await getChatHistory();
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          addMessageToContainer(msg.role, msg.content);
        });
        scrollToBottom(chatMain);
      }
    } catch (err) {
      console.warn('Could not load history:', err);
    }
  })();

  // ── Send message (Streaming) ──
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message || isLoading) return;

    isLoading = true;
    btnSend.disabled = true;
    chatInput.value = '';
    
    const wasEditing = isEditingMessage;
    isEditingMessage = false;
    btnSend.innerHTML = '<span class="material-symbols-outlined">send</span>';

    if (wasEditing && lastUserBubbleWrapper) {
      // 編輯模式：移除最後一組對話 (User + AI)
      let node = lastUserBubbleWrapper;
      while (node) {
        let next = node.nextSibling;
        node.remove();
        node = next;
      }
      lastUserBubbleWrapper = null;
    }

    // Add user bubble
    addMessageToContainer('user', message);
    scrollToBottom(chatMain);

    // Create an empty AI bubble for streaming
    const aiWrapper = createBubble('ai', '');
    const aiBubble = aiWrapper.firstElementChild;
    messagesContainer.appendChild(aiWrapper);
    scrollToBottom(chatMain);

    let textQueue = '';
    let accumulatedText = '';
    let isStreamDone = false;
    // Base speed for typing effect (ms per character). Adjusted to 40ms speed.
    const baseTypeSpeed = 40; 

    function typeNext() {
      // If we have text in the queue, type it out
      if (textQueue.length > 0) {
        // Dynamically adjust speed: if queue is getting too long (burst of chunks), type multiple chars at once to catch up
        const charsToTake = textQueue.length > 30 ? 3 : (textQueue.length > 10 ? 2 : 1);
        accumulatedText += textQueue.substring(0, charsToTake);
        textQueue = textQueue.substring(charsToTake);
        
        aiBubble.innerHTML = escapeHtml(accumulatedText).replace(/\n/g, '<br>');
        scrollToBottom(chatMain);
        
        setTimeout(typeNext, baseTypeSpeed);
      } 
      else if (isStreamDone) {
        // Queue is empty and stream is completely done
        isLoading = false;
        btnSend.disabled = false;
        chatInput.focus();
      } 
      else {
        // Queue is empty but stream hasn't finished, poll for new chunks shortly
        setTimeout(typeNext, 50);
      }
    }
    
    // Start the typing loop
    typeNext();

    const streamFn = wasEditing ? editChatStream : streamChat;

    // Process SSE Stream
    streamFn(
      message,
      // onChunk: Append new text to queue instead of direct DOM update
      (chunk) => {
        textQueue += chunk;
      },
      // onDone: Mark stream as finished, UI loop will clean up when queue is empty
      () => {
        isStreamDone = true;
      },
      // onError: Add error message to queue and mark as done
      (err) => {
        console.error('Chat error:', err);
        textQueue += '\n\n[錯誤：系統暫時無法回應，請稍後再試。]';
        isStreamDone = true;
      }
    );
  });

  // Focus input
  chatInput.focus();
}
