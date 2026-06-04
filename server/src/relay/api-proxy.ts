import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import {
  getClaudeCredentials,
  getClaudeKeychainCredentials,
  getCodexCredentials,
  refreshClaudeToken,
  saveClaudeCredentials,
  type ClaudeCredentials,
} from '../llm/credentials.js';

const PROXY_TIMEOUT_MS = 150000;
const EXPIRY_BUFFER_MS = 60 * 1000;
// Fast tier — used as an automatic fallback when the selected model is
// rate-limited (429). Separate rate-limit bucket from Sonnet/Opus.
const FAST_MODEL = 'claude-haiku-4-5-20251001';

// Sockets with an in-flight proxy call. The relay uses this to avoid tearing
// down an extension socket mid-call (the MV3 reconnect loop replaces sockets
// every ~5s; killing one mid-stream loses the answer the model already gave).
const pendingProxyCount = new Map<WebSocket, number>();
export function hasPendingProxy(ws: WebSocket): boolean {
  return (pendingProxyCount.get(ws) || 0) > 0;
}

function defaultLogger(message: string): void {
  console.error(`[Relay ${new Date().toISOString()}] ${message}`);
}

function isCodexUrl(hostname: string): boolean {
  return hostname.includes('chatgpt.com') || hostname.includes('openai.com');
}

function buildCodexHeaders(accountId: string | undefined, accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'openai-beta': 'responses=experimental',
    'chatgpt-account-id': accountId || '',
    'session_id': randomUUID(),
    'conversation_id': randomUUID(),
    'user-agent': 'codex_cli_rs/0.34.0 (Darwin; arm64)',
    'originator': 'codex_cli_rs',
    'accept': 'text/event-stream',
  };
}

async function getFreshClaudeCredentials(log: (message: string) => void): Promise<ClaudeCredentials | null> {
  const existing = getClaudeCredentials() || getClaudeKeychainCredentials();
  if (!existing) {
    return null;
  }

  if (existing.expiresAt && existing.expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
    return existing;
  }

  log('Claude OAuth token expired or near expiry, refreshing before proxy call');
  const refreshed = await refreshClaudeToken(existing.refreshToken);
  saveClaudeCredentials(refreshed);
  return refreshed;
}

async function sendProxyStream(
  ws: WebSocket,
  requestId: string,
  response: Response,
  options: { endOnCompleted?: boolean } = {},
  log: (message: string) => void = defaultLogger,
): Promise<void> {
  const { endOnCompleted = false } = options;
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const start = Date.now();
  let sent = 0;
  let closedLogged = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (ws.readyState !== WebSocket.OPEN && !closedLogged) {
      closedLogged = true;
      log(`stream WS-CLOSED mid-stream rid=${requestId} afterSent=${sent} at=${((Date.now() - start) / 1000).toFixed(1)}s — dropping rest`);
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'proxy_stream_chunk',
            requestId,
            data: event,
          }));
          sent++;
        }

        if (endOnCompleted && event.type === 'response.completed') {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors after terminal response event.
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'proxy_stream_end', requestId }));
          }
          log(`stream END(completed) rid=${requestId} sent=${sent} took=${((Date.now() - start) / 1000).toFixed(1)}s open=${ws.readyState === WebSocket.OPEN}`);
          return;
        }
      } catch {
        // Skip malformed JSON chunks.
      }
    }
  }

  log(`stream END rid=${requestId} sent=${sent} took=${((Date.now() - start) / 1000).toFixed(1)}s open=${ws.readyState === WebSocket.OPEN}`);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'proxy_stream_end', requestId }));
  }
}

export async function handleApiProxy(
  ws: WebSocket,
  msg: any,
  log: (message: string) => void = defaultLogger,
): Promise<void> {
  const { requestId, url, body } = msg;
  let reqModel = '?';
  try { reqModel = JSON.parse(body)?.model || '?'; } catch { /* ignore */ }
  log(`proxy START rid=${requestId} model=${reqModel} bodyLen=${(body || '').length} wsOpen=${ws.readyState === WebSocket.OPEN}`);
  pendingProxyCount.set(ws, (pendingProxyCount.get(ws) || 0) + 1);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const urlObj = new URL(url);
    const isCodex = isCodexUrl(urlObj.hostname);

    let headers: Record<string, string>;

    if (isCodex) {
      const creds = getCodexCredentials();
      if (!creds?.accessToken) {
        ws.send(JSON.stringify({ type: 'proxy_api_error', requestId, error: 'No Codex credentials found. Run `codex auth login` first.' }));
        return;
      }

      headers = buildCodexHeaders(creds.accountId, creds.accessToken);
    } else {
      let creds = await getFreshClaudeCredentials(log);
      if (!creds) {
        ws.send(JSON.stringify({ type: 'proxy_api_error', requestId, error: 'No Claude credentials found' }));
        return;
      }

      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creds.accessToken}`,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14',
        'x-app': 'cli',
        'user-agent': 'claude-code/2.1.29 (Darwin; arm64)',
      };

      let response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      if (response.status === 401) {
        log('Claude proxy request got 401, refreshing token and retrying once');
        const refreshed = await refreshClaudeToken(creds.refreshToken);
        saveClaudeCredentials(refreshed);
        creds = refreshed;
        headers.Authorization = `Bearer ${creds.accessToken}`;
        response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      }

      if (response.status === 429) {
        // The selected model is rate-limited. Retry once on the fast tier
        // (Haiku) — a separate rate-limit bucket — so the agent gets a real
        // streamed answer instead of a 429 it can't recover from.
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.model && parsed.model !== FAST_MODEL) {
            log(`Model ${parsed.model} rate-limited (429); retrying on ${FAST_MODEL}`);
            parsed.model = FAST_MODEL;
            response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(parsed), signal: controller.signal });
          }
        } catch { /* body not JSON — leave response as-is */ }
      }

      log(`proxy FETCH rid=${requestId} status=${response.status} wsOpen=${ws.readyState === WebSocket.OPEN}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        ws.send(JSON.stringify({
          type: 'proxy_api_error',
          requestId,
          error: `API error: ${response.status} - ${errorText.slice(0, 500)}`,
        }));
        return;
      }

      await sendProxyStream(ws, requestId, response, {}, log);
      return;
    }

    const response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      ws.send(JSON.stringify({
        type: 'proxy_api_error',
        requestId,
        error: `API error: ${response.status} - ${errorText.slice(0, 500)}`,
      }));
      return;
    }

    await sendProxyStream(ws, requestId, response, { endOnCompleted: true }, log);
  } catch (err: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'proxy_api_error',
        requestId,
        error: err.name === 'AbortError'
          ? `API proxy request timed out after ${PROXY_TIMEOUT_MS / 1000} seconds`
          : err.message,
      }));
    }
  } finally {
    clearTimeout(timeoutId);
    const n = (pendingProxyCount.get(ws) || 1) - 1;
    if (n <= 0) pendingProxyCount.delete(ws);
    else pendingProxyCount.set(ws, n);
  }
}
