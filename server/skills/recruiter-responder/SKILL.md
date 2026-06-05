---
name: recruiter-responder
description: >-
  End-to-end workflow for replying to a recruiter's LinkedIn message with a resume tailored to
  their job description. Reads the recruiter's message + JD in the user's REAL signed-in Chrome
  (hanzi-browse), generates a tailored resume via the rezi MCP, downloads it as PDF, and stages a
  LinkedIn reply with the PDF attached — drafted in the user's voice via the john-voice skill —
  stopping before Send for the user to review. Use this whenever the user wants to respond to a
  recruiter or LinkedIn DM with their resume, tailor a resume to a specific job and send it, "do
  the <name> message / reply to <recruiter>", apply via a recruiter ping, or handle inbound
  recruiting outreach — even if they don't spell out every step.
---

# Recruiter Responder

Turn an inbound recruiter message into a tailored-resume reply, end to end, on the user's own
browser. Four stages: **read → tailor → download → reply (staged)**. The user always clicks Send
themselves.

## Why this exists / the one thing that makes it work

The whole point is to operate in the **user's real, signed-in Chrome** so there's no headless /
cookie / anti-bot fight. rezi in particular rejects automation: a headless browser (`HeadlessChrome`
UA, `navigator.webdriver: true`) gets bounced to `/login` even with a valid session cookie. LinkedIn
is more permissive, which is why a broken setup will *look* like it works for LinkedIn but silently
fail on rezi.

So before anything else, confirm you're driving the real browser, not a headless one.

## Prerequisites (check FIRST — most failures are here)

1. **rezi MCP connected.** You need the `mcp__rezi__*` tools (`list_resumes`, `read_resume`,
   `write_resume`, `get_job_details`, `search_jobs`). If they're missing, stop and tell the user to
   connect the rezi MCP — there is no browser fallback for *generating* the tailored resume.
2. **Only the user's REAL Chrome is on the relay.** hanzi-browse routes to whatever extension is
   connected to the relay (`ws://localhost:7862`). If a second, headless `agent-browser` instance
   has the extension loaded, it can squat on the relay and win the routing — and rezi will reject it.
   Verify with a quick probe via a browser tool: run `JSON.stringify({ua: navigator.userAgent,
   webdriver: navigator.webdriver})`. If the UA contains `Headless` or `webdriver` is `true`, you're
   on the wrong browser. Diagnose and fix before proceeding:
   - `lsof -nP -i :7862` — how many Chrome processes are connected? There should be one (the user's).
   - `ps aux | grep -i "headless=new"` — find a stray `agent-browser` headless Chrome.
   - Fix: kill the headless instance (`kill -9 <pid>`; Chrome ignores SIGTERM), have the user reload
     the hanzi-browse extension at `chrome://extensions`, then re-probe. See the project memory
     `rezi-download-and-window-attachment-problem` for the full story.
3. **john-voice skill available.** Every outgoing message is drafted/rewritten through it.

## The iron rule: trust the disk and the DOM, never the sub-agent's narration

The hanzi-browse browser sub-agent's prose ("Download complete!", "still on the login page") is
**unreliable in both directions** — it has claimed success with no file on disk, and claimed
`/login` while actually authenticated. Never branch on what it *says*. Branch on:
- **JavaScript probes** for page state (`location.href`, `document.body.innerText.includes(...)`,
  element presence) — ground truth for the page.
- **The filesystem** for downloads — `ls ~/Downloads` via Bash. The file is there or it isn't.
- The agent's **own saved screenshots** at `~/Downloads/browser-agent/<timestamp>-<sessionid>/screenshot_*.jpeg`
  if you need to see what it saw (a top-level `browser_screenshot` grabs the active/visible tab,
  which may be a *different* tab than the agent's — that mismatch wastes hours).

## Stage 1 — Read the recruiter message + JD

Drive the user's Chrome to LinkedIn Messaging, open the named conversation (search by name if
needed), and read the latest message(s). On SPA-heavy LinkedIn, `get_page_text` is more reliable
than the accessibility tree. Capture and report:
- Sender name + headline (tells you if they're an in-house vs agency/RPO recruiter).
- The latest message text, verbatim.
- The role: title, company (often unnamed for agency recruiters), location/arrangement (remote /
  hybrid / onsite), employment type (FT / contract), and the **required skills/stack** — these drive
  the tailoring.

Read the WHOLE thread, not just the latest message — recruiters often split the role across several
messages (the opener may be a vague "are you interested?" while the actual JD, comp, and stack are in
a follow-up). Scroll up to be sure.

**If the thread has no real role details** (just a generic ping, no title/skills), do NOT invent a
JD or fabricate requirements to tailor against. Either (a) reply via /john-voice asking the recruiter
for the role details first, or (b) tailor to the user's closest existing resume and tell the user you
made that assumption. Decide with the user; never manufacture a JD.

This stage is read-only. Do not draft or send anything yet.

## Stage 2 — Generate the tailored resume (rezi MCP)

**Source of truth = the user's FULL work history, not any single rezi resume.** Each rezi resume is a
partial snapshot and may omit real skills — this once made us wrongly flag Java/Spring Boot as a "gap"
when the user actually has it. This skill is meant to run in a repo that holds the user's complete
work history: look for it FIRST (a `PROFILE.md` / `work-history.md` / `master-resume.md` at the repo
root, a `resume/` or `experience/` directory, or a path the user names) and treat it as authoritative
for what the user has actually done. If you can't find one, ask where it is — don't assume a rezi
resume is the whole picture.

1. Read the master work-history source. Then `list_resumes` and pick the **closest existing rezi
   resume** as a base to inherit formatting/structure (e.g. an Angular one for an Angular role).
2. `read_resume <id>` on that base for its structure, but reconcile against the master history — pull
   in real experience and skills the base happens to omit.
3. `write_resume` (omit `resume_id` to create a NEW one) with the tailored version. Tailor by:
   - **Rewriting the summary** to lead with the JD's headline skills.
   - **Reordering the skills** sections so the JD's priorities are first (e.g. front-end/Angular
     first for an Angular role; back-end/Node first for a backend-heavy role).
   - Lightly reframing experience bullets toward the JD — **using only what's true in the user's
     master work history** (not limited to the partial rezi base).

   **Honesty is non-negotiable, and "honest" is measured against the user's full work history.** This
   goes out under the user's name to a real recruiter. Surface every JD skill the user genuinely has —
   check the master history, not just one resume, before calling anything a gap. Do NOT invent skills
   the user's history doesn't support. If the JD wants something genuinely absent from the master
   history, flag it to the user rather than papering over it. Name the new resume after the company/role (e.g.
   `"US Mobile - Full-Stack Software Engineer"`) so it's easy to find on the dashboard.

   **Name the resume so the downloaded PDF leads with the user's name** — the download filename is
   the rezi resume `name`, and a recruiter should see whose resume it is. Use the pattern
   `"<Full Name> - <Role>"` (optionally ` - <Company>` for dashboard clarity), e.g.
   `"John Fewell - MEAN Stack Developer"`. Avoid `/` and `:` in the name — they get sanitized to `_`
   in the filename (see Stage 3).

   Schema notes: `description`/`skill`/`summary` must each be a single string (join bullets with
   `\n`, never an array). Map sections (experience/education/skills) are keyed by id with
   `index`/`hide` for ordering.

## Stage 3 — Download the tailored resume as PDF

This is the seam that broke for hours; here's the verified flow. See the `app.rezi.ai` entry in
`server/src/agent/domain-skills.json` for the canonical version.

1. Navigate to `https://app.rezi.ai/dashboard/resumes`. rezi may flash `/login` then rehydrate —
   wait a few seconds and re-check via a JS probe before concluding anything. If it stays on
   `/login`, you're almost certainly on a headless browser (see Prerequisites), not logged out.
2. Find the card for the resume you just created (it's the newest).
3. Open its **3-dot / kebab** menu.
4. **Hover** the `Download` item (it's a hover flyout with a `›` — do NOT click it; a click won't
   open the submenu). The submenu shows: `Download .PDF`, `Download .DOCX`, `Save to Drive` (note
   the leading dots). Menu items expose a `title` attribute equal to their label — target by that,
   not by position.
5. Click **`Download .PDF`**. On a real headful Chrome a normal cursor click works; if needed, click
   it programmatically via `[title="Download .PDF"]`.
6. The file saves silently to `~/Downloads` with **no visible page change** — do NOT wait or loop
   for a UI change (that hangs the agent). Instead, **verify on disk**:
   `find ~/Downloads -type f -iname "*<stable substring>*.pdf" -mmin -2` and confirm it's a valid
   PDF (`file <path>` → "PDF document"). Two gotchas when locating the file:
   - **Filename sanitization**: rezi/Chrome replace characters like `/` and `:` in the resume name
     with `_` — e.g. a resume named `"IRIS / RBC - MEAN Stack Developer"` saves as
     `IRIS _ RBC - MEAN Stack Developer.pdf`. So search by a stable substring (the company name),
     not the exact title, and prefer naming resumes in Stage 2 **without** `/` or `:` to avoid this.
   - **Dedup suffix**: Chrome appends ` (1)`, ` (2)`, … if a same-named file already exists. Use the
     freshest matching path (newest mtime) for Stage 4, and pass that EXACT path (spaces, `_`, and
     suffix included) to `file_upload`.

If `Save to Drive` is chosen instead of PDF, it triggers a Google auth/picker — avoid it unless the
user asked for Drive.

## Stage 4 — Stage the LinkedIn reply (do NOT send)

1. **Draft the message with the john-voice skill.** Always. Default hand-written drafts read stiff
   and listy; john-voice makes it sound like the user (plain, clean, no "happy to"/rule-of-three
   slop). Match the recruiter's register — agency recruiters are often terse, so a short reply fits.
   Keep it to: they're interested, one true line on fit, resume attached, a plain next-step close.
2. Open the recruiter's LinkedIn thread.
3. Click the attachment / paperclip and attach the PDF via the `file_upload` tool (CDP
   `DOM.setFileInputFiles`) using the exact path from Stage 3. Target the `input[type="file"]`.
4. The LinkedIn composer is **Draft.js** — `form_input` and direct `.value =` do nothing. Focus the
   message box and insert text via `javascript_tool`:
   `document.execCommand('insertText', false, '<message>')`.
5. Verify (by reading the DOM, not the agent's claim) that the attachment shows the correct filename
   AND the message text is present.
6. **STOP. Do not click Send.** Sending to a real person is irreversible and the harness will (and
   should) gate it. Tell the user it's staged in their LinkedIn tab and ask them to review and Send.
   They can see it — it's their real browser.

## Output / handoff to the user

Report concisely:
- Who the recruiter is and the role you tailored for.
- The new rezi resume name + that the PDF is verified on disk (with the path).
- That the reply is **staged (not sent)** with the john-voice message shown inline, and the one
  action left is their Send click.
- Any honesty flags (skills the JD wanted that the resume doesn't support).

## Failure playbook (quick reference)

- **rezi shows `/login`** → probe the UA; if `Headless`/`webdriver`, you're on the wrong browser
  (kill agent-browser, reload extension). If genuinely headful and still `/login`, wait through the
  rehydrate flash, then ask the user to confirm they're signed into rezi.
- **"Downloaded" but no file** → the agent lied; re-do the download and verify on disk.
- **Download click hangs** → you waited for a page change that never comes; don't. Click, then poll
  the disk.
- **Submenu won't open** → it's hover, not click; hover the `Download` parent.
- **Message looks robotic** → you skipped john-voice. Re-run it.
- **Extension not connected** → user reloads it at `chrome://extensions`; confirm one client on
  `:7862`.
