# Review - slugify(text)

**Verdict: APPROVED**

Scope reviewed: `src/slugify.js` (new), `src/index.js` (+1 re-export line), `test/slugify.test.js` (new), `.gitignore` (new, untracked).

## Definition of Done
| Item | Status |
|---|---|
| `npm test` passes | OK - 19/19 pass (14 table rows, 4 TypeError cases, 1 index re-export check) |
| All acceptance rows covered | OK - every row in plan S1 table has a test |
| No dependencies, `package.json` unchanged | OK - `git diff package.json` empty |
| `hello` unchanged | OK - only an appended re-export line; asserted in test |
| No dead code / console output / secrets | OK |

## Correctness
- Pipeline follows the plan's 7 steps in order (lowercase -> transliterate -> NFD -> strip `\p{M}` -> separators -> whitelist -> collapse/trim).
- Transliterate runs after `toLowerCase()`, so uppercase `Æ Œ Ø Ł Đ Þ` are covered too (spot-checked: `"ŁÓDŹ Þór Ðað"` -> `"lodz-thor-dad"`).
- `"İstanbul"` -> `"istanbul"` (combining dot from lowercasing removed by `\p{M}`).
- TypeError message is clear and handles `null` explicitly.

## Regex safety
- All patterns are single character classes or `-+` with no nested/overlapping quantifiers; linear time, no ReDoS. Spot-checked with a 1M-space input: instant.
- `\p{M}` correctly uses the `u` flag.

## Blockers
None.

## Nits (optional, non-blocking)
1. `src/slugify.js:1,21` - the character class `[ßæœøđłþð]` duplicates the keys of `TRANSLITERATIONS`; adding a key requires editing two places. Could build the regex from `Object.keys(TRANSLITERATIONS).join('')`, or leave as is with a one-line comment. Acceptable for a constant this small.
2. `.gitignore` (new, `.dev-team/`) - not in BE-1's owned files. Harmless and arguably useful, but it is scope outside the plan; keep it as a separate commit or confirm it is intended.
3. `test/slugify.test.js` - TypeError test for `{}` is titled `[object Object]`; `JSON.stringify`/`typeof` in the title would read better. Cosmetic.
