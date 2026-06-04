/**
 * Managed API client for Hanzi Browse CLI.
 *
 * When HANZI_API_KEY is set, tasks are routed to api.hanzilla.co instead
 * of the local relay. This module is shared by index.ts (MCP mode) and
 * cli.ts (CLI mode) so the behaviour is consistent.
 */
export declare const MANAGED_API_URL: string;
export declare const MANAGED_API_KEY: string | undefined;
export declare const IS_MANAGED_MODE: boolean;
export declare const MANAGED_DASHBOARD_URL: string;
export interface ManagedTaskResult {
    status: string;
    answer: string;
    steps: number;
    error?: string;
}
export interface ManagedClientOpts {
    apiUrl?: string;
    apiKey?: string;
}
export interface BillingStatus {
    free_remaining: number;
    credit_balance: number;
    free_tasks_per_month: number;
}
export declare function managedApiCall(method: string, path: string, body?: any, opts?: ManagedClientOpts): Promise<any>;
export declare function managedApiRaw(method: string, path: string, body?: any, opts?: ManagedClientOpts): Promise<{
    status: number;
    body: any;
}>;
export declare function getBillingStatus(opts?: ManagedClientOpts): Promise<BillingStatus | null>;
export interface PairingToken {
    pairing_token: string;
    expires_at: number;
    expires_in_seconds: number;
}
export declare function createPairingToken(opts?: ManagedClientOpts, label?: string): Promise<PairingToken>;
export declare function runManagedTask(task: string, url?: string, context?: string, timeoutMs?: number, opts?: ManagedClientOpts): Promise<ManagedTaskResult>;
