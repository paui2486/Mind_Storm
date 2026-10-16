/**
 * api.js — Sanctuary API Client
 * Wraps all backend API calls with auth token management.
 */

const API_BASE = '/api';

/** Get stored auth info */
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('sanctuary_auth') || 'null');
  } catch { return null; }
}

/** Store auth info */
export function setAuth(auth) {
  if (auth) {
    localStorage.setItem('sanctuary_auth', JSON.stringify(auth));
  } else {
    localStorage.removeItem('sanctuary_auth');
  }
}

/** Check if user is logged in */
export function isLoggedIn() {
  return !!getAuth();
}

/** Get current user info */
export function getCurrentUser() {
  return getAuth();
}

/** Build query params for dev mode auth */
function authParams() {
  const auth = getAuth();
  if (!auth) return '';
  // In dev mode, uid is sent as query param
  if (auth.dev_uid) return `?dev_uid=${encodeURIComponent(auth.dev_uid)}`;
  return '';
}

/** Build headers (for production mode with Bearer token) */
function authHeaders() {
  const auth = getAuth();
  const headers = { 'Content-Type': 'application/json' };
  if (auth?.id_token) {
    headers['Authorization'] = `Bearer ${auth.id_token}`;
  } else if (auth?.dev_uid) {
    headers['X-Dev-UID'] = auth.dev_uid;
  }
  return headers;
}

/**
 * POST /api/auth/google
 * Dev mode: { dev_uid: "xxx" }
 * Prod mode: { id_token: "..." }
 */
export async function loginWithGoogle(payload) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  setAuth({ ...payload, ...data });
  return data;
}

/**
 * POST /api/chat (SSE Stream)
 * Sends a message and receives AI therapist reply as a stream.
 * @param {string} message - User message
 * @param {function} onChunk - Callback for each chunk of text
 * @param {function} onDone - Callback when streaming is finished
 * @param {function} onError - Callback on error
 */
export async function streamChat(message, onChunk, onDone, onError) {
  try {
    const res = await fetch(`${API_BASE}/chat${authParams()}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      throw new Error(`Chat failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (onDone) onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last partial line in the buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              if (onError) onError(new Error(data.error));
              return;
            }
            if (data.done) {
              if (onDone) onDone();
              return;
            }
            if (data.text && onChunk) {
              onChunk(data.text);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', dataStr, e);
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
  }
}

/**
 * PUT /api/chat/edit (SSE Stream)
 * Sends an edited message, replacing the last conversation turn.
 */
export async function editChatStream(message, onChunk, onDone, onError) {
  try {
    const res = await fetch(`${API_BASE}/chat/edit${authParams()}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      throw new Error(`Chat edit failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (onDone) onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              if (onError) onError(new Error(data.error));
              return;
            }
            if (data.done) {
              if (onDone) onDone();
              return;
            }
            if (data.text && onChunk) {
              onChunk(data.text);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', dataStr, e);
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
  }
}

/**
 * GET /api/chat/history
 * Retrieves conversation history for current user.
 */
export async function getChatHistory() {
  const res = await fetch(`${API_BASE}/chat/history${authParams()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`History failed: ${res.status}`);
  return res.json();
}

/**
 * GET /api/journal
 * Retrieves long-term memory summaries for current user.
 */
export async function getJournals() {
  const res = await fetch(`${API_BASE}/journal${authParams()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Journal failed: ${res.status}`);
  return res.json();
}

/**
 * DELETE /api/settings/memory
 * Clears all long-term and short-term memory for the user.
 */
export async function deleteUserMemory() {
  const user = getCurrentUser();
  if (!user) throw new Error("未登入");

  const resp = await fetch(`${API_BASE}/settings/memory${authParams()}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || "清除失敗");
  }
  return await resp.json();
}

/** Logout */
export function logout() {
  setAuth(null);
}
