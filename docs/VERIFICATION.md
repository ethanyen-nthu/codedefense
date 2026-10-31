# CodeTA 2.0 verification

Executed on Windows using Node 24.22.1 and pnpm 11.25.0. No AI requests or paid runtime services were used.

| Check             | Actual result                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| TypeScript        | Passed                                                                                                         |
| ESLint            | Passed                                                                                                         |
| Unit tests        | 61 passed across four files, including the real bundled C++ WASM parser                                        |
| Production build  | Passed Next.js static export to `out/`; no API, Function or Worker artifact                                    |
| Browser tests     | 26 passed across desktop/mobile Chromium                                                                       |
| Offline           | Cached application reload, local parser, and interview passed with the browser offline                         |
| Source processing | Tested parsing/interview flow used only same-origin GET requests; no source upload or external processing call |
| Static routes     | Root and `/privacy` return 200; old API route and unknown routes return 404                                    |

The browser suite covers all five levels, explicit topic filters, bounded fixed-trace pools, source evidence for Armstrong/switch/factorial, malformed code, deterministic MC keys and explanations, written self-assessment, ten-question completion, one follow-up, manual and adaptive difficulty changes, preserved answered snapshots, per-answer hint/difficulty records, theme persistence/system changes, light/dark CodeMirror, reduced motion, keyboard focus, mobile source tabs/no horizontal overflow, valid/invalid uploads, history export/import/delete/clear, saved programs, weak-topic practice, refresh recovery, static routing and offline use.

Unit tests additionally cover all six beginner programs (Armstrong, switch, factorial, digit sum, palindrome, arrays/functions), Unicode evidence, large and minified source bounds, conservative primitive division and direct self-call candidates, structured relevance guards, 155 distinct prompts, duplicate objective families, exact answer-key alignment, three-strong-response adaptation, explicit opt-in, historic Free v2 import defaults, preserved source/answers/keys, saved-program validation/deduplication, atomic rejection, and unreadable-original-history backups.

The first browser failures were outdated test navigation: the seed moved inside advanced settings, and exact implicit-label locators included native option text. Controls were confirmed accessible by role/name, the test navigation was corrected, and all 26 then passed. No failing result is represented as a pass.

Screenshots cover home, editor, analysis, feedback, interview, report, history, programs, weak review, privacy and instructions in light/dark themes, with mobile/tablet interview views. Captures use reduced motion to avoid recording halfway-through theme transitions. The example PDF contains scripted QA responses and self-assessments, not actual student grades. Its rendered pages are inspected during delivery QA.

React review: focused components replace the prior monolithic workspace UI; heavy editor code is lazy-loaded; parser initialization is cached; accumulator updates are indexed once; typed-answer persistence is debounced; no new animation library or external service is added. Theme styles use one token system and short transitions. Explicit focus and reduced-motion checks passed; this is not a complete assistive-technology audit or formal WCAG certification.

GitHub CI and actual Cloudflare deployment results are recorded in the final delivery summary after checking them. The new Pages release is verified before merging main so the old production deployment remains available throughout replacement verification.

Remaining limits: no arbitrary C++ execution, compilation, preprocessing, complete semantic/type/overload analysis, or proven algorithm correctness. Questions cannot establish the programmer’s intent, reachable inputs, or complexity without a student argument. Written feedback is self-assessment, not semantic grading. Safari, Firefox, physical mobile hardware, and exhaustive screen-reader behavior were not tested. The main UI is English with bilingual assessment labels. Browser storage/cache eviction and future hosting terms remain outside the app’s control.
