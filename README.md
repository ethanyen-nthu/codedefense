# CodeTA 2.0

**Understand your code. Ace your TA demo.**

Practice explaining your C++ programs with code-specific questions, realistic TA challenges, and instant learning feedback. Made by **Ethan Yen**, for NTHU programming classes. Independent student project. Not officially affiliated with National Tsing Hua University.

CodeTA evolves the existing CodeDefense application. It retains CodeMirror, the local Tree-sitter C++ WASM parser, uploads, source highlighting, reports, browser-local history, and offline assets. No AI service, API key, account, database, runtime server, Worker, or Pages Function is needed. Submitted code is never executed or uploaded.

![CodeTA light homepage](docs/home-desktop.png)

[Dark theme](docs/home-dark.png) · [Interview](docs/interview-desktop.png) · [Mobile](docs/interview-mobile.png) · [Report](docs/report-desktop.png)

## Practice

1. Paste C++ or upload a UTF-8 `.cpp` / `.txt` file (30,000 characters, 1,500 lines, 120 KB).
2. Review detected constructs and exact source lines. Fix syntax diagnostics before starting.
3. Choose 5, 10, or 15 questions and a level: **Fundamentals**, **Beginner**, **Normal TA** (default), **Strict TA**, or **Challenge**. Each shows a description and example.
4. Select Standard TA Interview, Explain My Code, Debugging Challenge, Quick Multiple Choice, What Happens If?, Code Tracing, or TA Demo Mode. Small programs or narrow filters may support fewer questions. Challenge includes related foundations when advanced source evidence is limited; the setup states that limitation.
5. Answer before viewing the reference. Written answers use explicit self-assessment. MC answers use exact keys with an explanation for every choice. “Explain More Simply” opens prewritten beginner guidance. Up to one relevant follow-up is available per main question.
6. Review MC accuracy separately from self-assessment, hints, skips, practiced concepts, weak concepts, and difficulty changes. Retry weak questions or use the dedicated **Review** screen.

Light, Dark, and System themes cover the editor and every screen. The choice is saved locally and applied in the document head before paint. Native keyboard controls, a skip link, focus on new questions, mobile code/question tabs, reduced-motion support, and short transitions are included. Desktop source panels can be resized horizontally. Focus mode reduces interview distractions.

## Trustworthy deterministic practice

The audited bank has **155 distinct prompts**: the original 99 reviewed and corrected, plus 56 new questions. Structured AST evidence tags replace prompt-text matching. Guards distinguish actual positive integral loop conditions, `% 10`, integral division by 10, primitive copies, reference/value parameters, accumulator-shaped uses, conventional loops, and switch/loop transfer targets. Expression and condition substitutions come from parsed nodes. Related learning objectives are deduplicated, as well as template IDs.

Question labels distinguish **Language rule**, **Your source**, **Hypothetical change**, and **Verified example**. Fixed trace snippets state their own operands, definitions, and assumptions; they do not predict arbitrary submitted-program output. No C++ execution engine is included. See [question review](docs/QUESTION-REVIEW.md).

Written modes never receive an objective semantic grade, keyword score, or AI readiness score. Students compare references/checklists and choose Understood completely, Partially understood, or Need more practice. These signals can guide practice but do not establish mastery. MC keys are local and inspectable: this is a study tool, not a secure examination system.

### Difficulty and adaptation

You can change difficulty after a main answer. Previously recorded questions, keys, responses, and results stay unchanged; only unanswered questions regenerate. The report records the old/new level, position, and whether the change was chosen or adaptive.

**Adaptive Practice is off by default.** If enabled, a weak response, skip, or hint lowers the next selected level by one. Three consecutive strong, hint-free responses raise it by one, within levels 1–5. Related weak concepts are prioritized. If the source cannot support replacements, the existing supported pool is kept. Without opt-in, the selected level never changes automatically; reports can suggest a harder level.

The optional **NTHU beginner C++11 preset** prioritizes input/output, conditions, loops, arrays, functions, recursion, and number processing. Explicit “not yet taught” checkboxes exclude related concepts. It is not a claim about the official current syllabus. Personal assignment notes are saved context, not interpreted filters.

## Local data and migration

- **Programs** stores up to 20 local programs. Save from the editor, open again, or delete individually.
- **History** keeps up to 15 recent sessions, including unfinished drafts and progress. Resume, delete individually, clear history, print, download reports, and export/import JSON.
- CodeTA exports use envelope `format: "codeta", version: 3`, including saved programs. Original CodeDefense Free v2 exports remain accepted. Session snapshots retain version 2 with additive, validated defaults; old source, answers, keys, assessments, and timestamps are preserved. New hint/difficulty metadata cannot reconstruct information the older app never recorded.
- Existing Free Edition localStorage keys are intentionally retained for compatibility. Earlier paid-AI records remain separate. If an unrecognized original record cannot be displayed, its raw history is preserved in an exportable backup before new history overwrites that key.
- Import validates all sessions/programs and source evidence before changes. Duplicate program/session IDs, oversized files, and forged evidence are rejected. Saved-program overflow fails with an explanation rather than silently dropping programs.
- Theme uses `codeta-theme`; programs use `codeta-programs-v1`. Clearing practice history preserves saved programs. Browser storage quotas/private mode/eviction may affect persistence; exports contain source and answers, so store them privately.

**The new hostname has separate storage.** On [the old website](https://codedefense-free.pages.dev/#history), choose **Export History**. On CodeTA, open **History → Import History** and choose that file. This does not delete the originals. No cross-origin storage transfer is automatic.

Offline core practice works after one complete online load and successful cache installation. The service worker bundles the parser and application assets, uses a build-specific cache, and removes only old app asset caches. Personal history is separate from asset caches. Loading the online site still sends ordinary HTTP metadata to Cloudflare; there is no configured analytics, external font, speech service, or remote processing dependency.

## Analysis limits

Tree-sitter syntax parsing is not compilation, preprocessing, type checking, overload resolution, or a proof of full C++11 conformance. Direct self-calls are recursion candidates, not proven base cases or termination. Indirect/mutual recursion is not resolved. Integral division uses narrow primitive-type evidence; unknown/shadowed/indirect types stay uncertain. Range-based for loops do not receive conventional-for rules.

Constructs are capped at 1,000 and stored evidence at 400,000 characters, with an explicit limitation when reached. Unsupported semantics are disclosed rather than filled in with invented behavior. Tests cover six actual beginner examples: Armstrong, switch, factorial, digit sum, palindrome, and arrays/functions. Examples use bounded inputs to avoid relying on a particular 32-bit int range.

## Install and verify

Only maintainers need Node and pnpm. Students open the static HTTPS site.

```sh
node --version
npm --version
npm install --global pnpm@11.25.0
git clone https://github.com/ethanyen-nthu/codedefense.git
cd codedefense
pnpm install --frozen-lockfile
pnpm run dev
```

Use Node **24.22.1** (also pinned in `.node-version` / `.nvmrc`) and pnpm **11.25.0**. No `.env` is required. If npm is missing, repair the Node installation and reopen the terminal.

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
```

The build exports **`out/`** and verifies that no API route, Function, or Worker artifact is present. `pnpm run start` serves those files for local testing; this preview Node process is never deployed. Stop other servers on port 3000 before Playwright. `pnpm run format` formats the source. Checks and their actual results are documented in [verification](docs/VERIFICATION.md).

## Cloudflare Pages Free deployment

Keep the existing GitHub repository. Use a **new Pages project named `codeta`**, if that exact subdomain is available. If it is unavailable, report that and choose an alternative explicitly; do not assume a successful URL. Use Pages, not the Workers app workflow.

1. Sign into [Cloudflare Dashboard](https://dash.cloudflare.com/); create/verify a Free account yourself if needed.
2. Open **Compute → Workers & Pages → Create application → Continue to Pages → Import an existing Git repository**.
3. Connect GitHub, review requested permissions, and select `ethanyen-nthu/codedefense`.
4. Configure project name `codeta`, framework **Next.js (Static HTML Export)**, root blank, build **`pnpm run build`**, output **`out`**.
5. Set build-only `NODE_VERSION=24.22.1` and `PNPM_VERSION=11.25.0`. Leave runtime secrets, bindings, Functions, and paid services unused. Cloudflare supports these tool-version overrides; see [build-image docs](https://developers.cloudflare.com/pages/configuration/build-image/).
6. To preserve the old production site during release, deploy the fully tested `feature/codeta-v2` branch to the new project first. Verify the returned public site, then merge the passing PR and change the new project’s production branch to **`main`**. Keep the old project’s settings unchanged. Its existing main deployment may update after merge; the previous immutable deployment and Git tags remain available.
7. Confirm the homepage, both themes, upload/parsing, five levels, a complete interview/report, refresh recovery, mobile layout, and static `/privacy` route. The removed `/api/practice` route must return 404. Code submission must not send source to any remote service.
8. Future main pushes automatically rebuild and publish. Use reviewed PRs and passing CI. No custom domain purchase is required for `pages.dev`.

See Cloudflare’s [static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/) and [Free plan limits](https://developers.cloudflare.com/pages/platform/limits/). The app has no metered runtime dependency; future provider pricing or perpetual service availability cannot be guaranteed by a repository.

## Architecture and preserved releases

`workspace.tsx` orchestrates local state/navigation. Focused components handle editor/setup, analysis, configuration, interviews/feedback, learning/history/programs, reports, branding, and themes. CodeMirror is lazy-loaded; parser WASM initializes on first analysis. Styles use one token system for surfaces, text, accents, spacing, typography, focus, and themes. No animation or state-management package was added.

`analyzer.ts` produces syntax evidence; `question-bank.ts` and `question-additions.ts` hold reviewed content; `engine.ts` selects questions and transitions assessment state; `storage.ts` handles validated local persistence and migration. Tests use the actual WASM grammar.

- Original paid-AI release: `codedefense-paid-ai-v1` (`cda048204a46be888e46474be3f80f76908c74e7`).
- Browser-only Free Edition: `codedefense-free-v1` (`3dcd0aadb6f0e61d73f517eb5684c4cbaa29592c`).
- CodeTA migration branch: `feature/codeta-v2`. History is never reset or force-pushed.
