/**
 * License Manager for MCP Server (BYOM mode)
 *
 * BYOM is free and unlimited — no license check needed.
 *
 * This file is kept for backwards compatibility (index.ts imports it)
 * but always returns "allowed".
 */
export declare function checkAndIncrementUsage(): Promise<{
    allowed: boolean;
    remaining: number | null;
    message: string;
}>;
export declare function getLicenseStatus(): {
    isPro: boolean;
    tasksUsed: number;
    taskLimit: number | null;
    message: string;
};
