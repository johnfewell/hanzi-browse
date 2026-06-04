/**
 * Lightweight flag parser for CLI subcommands.
 *
 * Spec definition: `{ flagName: 'string' | 'boolean' | 'string:<short>' | 'boolean:<short>' }`
 *
 * Returns flags plus `_` = positional args in order.
 */
export type FlagSpec = Record<string, 'string' | 'boolean' | `string:${string}` | `boolean:${string}`>;
export interface ParsedFlags {
    _: string[];
    [flag: string]: string | boolean | string[] | undefined;
}
export declare function parseFlags(argv: string[], spec: FlagSpec): ParsedFlags;
/** `"30s"`, `"10m"`, `"1h"`, or bare number (milliseconds). */
export declare function parseDuration(s: string): number;
