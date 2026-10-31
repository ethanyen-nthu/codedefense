# CodeTA 2.0 implementation plan and audit

1. Preserve releases and create `feature/codeta-v2`. Retain the existing repository, parser, static export and original paid history. Keep old production online until new public verification.
2. Replace prompt-text guards with structured AST evidence. Review the original 99 questions and add 56 distinct source/what-if/fixed-trace questions. Add five levels, snapshot-preserving difficulty changes, explicit adaptation and separate assessment metrics.
3. Extract editor, setup, interview/feedback, learning/history/program screens, branding and theme controls. Introduce consistent tokens; refine layout, navigation focus, resizing, motion and mobile interactions. Lazy-load CodeMirror.
4. Preserve v2 session records using additive defaults and stable storage keys. Add validated program storage and v3 export/import; preserve unreadable raw originals before overwriting the history key. Explain cross-hostname migration.
5. Expand real-WASM unit and desktop/mobile browser coverage. Run TypeScript, ESLint, tests and static build; visually inspect both themes and printed reports. Fix observed failures.
6. Open a PR and wait for exact-commit CI. Deploy the tested feature branch to the new `codeta` Pages project, verify it publicly, then merge and switch new production to main. The old project’s existing deployment settings remain unchanged.

Audit findings: the prior UI had a large workspace component and hard-coded dark colors; source selection repeated English prompt checks; generic hints/checklists and repeated objective families reduced variety; per-answer difficulty/hint changes and program storage were absent. Changes address these without adding an external service or replacing the underlying parser/editor.
