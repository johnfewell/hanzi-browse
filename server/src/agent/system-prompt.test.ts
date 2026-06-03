import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./system-prompt.js";

// Flatten every text block into one string for assertions.
const promptText = (taskUrl?: string) =>
  buildSystemPrompt(taskUrl)
    .map((b) => b.text)
    .join("\n");

describe("managed buildSystemPrompt — turn density (REQ-006 / REQ-009)", () => {
  it("contains the batching directive (AC-012)", () => {
    const text = promptText();

    expect(text).toContain("Batch independent actions into one turn");
    expect(text).toMatch(/multiple tool calls in a SINGLE response/);
    // The compose/send safety guard mirrors the extension prompt.
    expect(text).toMatch(/NEVER batch content composition with its submission/);
  });

  it("limits per-turn narration (REQ-009b)", () => {
    const text = promptText();

    expect(text).toMatch(/do NOT narrate every step/);
    expect(text).toContain("under 120 characters");
  });

  it("leaves the bulk-read / text framing unchanged (AC-012)", () => {
    // Phase 2 must not disturb the bulk-read guidance the managed prompt
    // already had — that framing is Phase 1/3 territory, not this change.
    const text = promptText();

    expect(text).toContain(
      'Use "get_page_text" or "read_page" to efficiently read content instead of repeatedly scrolling.',
    );
  });

  it("still injects domain knowledge for known sites", () => {
    // Guard against the edits accidentally breaking block assembly.
    const text = promptText("https://www.linkedin.com/messaging/");
    expect(text).toContain("domain_knowledge");
  });
});
