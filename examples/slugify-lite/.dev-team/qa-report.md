# QA Report - slugify(text)

**Verdict: READY** (no defect against the spec; there are spec-level limitations to consider, listed below)

## 1. Suites / build / lint
- `npm test` (`node --test`): **19/19 pass**, 0 fail, ~78 ms. Ran it more than once and got the same results, so nothing looks flaky.
- No build step and no linter are configured. `package.json` is unchanged and no dependencies were added.
- The `src/index.js` diff contains only the re-export line, so `hello` is unchanged.

## 2. Acceptance criteria coverage
| Criterion | Test present | Result |
|---|---|---|
| `"Hello World"` -> `hello-world` | yes | PASS |
| `"Ação é Ótima!"` -> `acao-e-otima` | yes | PASS |
| `"Crème Brûlée"` -> `creme-brulee` | yes | PASS |
| `"  multiple   spaces  "` -> `multiple-spaces` | yes | PASS |
| `"a--b__c"` -> `a-b-c` | yes | PASS |
| `"Straße"` -> `strasse` | yes | PASS |
| `"Æsir Œuvre Øre"` -> `aesir-oeuvre-ore` | yes | PASS |
| `"Top 10 Tips 2024"` -> `top-10-tips-2024` | yes | PASS |
| `"a & b"` -> `a-b` | yes | PASS |
| `"-_-Hello-_-"` -> `hello` | yes | PASS |
| `"tab\tand\nnewline"` -> `tab-and-newline` | yes | PASS |
| `""` -> `""` | yes | PASS |
| `"!!!@@@"` -> `""` | yes | PASS |
| `"日本語"` -> `""` | yes | PASS |
| `null/undefined/42/{}` throw TypeError | yes | PASS |
| S2: import from `src/index.js`, `hello` unchanged | yes | PASS |

All rows are covered by automated tests.

## 3. Ad hoc / exploratory (script `node /tmp/qa-edge.mjs`)
| Input | Output | Notes |
|---|---|---|
| `"tab\t\tx\r\ny\u000bz"` | `tab-x-y-z` | OK |
| `"ÉCOLE ÑANDÚ ÇA"` | `ecole-nandu-ca` | OK, uppercase accents |
| `"I ❤️ JS 🚀 rocks"` | `i-js-rocks` | OK, emoji and VS16 stripped |
| `"abc123def 4x4"` | `abc123def-4x4` | OK |
| `"  !!Hello!!  "`, `"#$%-start-end-%$#"` | `hello`, `start-end` | OK |
| `"ẞ GROSSES ẞ"`, `"STRAẞE"` | `ss-grosses-ss`, `strasse` | OK (U+1E9E lowercases to ß first) |
| `"école"` (already decomposed) | `ecole` | OK |
| `"Đặng Łódź Þór ÐÐ"` | `dang-lodz-thor-dd` | OK |
| `"İstanbul"` | `istanbul` | OK |
| NBSP, em space, ideographic space, U+2028, BOM | treated as separator | OK |
| Non-string (`new String`, Symbol, BigInt, `[]`, `true`) | TypeError | OK |

- **Idempotence:** a fuzz run of 20,000 random strings (Latin, accents, ß/ẞ/ı/İ, æ, emoji, CJK, symbols, tabs) gave 0 violations. Every output matched `^([a-z0-9]+(-[a-z0-9]+)*)?$` and `slugify(slugify(x)) === slugify(x)` held each time.
- **Performance / ReDoS:** all patterns are linear (single-char classes, no nested quantifiers). 1 MB of words took 71 ms; 1 MB of `-` took 5 ms; 1 MB of `-!` alternating took 84 ms; 1 MB of spaces then `x` took 3 ms; 5 MB of `é` took 728 ms (NFD cost, linear). No catastrophic backtracking.

## 4. Defects
None against the spec. The following are **spec-level limitations / product questions** (severity Low). The implementation follows plan.md step 6 for all of them, so they are for PM/Tech Lead to decide on and are not dev bugs:

1. **L1 - Punctuation between words merges the words.** `"a.b"` -> `ab`, `"1.5"` -> `15`, `"a/b\\c.d"` -> `abcd`, `"a—b"` (em dash) -> `ab`, `"O'Reilly"` -> `oreilly` (the apostrophe case is fine). Expected by many users: `a-b`, `1-5`, `a-b-c-d`. Repro: `node -e "import('/tmp/dt-test/src/slugify.js').then(m=>console.log(m.slugify('v1.5 / beta')))"` prints `v15-beta`. Cause: `src/slugify.js:25` deletes non-`[a-z0-9-]` characters instead of treating punctuation as a separator.
2. **L2 - Latin letters missing from the transliteration map are silently dropped.** Turkish dotless `ı`: `"Kırmızı"` -> `krmz`. `ħ ŧ ŋ ŀ ĸ` -> `""`. Map is at `src/slugify.js:1`.
3. **L3 - Compatibility forms are stripped, because the code uses NFD rather than NFKD.** `"ﬁne"` -> `ne`, fullwidth `"ｆｕｌｌ"` -> `""`, `"Ǆ"` -> `""`, `"①②"` -> `""`. Switching to `normalize('NFKD')` would map these to ASCII.
4. **L4 (info) - Zero-width space (U+200B) is removed, not used as a separator.** `"a b​c"` -> `a-bc`. This is acceptable behavior.

## 5. Suggested extra test cases (not added: test/ is owned by BE in this run)
- Idempotence: `slugify(slugify(x)) === slugify(x)` over the acceptance inputs.
- Uppercase `ẞ` -> `ss`; uppercase accents `ÉÑÇ` -> `enc`.
- Already-decomposed input `"é"` -> `e`.
- Emoji: `"I 🚀 JS"` -> `i-js`.
- `\r\n` and NBSP as separators.
- Large input (1 MB) finishes in under 1 s, as a ReDoS guard.
- If PM accepts L1/L2/L3, add tests that pin the chosen behavior (`"1.5"`, `"Kırmızı"`, `"ﬁ"`).

## 6. Coverage gaps
None for the stated acceptance criteria. The behavior for punctuation, extra Latin letters and compatibility characters is not specified (see L1-L3).
