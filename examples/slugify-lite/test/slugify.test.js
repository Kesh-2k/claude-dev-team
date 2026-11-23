import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slugify.js';
import { slugify as slugifyFromIndex, hello } from '../src/index.js';

const cases = [
  ['Hello World', 'hello-world'],
  ['Ação é Ótima!', 'acao-e-otima'],
  ['Crème Brûlée', 'creme-brulee'],
  ['  multiple   spaces  ', 'multiple-spaces'],
  ['a--b__c', 'a-b-c'],
  ['Straße', 'strasse'],
  ['Æsir Œuvre Øre', 'aesir-oeuvre-ore'],
  ['Top 10 Tips 2024', 'top-10-tips-2024'],
  ['a & b', 'a-b'],
  ['-_-Hello-_-', 'hello'],
  ['tab\tand\nnewline', 'tab-and-newline'],
  ['', ''],
  ['!!!@@@', ''],
  ['日本語', ''],
];

for (const [input, expected] of cases) {
  test(`slugify(${JSON.stringify(input)}) -> ${JSON.stringify(expected)}`, () => {
    assert.equal(slugify(input), expected);
  });
}

for (const input of [null, undefined, 42, {}]) {
  test(`slugify throws TypeError for ${String(input)}`, () => {
    assert.throws(() => slugify(input), TypeError);
  });
}

test('slugify is re-exported from src/index.js and hello is unchanged', () => {
  assert.equal(slugifyFromIndex, slugify);
  assert.equal(slugifyFromIndex('Hello World'), 'hello-world');
  assert.equal(hello('Ana'), 'Hello, Ana');
});
