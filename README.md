# CodeDefense Free Edition

**Know your code. Defend your logic.**

Rehearse a C++ lab demonstration using **your actual source**, a real browser-local C++ syntax parser, and 99 reviewed question templates. No accounts, API keys, AI provider, application server, database, subscriptions, or usage credits are needed. Students open an ordinary HTTPS website.

This migrates the existing CodeDefense repository rather than replacing its interface. The CodeMirror editor, dark design, mobile source tabs, source highlights, uploads, reports, and local history are retained. The prior paid-AI implementation is preserved in Git at tag **`codedefense-paid-ai-v1`** (commit `cda048204a46be888e46474be3f80f76908c74e7`). Migration branch: `feature/codedefense-free`.

![CodeDefense Free homepage](docs/home-desktop.png)

[Editor](docs/editor-desktop.png) · [Interview](docs/interview-desktop.png) · [Mobile](docs/interview-mobile.png) · [Report](docs/report-desktop.png)

## What works

- Paste C++ or upload UTF-8 `.cpp` / `.txt`; up to 30,000 characters, 1,500 lines, and 120,000 uploaded bytes.
- Parse locally using **web-tree-sitter 0.25.10** and the compatible C++ WASM grammar supplied by **@vscode/tree-sitter-wasm 0.3.1**. WASM assets and license notices are bundled under `public/parser/`; no CDN or external parser endpoint is used.
- Detect declarations/initialization, supported primitive types and strings, standard-stream-shaped input/output, branches, switch/cases, loops/nesting, arrays, functions/parameters/returns, direct self-call candidates, operators, logical AND/OR, break/continue, and block scope.
- See exact source lines and syntax diagnostics. Fix syntax errors before starting an interview.
- Choose Beginner / Normal TA / Strict TA, up to 5 / 10 / 15 main questions, and Standard / Explain My Code / Debugging Challenge / Quick Multiple Choice.
- Use a new random question order or enter a repeatable seed. Distinct templates are selected only for detected constructs, with category balancing and mode preferences. A small program may support fewer questions; the UI reports the actual count instead of inventing irrelevant questions.
- Answer one question at a time, request a hint, skip, optionally practice one supported follow-up, and review a report.
- Resume on the same browser, including an unfinished written draft; delete individual sessions; clear history; export/import validated JSON; print or download a study report; retry weak questions.
- After one complete successful online load, the application caches its own runtime assets and parser for offline core practice. Browser storage eviction/private mode can affect availability.

The main interface is English. Written answers can use any language, including Traditional Chinese, and the self-assessment controls include Traditional Chinese labels. A complete Traditional Chinese interface is not claimed.

## Honest assessment

**Quick Multiple Choice:** exact comparison with a reviewed template answer key. The report shows correct / recorded MC answers and a percentage; skipped MC questions count as incorrect. The keys are browser-local and inspectable—this is a practice tool, not a secure examination system.

**Written modes:** submit an explanation, read the reference and expected-point checklist, then choose “I understood completely,” “I understood partially,” or “I did not understand.” No AI, keyword matcher, or semantic grader assigns correctness to your prose.

Written self-assessments and optional follow-ups are kept **separate** from automatic MC results. There is no blended objective-looking score or AI readiness grade. Follow-ups do not alter the main MC score. Weak-topic retries include incorrect/skipped MC responses and incomplete written/follow-up understanding.

The syllabus notes and restrictions fields are saved as personal context. They do not introduce constructs absent from the parsed source, and no model interprets them. This independent project is not affiliated with NTHU; reports are informal study records.

## Analysis boundaries

Tree-sitter is an established syntax parser, not a compiler. The application never compiles or executes arbitrary submitted C++.

- Source evidence is copied from original parsed lines. Comments, strings, and pasted “instructions” are data, not executable instructions to an AI.
- Header inclusion, macro expansion, symbol/type checking, overload resolution, every C++11 semantic constraint, and runtime validity are not established.
- Integer division is labeled only for conservatively resolved primitive integral declarations/parameters/literals. Pointer, aliased, shadowed, or unknown operands remain uncertain.
- A direct unqualified self-call is reported as a **recursion candidate**, with checks against obvious name hiding and overload ambiguity. Indirect/mutual recursion and all call-resolution semantics are outside scope. The tool does not claim to have proved a valid base case or termination.
- Conventional `for` templates are excluded for range-based loops. Switch-break and decimal-digit templates have additional source guards.
- Occurrences are limited to the first 1,000 detected constructs and 400,000 stored evidence characters to bound large/minified reports; the analysis explicitly reports limits if reached.
- No submitted-program output is invented. The only fixed arithmetic follow-up examples state their own valid built-in operands, such as `123 % 10` or `7 / 2`. These are reviewed language-rule examples, not execution of the submitted program.

See [question-library review notes](docs/QUESTION-REVIEW.md) for maintenance and coverage rules.

## Install and develop

Only the maintainer needs development software. Students do not install anything.

1. Install [Node.js](https://nodejs.org/en/download) **24.22.1** (including npm) and Git. Reopen your terminal.
2. Check both Node and npm, then install the pinned package manager:

   ```sh
   node --version
   npm --version
   npm install --global pnpm@11.25.0
   ```

3. Clone the repository and install:

   ```sh
   git clone https://github.com/ethanyen-nthu/codedefense.git
   cd codedefense
   pnpm install --frozen-lockfile
   pnpm run dev
   ```

4. Open [localhost:3000](http://localhost:3000). No `.env` file is required. Press Ctrl+C to stop.

For a production-equivalent static preview:

```sh
pnpm run build
pnpm run start
```

The build creates **`out/`**. The local `start` command is a small file-only development/test preview server; **it is not deployed**. Upload `out/` to static hosting. Production requires no Node.js application server, Worker, Pages Function, cookie session, or runtime environment variable. `/privacy` is an exported static page; unknown routes return the static 404 page. View transitions in the practice workspace are browser-local.

## Tests

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
```

Unit tests use the **actual bundled WASM parser**, not a mocked concept detector. Browser tests run the exported `out/` files, with the production security-header policy. They cover Armstrong/switch/recursive examples, malformed source, source references, 10-question written practice, exact MC keys, assessment separation, follow-ups, uploads, history round-trips, refresh recovery, mobile/keyboard use, static routes, no non-GET/external processing requests, and offline parsing.

Close other servers on port 3000 before running Playwright. CI performs the same checks without any API credentials. `pnpm run format` formats the source. `pnpm run lint` is pinned to ESLint 9 because the installed React/accessibility plugins do not yet support ESLint 10; the lockfile pins compatible versions. TypeScript 6 is retained for the same lint-parser compatibility reason.

Executed delivery results and unverified platform boundaries are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Deploy to Cloudflare Pages Free

Use the **Pages static export** workflow, not Workers, not `next-on-pages`, and not a Functions deployment. Cloudflare documents the [Next.js static HTML export preset](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/), create a free account if needed, and complete email/account verification yourself. You do not need to purchase a domain or select a paid plan.
2. In **Workers & Pages**, select **Create application → Pages → Connect to Git / Import an existing Git repository**. Dashboard wording can vary; choose the Pages Git workflow.
3. Connect your GitHub account and permit access to **`ethanyen-nthu/codedefense`**. You can restrict the integration to this repository. Review any authorization page before accepting it.
4. Select the existing repository, then **Begin setup**. Name the Pages project (for example `codedefense-free`, if available).
5. Configure:

   | Setting                     | Value                                          |
   | --------------------------- | ---------------------------------------------- |
   | Production branch           | `main` after the tested migration PR is merged |
   | Framework preset            | **Next.js (Static HTML Export)**               |
   | Root directory              | repository root / blank                        |
   | Build command               | **`pnpm run build`**                           |
   | Build output directory      | **`out`**                                      |
   | Build system                | current v3 image                               |
   | `NODE_VERSION` (build-only) | **`24.22.1`**                                  |
   | `PNPM_VERSION` (build-only) | **`11.25.0`**                                  |

   The build command includes parser preparation and static/offline packaging; do not replace it with an adapter command. `.node-version` and `.nvmrc` also pin Node. Cloudflare supports version overrides for Node and pnpm; its v3 image does not infer these versions reliably from `engines` or lockfile version alone. See the [build-image documentation](https://developers.cloudflare.com/pages/configuration/build-image/).

6. Leave all API keys, secrets, database bindings, and Functions settings **empty**. The only variables above choose build tools and are not runtime credentials.
7. Save and deploy. Wait for a successful build, then open the **actual `pages.dev` URL Cloudflare returns**. No public URL is assumed until that response is verified.
8. In a clean browser, paste the Armstrong program, inspect while/modulo/variable evidence, then try switch and recursion. Complete an interview, export/import history, refresh, and test phone-width source tabs. Confirm `/api/practice` is absent and code submission produces no network POST or external processing request.
9. After a complete online load, test offline practice in browser developer tools. Browser caches/storage are best effort; save a history export as your backup.
10. Future pushes to `main` automatically rebuild and publish through the connected Git integration. Use branches/PRs and passing CI before merging. Preview branches can use the same static configuration and need no secrets.

The application has **no metered runtime dependency** and is usable on the Pages Free plan within that provider’s limits. A free `pages.dev` address avoids domain renewal fees. Cloudflare’s current Free plan has build quotas (documented as 500 builds/month); provider terms and future pricing are not a promise this repository can make. See [Pages limits](https://developers.cloudflare.com/pages/platform/limits/). No paid feature is needed for this app.

### Optional direct upload

You can also build locally and upload only `out/` using Cloudflare’s Pages Direct Upload workflow. Git-connected Pages is preferred for automatic updates. Do not upload `.next/`, source `.git/`, `node_modules/`, or the whole repository as the static output. A direct-upload project may have different Git-integration migration constraints; choose the Git workflow first if you want automatic builds.

## Privacy, offline data, and portability

Source, drafts, progress, MC results, written self-assessments, and saved reports remain browser-local. Loading the public site still sends ordinary HTTP metadata to its static hosting provider. There is no configured analytics, external font, speech service, AI endpoint, or remote storage dependency. Parser files are self-hosted. Offline assets are cached under a build-specific service-worker cache and old app caches are removed on activation; personal practice data is in localStorage, separate from that asset cache.

History exports contain source and answers. Keep them somewhere you trust. Import validates format/version, session shape/progress, size, duplicate IDs, and source evidence before changing current history. Free history uses a new v2 key; old paid-AI history remains separate with explicit legacy export/deletion controls. Switching to a different domain/browser does not migrate localStorage automatically—export on the old origin and import on the new one.

## Repository map

```text
src/app/                 Static Next.js pages and preserved dark styles
src/components/          Reused editor/home/workspace/report, local privacy notice
src/lib/analyzer.ts      Actual syntax-tree traversal and conservative type evidence
src/lib/question-bank.ts 99 reviewed C++11 template entries and follow-ups
src/lib/engine.ts        Seeded question selection and assessment state machine
src/lib/schemas.ts       Runtime schemas and versioned study records
src/lib/storage.ts       Local history, validation, import/export
src/lib/source.ts        UTF-8 uploads, limits, normalization, exact evidence checks
src/lib/examples.ts      Armstrong, switch, recursive factorial source programs
public/parser/           Bundled WASM and upstream license/provenance files
public/_headers          Static Cloudflare security headers
scripts/                 Build preparation, static verification, offline cache, preview
tests/                   Real-WASM unit tests and state/storage tests
e2e/                     Desktop/mobile tests against exported static files
out/                     Generated deployment output (Git-ignored)
```

## Troubleshooting

| Problem                          | What to check                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm` is missing                 | Repair Node installation including npm and reopen the terminal.                                                                      |
| Windows pnpm `EPERM`             | Use a permitted writable package store/terminal; do not disable security software.                                                   |
| WASM 404 / parse cannot load     | Deploy all of `out/`, including `/parser/`; run the full build command. Open via HTTP(S), not `file://`.                             |
| WASM blocked by CSP              | Keep the shipped static `_headers`, including `wasm-unsafe-eval` and same-origin fetch permissions.                                  |
| Syntax diagnostics               | Fix delimiters/statements at and before the cited line; a syntax tree is not a semantic compiler check.                              |
| Fewer than requested questions   | The source/difficulty supports a smaller reviewed pool; use a richer program or Normal/Strict TA. No irrelevant questions are added. |
| Written answer has no score      | Intended: compare the reference and self-assess; switch to Quick Multiple Choice for automatic answer keys.                          |
| Cloudflare picks the wrong tools | Set `NODE_VERSION=24.22.1` and `PNPM_VERSION=11.25.0`, then rebuild.                                                                 |
| Build succeeds but site is empty | Output directory must be `out`, not `.next` or repository root.                                                                      |
| Offline not ready                | First complete an online load, allow service workers/cache, then reload. Private browsing/storage eviction may remove caches.        |
| History missing on `pages.dev`   | Storage is origin-specific. Export from the old origin and import into this one.                                                     |
| Old UI persists                  | Reconnect, reload to install the newer asset cache, then reload once more if an old tab is still controlled by the previous worker.  |
| Port 3000 busy in browser tests  | Stop the old preview before running Playwright; tests start their own static server.                                                 |

To inspect the original implementation without changing or deleting it, use `git show codedefense-paid-ai-v1:README.md` or create a separate checkout from that tag. Do not reset or force-push shared history.
