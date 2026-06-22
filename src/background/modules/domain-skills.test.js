import { describe, it, expect } from 'vitest';
import { getDomainSkills, isAntiBotEnabled } from './domain-skills.js';

// The built-in skills load asynchronously from the extension bundle (unavailable
// in the test env), so these tests exercise the matching logic via userSkills.
const gh = { domain: 'github.com', skill: 'use the search box' };
const ghBot = { domain: 'shop.example', skill: 'slow down', antiBot: true };

describe('getDomainSkills matching', () => {
  it('matches an exact hostname', () => {
    expect(getDomainSkills('https://github.com/foo', [gh])).toContainEqual(gh);
  });

  it('matches a subdomain via endsWith(.domain)', () => {
    expect(getDomainSkills('https://gist.github.com/x', [gh])).toContainEqual(gh);
  });

  it('does not false-match a lookalike domain', () => {
    expect(getDomainSkills('https://notgithub.com', [gh])).toEqual([]);
  });

  it('returns [] for an unrelated domain', () => {
    expect(getDomainSkills('https://example.org', [gh])).toEqual([]);
  });

  it('returns [] for an invalid or empty url', () => {
    expect(getDomainSkills('not a url', [gh])).toEqual([]);
    expect(getDomainSkills('', [gh])).toEqual([]);
  });

  it('is case-insensitive on the hostname', () => {
    expect(getDomainSkills('https://GitHub.com/x', [gh])).toContainEqual(gh);
  });
});

describe('isAntiBotEnabled', () => {
  it('is true when a matching skill sets antiBot', () => {
    expect(isAntiBotEnabled('https://shop.example/cart', [ghBot])).toBe(true);
  });

  it('is false when the matching skill has no antiBot flag', () => {
    expect(isAntiBotEnabled('https://github.com', [gh])).toBe(false);
  });

  it('is false when no skill matches', () => {
    expect(isAntiBotEnabled('https://example.org', [ghBot])).toBe(false);
  });
});
