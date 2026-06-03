import {
  abortRequest,
  createAbortController,
  derivePhase,
  getApiHeaders,
  getConfig,
  isClaudeProvider,
  loadConfig,
  resolveAgentDefaultConfig,
  setConfig,
  tierForPhase,
} from './api';

describe('background api config helpers', () => {
  it('loads config from chrome storage and appends built-in skills', async () => {
    chrome.storage.local.get.mockResolvedValueOnce({
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'openai-key',
      model: 'gpt-5',
      provider: 'openai',
      userSkills: [{ domain: 'example.com', skill: 'custom' }],
    });

    const cfg = await loadConfig();

    expect(cfg.apiBaseUrl).toBe('https://api.openai.com/v1/chat/completions');
    expect(cfg.provider).toBe('openai');
    expect(cfg.userSkills).toEqual([{ domain: 'example.com', skill: 'custom' }]);
    expect(Array.isArray(cfg.builtInSkills)).toBe(true);
  });

  it('resolves default agent config for anthropic, codex, google, openrouter, and generic providers', () => {
    expect(resolveAgentDefaultConfig({
      apiBaseUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'a',
      authMethod: 'oauth',
    })).toMatchObject({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      authMethod: 'oauth',
    });

    expect(resolveAgentDefaultConfig({
      provider: 'codex',
      apiBaseUrl: 'https://chatgpt.com/backend-api/codex/responses',
      authMethod: 'codex_oauth',
    })).toMatchObject({
      provider: 'codex',
      model: 'gpt-5.1-codex',
      authMethod: 'codex_oauth',
    });

    expect(resolveAgentDefaultConfig({
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      apiKey: 'g',
    })).toMatchObject({
      provider: 'google',
      model: 'gemini-2.5-flash',
    });

    expect(resolveAgentDefaultConfig({
      provider: 'openrouter',
      apiBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: 'r',
    })).toMatchObject({
      provider: 'openrouter',
      model: 'qwen/qwen3-vl-235b-a22b-thinking',
    });

    expect(resolveAgentDefaultConfig({
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'o',
      model: 'gpt-5',
    })).toMatchObject({
      provider: 'openai',
      model: 'gpt-5',
    });
  });

  it('prefers explicit agent default config when present', () => {
    const resolved = resolveAgentDefaultConfig({
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'o',
      model: 'gpt-5',
      agentDefaultConfig: {
        provider: 'openai',
        model: 'o3',
        apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'override-key',
      },
    });

    expect(resolved).toEqual({
      provider: 'openai',
      model: 'o3',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'override-key',
    });
  });

  it('uses provider-specific headers and reports whether config is anthropic', async () => {
    setConfig({
      provider: 'anthropic',
      apiBaseUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'anthropic-key',
      authMethod: 'api_key',
    });

    expect(isClaudeProvider()).toBe(true);
    await expect(getApiHeaders()).resolves.toMatchObject({
      'x-api-key': 'anthropic-key',
      'anthropic-version': '2023-06-01',
    });

    setConfig({
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'openai-key',
      authMethod: 'api_key',
    });

    expect(isClaudeProvider()).toBe(false);
    await expect(getApiHeaders()).resolves.toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer openai-key',
    });
  });

  it('creates and aborts the active request controller', () => {
    const controller = createAbortController();
    expect(controller.signal.aborted).toBe(false);

    abortRequest();
    expect(controller.signal.aborted).toBe(true);
    expect(getConfig()).toBeTruthy();
  });
});

describe('phase-based model tiering (Phase 4)', () => {
  // These encode the safety contract: only low-risk phases may use the fast
  // tier, and consequential phases (decide/compose/finalize) never do. The
  // phase is derived from loop state — the model is never asked to declare it.

  it('derives observe on the first turn → fast tier', () => {
    const phase = derivePhase({ turnNumber: 1, prevToolNames: [], taskIntent: 'find the cheapest flight' });
    expect(phase).toBe('observe');
    expect(tierForPhase(phase)).toBe('fast');
  });

  it('derives decide after a bulk read/collection → default tier', () => {
    for (const tool of ['read_page', 'get_page_text', 'collect_page_text']) {
      const phase = derivePhase({ turnNumber: 3, prevToolNames: [tool], taskIntent: 'summarize the results' });
      expect(phase).toBe('decide');
      // Hard floor: a turn reasoning over freshly gathered content stays default.
      expect(tierForPhase(phase)).toBeNull();
    }
  });

  it('derives navigate for ordinary interaction turns → fast tier', () => {
    const phase = derivePhase({ turnNumber: 4, prevToolNames: ['computer'], taskIntent: 'open my dashboard' });
    expect(phase).toBe('navigate');
    expect(tierForPhase(phase)).toBe('fast');
  });

  it('keeps compose/send tasks on the default tier end-to-end (AC-005, CON-004)', () => {
    // Intent words like reply/post/send/message must pin the whole task to the
    // default model so a weaker model never writes or sends on the user's behalf.
    for (const intent of [
      'reply to my latest LinkedIn message',
      'post this update to X',
      'send a DM to Sam',
      'draft and submit the contact form',
    ]) {
      // Even on turn 1, a compose task must not drop to fast.
      const phase = derivePhase({ turnNumber: 1, prevToolNames: [], taskIntent: intent });
      expect(phase).toBe('compose');
      expect(tierForPhase(phase)).toBeNull();
    }
  });

  it('never returns the fast tier for decide/compose/finalize or unknown phases (AC-013)', () => {
    for (const phase of ['decide', 'compose', 'finalize', 'something-else', '', undefined]) {
      expect(tierForPhase(phase)).toBeNull();
    }
  });

  it('defaults to navigate (not a crash) when state is missing', () => {
    expect(derivePhase()).toBe('observe'); // no turnNumber → treated as first turn
    expect(derivePhase({ turnNumber: 2 })).toBe('navigate'); // no prev tools, no intent
  });
});
