export function parseFlags(argv, spec) {
    const longToType = new Map();
    const shortToLong = new Map();
    for (const [name, raw] of Object.entries(spec)) {
        const [type, short] = raw.split(':');
        longToType.set(name, type);
        if (short)
            shortToLong.set(short, name);
    }
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        let name = null;
        let inline = null;
        if (a.startsWith('--')) {
            const eq = a.indexOf('=');
            if (eq >= 0) {
                name = a.slice(2, eq);
                inline = a.slice(eq + 1);
            }
            else {
                name = a.slice(2);
            }
        }
        else if (a.startsWith('-') && a.length === 2) {
            name = shortToLong.get(a.slice(1)) ?? null;
        }
        if (!name || !longToType.has(name)) {
            if (!a.startsWith('-'))
                out._.push(a);
            continue;
        }
        const type = longToType.get(name);
        if (type === 'boolean') {
            out[name] = true;
        }
        else {
            out[name] = inline ?? argv[++i];
        }
    }
    return out;
}
/** `"30s"`, `"10m"`, `"1h"`, or bare number (milliseconds). */
export function parseDuration(s) {
    const m = /^(\d+)(ms|s|m|h)?$/.exec(s.trim());
    if (!m)
        throw new Error(`Cannot parse duration: ${s}`);
    const n = parseInt(m[1], 10);
    const u = m[2] ?? 'ms';
    switch (u) {
        case 'ms': return n;
        case 's': return n * 1000;
        case 'm': return n * 60_000;
        case 'h': return n * 3_600_000;
        default: throw new Error(`Unknown unit: ${u}`);
    }
}
