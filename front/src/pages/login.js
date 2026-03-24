/**
 * login.js — Login Page (Sanctuary Entry)
 * Adapted from Stitch「登入聖所 (中文版)」design.
 */

import { loginWithGoogle, setAuth } from '../api.js';

export function renderLogin(appEl, navigate) {
  appEl.innerHTML = `
    <!-- Subtle Background Shapes (Tonal Enclosure) -->
    <div style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0;">
      <div style="position:absolute;top:-96px;left:-96px;width:384px;height:384px;background:var(--surface-container);border-radius:50%;opacity:0.4;filter:blur(48px);"></div>
      <div style="position:absolute;bottom:0;right:0;width:640px;height:640px;background:color-mix(in srgb, var(--secondary-container) 20%, transparent);border-radius:50%;filter:blur(100px);"></div>
    </div>

    <!-- Central Focus Container -->
    <main style="position:relative;z-index:10;width:100%;max-width:420px;margin:0 auto;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:48px;width:100%;">

        <!-- Brand Anchor -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
          <div style="width:64px;height:64px;background:var(--surface-container-high);border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <span class="material-symbols-outlined" style="font-size:30px;color:var(--primary);">spa</span>
          </div>
          <h1 class="font-headline" style="font-size:1.875rem;font-weight:800;letter-spacing:-0.05em;color:var(--primary);">數位聖所</h1>
        </div>

        <!-- Onboarding Content -->
        <div style="display:flex;flex-direction:column;gap:24px;">
          <h2 class="font-headline" style="font-size:clamp(2rem,5vw,3rem);font-weight:700;color:var(--on-surface);line-height:1.15;letter-spacing:-0.03em;">歡迎來到你的<br>避風港。</h2>
          <p style="color:var(--on-surface-variant);font-size:1.125rem;font-weight:300;line-height:1.7;max-width:288px;margin:0 auto;">深呼吸，準備好就進來吧。</p>
        </div>

        <!-- Primary Action: Google Login -->
        <div style="width:100%;padding-top:16px;">
          <button id="btn-google-login" style="
            position:relative;
            width:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:12px;
            background:var(--surface-container-lowest);
            border:1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent);
            padding:16px 32px;
            border-radius:9999px;
            cursor:pointer;
            transition:all 0.5s ease;
            box-shadow:0 10px 40px rgba(56,56,51,0.04);
            font-family:'Manrope',sans-serif;
            font-weight:600;
            font-size:1rem;
            color:var(--on-surface);
            letter-spacing:-0.02em;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            使用 Google 帳號登入
          </button>
        </div>

        <!-- Dev mode login (hidden unless backend is in dev mode) -->
        <div style="width:100%;padding-top:8px;">
          <details style="width:100%;">
            <summary style="
              cursor:pointer;
              font-size:0.75rem;
              color:var(--outline);
              text-align:center;
              letter-spacing:0.05em;
              font-family:'Manrope',sans-serif;
              list-style:none;
              user-select:none;
            ">🔧 開發模式</summary>
            <div style="margin-top:12px;display:flex;gap:8px;">
              <input id="dev-uid-input" type="text" value="test_user_001" placeholder="dev_uid" style="
                flex:1;
                padding:12px 16px;
                border-radius:9999px;
                border:1px solid var(--outline-variant);
                background:var(--surface-container);
                color:var(--on-surface);
                font-size:0.875rem;
                outline:none;
              "/>
              <button id="btn-dev-login" style="
                padding:12px 20px;
                border-radius:9999px;
                background:var(--secondary);
                color:var(--on-secondary);
                border:none;
                cursor:pointer;
                font-size:0.875rem;
                font-weight:600;
                white-space:nowrap;
              ">登入</button>
            </div>
          </details>
        </div>

        <!-- Footnote -->
        <div style="padding-top:48px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;font-family:'Manrope',sans-serif;font-weight:700;color:var(--outline);">片刻的寧靜</p>
        </div>
      </div>
    </main>

    <!-- Decorative dots -->
    <div style="position:fixed;bottom:48px;left:50%;transform:translateX(-50%);opacity:0.2;display:flex;gap:8px;">
      <div style="width:6px;height:6px;background:var(--primary);border-radius:50%;"></div>
      <div style="width:6px;height:6px;background:var(--outline-variant);border-radius:50%;"></div>
      <div style="width:6px;height:6px;background:var(--outline-variant);border-radius:50%;"></div>
    </div>
  `;

  // ── Dev mode login ──
  appEl.querySelector('#btn-dev-login').addEventListener('click', async () => {
    const uid = appEl.querySelector('#dev-uid-input').value.trim();
    if (!uid) return;
    try {
      await loginWithGoogle({ dev_uid: uid });
      navigate('chat');
    } catch (err) {
      console.error('Dev login failed:', err);
      alert('登入失敗：' + err.message);
    }
  });

  // ── Google OAuth login ──
  appEl.querySelector('#btn-google-login').addEventListener('click', () => {
    // If Google Identity Services SDK is loaded, use it
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // Fallback: open dev mode panel
      appEl.querySelector('details').open = true;
      alert('Google Sign-In SDK 尚未載入。\n請使用下方「開發模式」登入。');
    }
  });
}
