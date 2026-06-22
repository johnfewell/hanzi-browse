# Hanzi Browse — QA Status

Continuous quality & validation effort. This directory is the canonical source of truth.

## Artifacts
- **`feature-spec.csv`** — every identified feature (113 rows) with user story, expected
  behaviour, edge cases, test cases, current status, defect count, severity, notes,
  last-tested date. Phases 1–2.
- **`defects.csv`** — defect log (ID, feature, repro, expected/actual, severity, root
  cause, status, fix, regression test). Phases 3–4.

## Status legend (feature-spec.csv `Current Status`)
- `TESTED` — has executed automated coverage.
- `PARTIAL` — some automated coverage; remainder needs live Chrome/CDP or UI E2E.
- `NEEDS-REVIEW` — fixed/changed; covered by reasoning + build/lint, no isolated unit harness.
- `NOT-TESTED` — static review only (predominantly live-browser features that cannot be
  exercised without a running extension + Chrome).

## Current numbers
- Features inventoried: **113**
- Automated tests: **244 passing** (extension 157, server 87) — up from 138 baseline.
- Defects: **11 found** → **9 fixed**, 1 won't-fix (DEF-007), 1 open/deferred (DEF-008).
- Quality gates: `tsc` build ✅, `npm run lint` ✅ (was broken: 88 errors → 0; DEF-011 fixed).

## Tests added during this effort
- `src/sidepanel-preact/hooks/useFocusTrap.test.jsx` (focus-trap escape + safe restore)
- `src/sidepanel-preact/utils/format.test.js` (computer action labels — extended)
- `src/background/utils/retry.test.js` (exponential backoff timing — extended)
- `src/background/dom-service/serializer.test.js`
- `src/background/dom-service/tree-builder.test.js`
- `src/background/modules/conversation-compaction.test.js` (incl. DEF-004 emergency path)
- `src/background/modules/screenshot-context.test.js` (DPR coordinate scaling)
- `src/background/modules/mouse-movement.test.js`
- `src/background/modules/memory-manager.test.js` (thresholds, stats; api.js mocked)
- `src/background/modules/domain-skills.test.js` (hostname/subdomain matching, antiBot)
- `src/background/managers/usage-tracker.test.js` (token accumulation, per-model cost)
- `src/background/tool-handlers/agent-tool.test.js` (update_plan/escalate/get_info/resize/captcha branches via deps injection)
- `src/background/tool-handlers/monitoring-tool.test.js` (read_console / read_network filtering, regex, clear, tracking)
- `src/background/tool-handlers/tabs-tool.test.js` (context/create/close, restricted-url filtering, MCP-window grouping)
- `src/background/tool-handlers/navigation-core.test.js` (url normalization, back/forward, validation)
- `src/sidepanel-preact/components/EmptyState.test.jsx` (mode-aware examples, select)
- `src/sidepanel-preact/components/PlanModal.test.jsx` (render, approve/cancel/escape, overlay)
- `.eslintrc.json` — added vitest globals to the test override (DEF-011: `npm run lint` was failing with 88 no-undef errors)
- `server/src/agent/domain-skills.test.ts` (schema integrity of the source of truth)
- `server/src/cli/session-files.test.ts` (`.png` cleanup — extended)

## Known environmental limit
The majority of user-facing surface is **live browser automation** (CDP tool handlers,
agent loop, OAuth/relay round-trips, streaming). These require a running Chrome with the
extension loaded and cannot be executed in this sandbox; the corresponding rows remain
`NOT-TESTED`/`PARTIAL` (static-review only). Completing the Phase-6 "all major user
journeys end-to-end" exit criterion requires that runtime environment.

## How to run
```bash
npx vitest run            # extension suite (root)
cd server && npx vitest run   # server suite
cd server && npm run build    # tsc typecheck
```
