/**
 * Credential source detection for CLI setup + doctor.
 *
 * Covers env vars (static API keys), file-based OAuth (Claude Code, Codex),
 * and Keychain (Claude Code on macOS).
 *
 * Priority ordering (first = most preferred): static env > OAuth file > Keychain > Codex.
 */
import { join } from 'path';
const KEYCHAIN_SERVICE = 'Claude Code-credentials';
export function detectCredentialSources(opts) {
    const { platform, homedir, fileExists, keychainHas, env = process.env } = opts;
    const found = [];
    // Static API keys
    if (env.ANTHROPIC_API_KEY) {
        found.push({ name: 'Anthropic API key', slug: 'anthropic-env', path: 'ANTHROPIC_API_KEY env var' });
    }
    if (env.OPENAI_API_KEY) {
        found.push({ name: 'OpenAI API key', slug: 'openai-env', path: 'OPENAI_API_KEY env var' });
    }
    if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) {
        found.push({ name: 'Google API key', slug: 'google-env', path: 'GEMINI_API_KEY or GOOGLE_API_KEY env var' });
    }
    if (env.OPENROUTER_API_KEY) {
        found.push({ name: 'OpenRouter API key', slug: 'openrouter-env', path: 'OPENROUTER_API_KEY env var' });
    }
    // Claude Code (file, then Keychain on macOS)
    const claudePath = join(homedir, '.claude', '.credentials.json');
    if (fileExists(claudePath)) {
        found.push({ name: 'Claude Code', slug: 'claude', path: claudePath });
    }
    else if (platform === 'darwin' && keychainHas(KEYCHAIN_SERVICE)) {
        found.push({ name: 'Claude Code', slug: 'claude', path: 'macOS Keychain' });
    }
    // Codex
    const codexPath = join(homedir, '.codex', 'auth.json');
    if (fileExists(codexPath)) {
        found.push({ name: 'Codex CLI', slug: 'codex', path: codexPath });
    }
    return found;
}
// ── Flow state check ─────────────────────────────────────────────────
/**
 * Returns an error message if setup finished with no credentials configured,
 * or null if everything is fine.
 */
export function checkCredentialFlowResult(state) {
    if (state.sourcesDetected === 0)
        return null;
    if (state.anyImported)
        return null;
    if (state.manualEntryChosen)
        return null;
    return 'No credentials configured. The extension needs a model source to run tasks.\n'
        + 'Add one later in the Chrome extension sidepanel → Settings.';
}
