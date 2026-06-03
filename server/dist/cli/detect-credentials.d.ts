/**
 * Credential source detection for CLI setup + doctor.
 *
 * Covers env vars (static API keys), file-based OAuth (Claude Code, Codex),
 * and Keychain (Claude Code on macOS).
 *
 * Priority ordering (first = most preferred): static env > OAuth file > Keychain > Codex.
 */
export type CredentialSlug = 'claude' | 'codex' | 'anthropic-env' | 'openai-env' | 'google-env' | 'openrouter-env';
export interface CredentialSource {
    name: string;
    slug: CredentialSlug;
    path: string;
}
export interface DetectOptions {
    platform: string;
    homedir: string;
    fileExists: (path: string) => boolean;
    keychainHas: (service: string) => boolean;
    env?: Record<string, string | undefined>;
}
export interface CredentialFlowState {
    sourcesDetected: number;
    anyImported: boolean;
    manualEntryChosen: boolean;
}
export declare function detectCredentialSources(opts: DetectOptions): CredentialSource[];
/**
 * Returns an error message if setup finished with no credentials configured,
 * or null if everything is fine.
 */
export declare function checkCredentialFlowResult(state: CredentialFlowState): string | null;
