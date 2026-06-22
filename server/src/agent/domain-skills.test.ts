import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Read the JSON via fs rather than an import so the build does not require a
// JSON import attribute under NodeNext (TS1543).
const skills = JSON.parse(
  readFileSync(fileURLToPath(new URL('./domain-skills.json', import.meta.url)), 'utf-8'),
);

// Guards the single source of truth consumed by both the extension and the server.
describe('domain-skills.json integrity', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
  });

  it('every entry has a non-empty string domain and skill', () => {
    for (const entry of skills as Array<Record<string, unknown>>) {
      expect(typeof entry.domain).toBe('string');
      expect((entry.domain as string).length).toBeGreaterThan(0);
      expect(typeof entry.skill).toBe('string');
      expect((entry.skill as string).length).toBeGreaterThan(0);
    }
  });

  it('antiBot, when present, is a boolean', () => {
    for (const entry of skills as Array<Record<string, unknown>>) {
      if ('antiBot' in entry) {
        expect(typeof entry.antiBot).toBe('boolean');
      }
    }
  });

  it('has no duplicate domains', () => {
    const domains = (skills as Array<{ domain: string }>).map((s) => s.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it('domains look like bare hostnames (no scheme or path)', () => {
    for (const { domain } of skills as Array<{ domain: string }>) {
      expect(domain).not.toMatch(/https?:\/\//);
      expect(domain).not.toContain('/');
      expect(domain).toContain('.');
    }
  });
});
