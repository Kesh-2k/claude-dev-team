import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');

test('no unsafe HTML sinks', () => {
  for (const s of ['innerHTML', 'outerHTML', 'insertAdjacentHTML']) assert.ok(!html.includes(s), s);
  assert.ok(html.includes('textContent'));
});

test('form markup contract', () => {
  assert.match(html, /<form id="add-form"[^>]*\bnovalidate\b/);
  assert.match(html, /<label for="title">New todo<\/label>/);
  assert.match(html, /<input[^>]*id="title"[^>]*maxlength="120"/);
  assert.match(html, /<input[^>]*aria-describedby="error"/);
  assert.match(html, /<button id="add-btn" type="submit">/);
  assert.match(html, /<p id="error" role="alert"/);
  assert.match(html, /<ul id="list">/);
});

test('no required attribute', () => {
  assert.doesNotMatch(html, /<[^>]*\brequired\b[^>]*>/);
});
