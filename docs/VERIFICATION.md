# Free Edition verification

This migration preserves the original application in Git at `codedefense-paid-ai-v1` and works on `feature/codedefense-free`.

Executed locally on Windows with Node 24.22.1 and pnpm 11.25.0:

| Check            | Result                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TypeScript       | Passed                                                                                                                     |
| ESLint           | Passed with no warnings                                                                                                    |
| Unit tests       | 38 passed across three files, using the real C++ WASM grammar                                                              |
| Production build | Passed Next.js static export to `out/`                                                                                     |
| Browser tests    | 16 passed across desktop/mobile Chromium, including offline parsing                                                        |
| Runtime backend  | No API route, Functions, database, AI SDK, key requirement, or runtime cookie/session                                      |
| Network evidence | The tested parse/interview flow used only same-origin GET requests; no source upload, external processing request, or POST |
| Static routes    | Root and `/privacy` render from exported files; unknown paths and the old API path return 404                              |

The tests exercise Armstrong-number modulo/digits/variables/loops, switch/case/break, recursive factorial functions/parameters/self-calls, malformed syntax, Unicode, exact line quotes, non-UTF-8/executable/oversized uploads, unknown/floating/pointer division, substantial and minified input, template relevance/uniqueness/keys/seeds, no arbitrary prose grading, self-assessment separation, one follow-up, ten-question completion, weak retries, draft recovery, history import/export/deletion, keyboard use and mobile source highlighting.

The initial reviewed bank has 99 distinct template prompts. Exact syntax-category/evidence checks do not constitute semantic compilation. Explanations remain study material to review against source and course material. No arbitrary user code is executed. Fixed arithmetic follow-ups state their own built-in operands rather than inventing a submitted program’s output.

The screenshot/print capture uses an example program and scripted sample answers/self-assessments, not a real student assessment. Desktop, mobile, tablet and printable output are inspected during delivery QA. JSON exports and browser Print / Save PDF provide portable reports.

Cloudflare deployment is a separate external step: dashboard sign-in and any required GitHub authorization must be available. No `pages.dev` URL is assumed before an actual successful deployment and public verification. GitHub CI results and deployment status are recorded in the delivery summary once checked.

Unverified boundaries: Safari/Firefox and physical mobile hardware; exhaustive C++ semantic/conformance analysis; indirect recursion/call resolution; every possible macro/header configuration; and permanent availability/pricing of any hosting provider. Core assets are bundled, and offline practice passed the Chromium test after a successful cache installation. Storage eviction and private browsing remain browser-controlled.
