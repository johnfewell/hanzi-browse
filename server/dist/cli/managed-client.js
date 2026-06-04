/**
 * Managed API client for Hanzi Browse CLI.
 *
 * When HANZI_API_KEY is set, tasks are routed to api.hanzilla.co instead
 * of the local relay. This module is shared by index.ts (MCP mode) and
 * cli.ts (CLI mode) so the behaviour is consistent.
 */
export const MANAGED_API_URL = process.env.HANZI_API_URL || "https://api.hanzilla.co";
export const MANAGED_API_KEY = process.env.HANZI_API_KEY;
export const IS_MANAGED_MODE = !!MANAGED_API_KEY;
export const MANAGED_DASHBOARD_URL = process.env.HANZI_DASHBOARD_URL || 'https://api.hanzilla.co/dashboard';
export async function managedApiCall(method, path, body, opts = {}) {
    const url = opts.apiUrl ?? MANAGED_API_URL;
    const key = opts.apiKey ?? MANAGED_API_KEY;
    if (!key)
        throw new Error("HANZI_API_KEY not set");
    const res = await fetch(`${url}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
}
export async function managedApiRaw(method, path, body, opts = {}) {
    const url = opts.apiUrl ?? MANAGED_API_URL;
    const key = opts.apiKey ?? MANAGED_API_KEY;
    if (!key)
        throw new Error("HANZI_API_KEY not set");
    const res = await fetch(`${url}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    const respBody = await res.json().catch(() => ({}));
    return { status: res.status, body: respBody };
}
export async function getBillingStatus(opts = {}) {
    const url = opts.apiUrl ?? MANAGED_API_URL;
    const key = opts.apiKey ?? MANAGED_API_KEY;
    if (!key)
        return null;
    try {
        const res = await fetch(`${url}/v1/billing/credits`, {
            headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    catch {
        return null;
    }
}
export async function createPairingToken(opts = {}, label = 'CLI setup') {
    const url = opts.apiUrl ?? MANAGED_API_URL;
    const key = opts.apiKey ?? MANAGED_API_KEY;
    if (!key)
        throw new Error('HANZI_API_KEY not set');
    const res = await fetch(`${url}/v1/browser-sessions/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ label }),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Pairing failed: HTTP ${res.status} — ${errData.error || 'unknown error'}`);
    }
    return res.json();
}
export async function runManagedTask(task, url, context, timeoutMs = 5 * 60 * 1000, opts = {}) {
    const sessionsRes = await managedApiCall("GET", "/v1/browser-sessions", undefined, opts);
    const connected = sessionsRes?.sessions?.find((s) => s.status === "connected");
    if (!connected) {
        return {
            status: "error",
            answer: "No browser connected. Open Chrome with the Hanzi extension and pair it first.",
            steps: 0,
        };
    }
    const createRes = await managedApiRaw("POST", "/v1/tasks", { task, url, context, browser_session_id: connected.id }, opts);
    // Credit exhaustion — surface a clear, actionable message
    if (createRes.status === 402) {
        const b = createRes.body || {};
        const parts = [
            b.error || "Out of credits",
            `Free remaining: ${b.free_remaining ?? 0}/month. Credit balance: ${b.credit_balance ?? 0}.`,
            `Add credits at ${MANAGED_DASHBOARD_URL}`,
        ];
        return { status: "error", answer: parts.join("\n"), steps: 0, error: "credits_exhausted" };
    }
    // Rate limit
    if (createRes.status === 429) {
        return {
            status: "error",
            answer: createRes.body?.error || "Rate limit exceeded. Try again in a minute.",
            steps: 0,
            error: "rate_limited",
        };
    }
    // Generic non-ok
    if (createRes.status >= 400) {
        return {
            status: "error",
            answer: createRes.body?.error || `Server returned HTTP ${createRes.status}`,
            steps: 0,
            error: `http_${createRes.status}`,
        };
    }
    const created = createRes.body;
    if (created.error)
        return { status: "error", answer: created.error, steps: 0 };
    const taskId = created.id;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2000));
        const status = await managedApiCall("GET", `/v1/tasks/${taskId}`, undefined, opts);
        if (status.status !== "running") {
            return {
                status: status.status,
                answer: status.answer || "No answer.",
                steps: status.steps || 0,
                error: status.error,
            };
        }
    }
    return { status: "timeout", answer: "Task still running. Check back later.", steps: 0 };
}
