# Delivery verification

Verified locally on Windows / Node 24.22.1. These are executed results, not assumptions about external service availability.

| Check                       | Result                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                  | Passed `pnpm run typecheck`                                                                                                                               |
| ESLint                      | Passed `pnpm run lint` with no warnings                                                                                                                   |
| Unit / backend integration  | 73 passed across 8 files; mocked provider/store/security boundaries                                                                                       |
| Production build            | Passed Next.js 16.4.3 webpack production build                                                                                                            |
| Browser journeys            | 18 passed across desktop and mobile Chromium                                                                                                              |
| Visual inspection           | Desktop homepage and mobile interview inspected; desktop editor/interview/report and tablet screenshots captured                                          |
| Printable report            | Browser-generated A4 sample PDF produced from a completed demo interview                                                                                  |
| Page errors                 | None during screenshot journey                                                                                                                            |
| Browser credential boundary | Production `.next/static` JavaScript search found no `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `TURNSTILE_SECRET_KEY`, or `api.openai.com` references |

## What the tests cover

- Blank, valid, oversized, binary/non-UTF-8, executable-extension, and unusual-character source input; exact source line matching.
- Curated loop and recursion examples; injected instructions remain source data; server prompts explicitly treat code/answers as untrusted.
- Runtime schema validation; generated questions outside detected concepts and mismatching evidence are rejected; retries are bounded.
- Mocked Responses integration uses the requested model, `store: false`, input/output token limits, shared reservation before generation, and token accounting.
- Main scoring at correct/partial/incorrect values; initial/follow-up arithmetic; skip behavior, one follow-up, completed reports, and retry of weak questions.
- Server state ownership, private answer keys before response, rejected client score fields, duplicate/out-of-order answer protection, and recovery after model failure.
- Quota/concurrency refusal and infrastructure failure at the mocked Redis EVAL boundary. Atomic Lua statements are implemented, but live Upstash execution is not established by a mock.
- Browser upload, clear confirmation, keyboard skip link, one-question UI, relevant source highlights, mobile tabs/no horizontal overflow, reload recovery, JSON downloads, history export/deletion, live-analysis/grading error preservation.
- Optional dictation with a fake recognition implementation: transcript stays editable and is never auto-submitted. No actual microphone recording occurred.

## Unverified external boundaries

- A paid OpenAI call with this owner's API project and selected model. No usable API credentials were available; normal automated checks incurred no AI charges.
- Live Upstash connectivity, persistence/eviction settings, and actual distributed deployment behavior.
- Real Cloudflare Turnstile hostname configuration and browser challenge completion.
- Actual browser microphone permissions/transcription, physical iPhone/iPad behavior, Safari, and Firefox.
- AI technical accuracy for arbitrary new code; exact quotes are checked, but neither semantic correctness nor compilation is proven. Never present practice estimates as official grades.

The homepage and safe demo can be publicly hosted while these services remain unconfigured. Paid endpoints fail closed. See README for exact configuration and the manual live smoke test required before advertising live AI to classmates.

GitHub/CI and HTTPS deployment results are recorded separately when completed; a local pass does not imply a remote CI or deployment pass.
