# Plan - slugify(text)

Mode: Lite (this plan is the spec). Single backend developer.

## Standards (detected)
- Node 22, ESM (`"type": "module"`), named exports, 2-space indent, semicolons (match `src/index.js`).
- Zero runtime/dev dependencies. Do not touch `package.json`.
- Tests: `node:test` + `node:assert/strict`, files in `test/*.test.js`, run with `npm test` (`node --test`).
- No linter configured; keep style consistent with existing code.

## Must stories

### S1 - Slugify text
As a developer, I can call `slugify(text)` to get a URL-safe slug.

Algorithm (in order):
1. Non-string input -> throw `TypeError`.
2. Lowercase (`toLowerCase()`).
3. Apply small transliteration map for letters NFD does not decompose (verified: NFD leaves these unchanged):
   `ß->ss, æ->ae, œ->oe, ø->o, đ->d, ł->l, þ->th, ð->d`. Keep it a short constant; no broader transliteration.
4. `normalize('NFD')` and remove combining marks (`/\p{M}/gu`).
5. Runs of whitespace, `_` and `-` -> single `-`.
6. Remove every char not in `[a-z0-9-]`.
7. Collapse repeated `-` again (symbol removal may create `--`), trim leading/trailing `-`.

Acceptance criteria (each is a test case):
| Input | Output |
|---|---|
| `"Hello World"` | `"hello-world"` |
| `"Ação é Ótima!"` | `"acao-e-otima"` |
| `"Crème Brûlée"` | `"creme-brulee"` |
| `"  multiple   spaces  "` | `"multiple-spaces"` |
| `"a--b__c"` | `"a-b-c"` |
| `"Straße"` | `"strasse"` |
| `"Æsir Œuvre Øre"` | `"aesir-oeuvre-ore"` |
| `"Top 10 Tips 2024"` | `"top-10-tips-2024"` |
| `"a & b"` | `"a-b"` (no double hyphen after symbol removal) |
| `"-_-Hello-_-"` | `"hello"` |
| `"tab\tand\nnewline"` | `"tab-and-newline"` |
| `""` | `""` |
| `"!!!@@@"` | `""` |
| `"日本語"` | `""` (non-Latin scripts are stripped; documented limitation) |
| `null`, `undefined`, `42`, `{}` | throws `TypeError` |

### S2 - Public export
`slugify` is importable from both `src/slugify.js` and `src/index.js`; `hello` still works unchanged.

## Tasks

### backend-developer
**BE-1 - Implement slugify + tests** (Size S, no dependencies)
- Covers: S1, S2.
- Owned files:
  - `src/slugify.js` (new) - `export function slugify(text)`, plus a short JSDoc noting the non-Latin limitation.
  - `src/index.js` - add `export { slugify } from './slugify.js';` only; do not change `hello`.
  - `test/slugify.test.js` (new) - one test per row in the table above, plus an import-from-`src/index.js` check.

## Order / parallelism
Single task; no parallelism needed.

## Definition of Done
- `npm test` passes, all acceptance rows covered.
- No dependencies added; `package.json` unchanged.
- `hello` behavior unchanged.
- No dead code, no console output, no secrets.

## Risks
- `ß/æ/ø/œ/ł/đ` are not decomposed by NFD -> handled by the explicit map (decision: transliterate, not strip).
- Symbol removal leaving `--` (e.g. `"a & b"`) -> second collapse step; covered by a test.
- Non-Latin text yields `""` -> accepted, documented in JSDoc; out of scope.
