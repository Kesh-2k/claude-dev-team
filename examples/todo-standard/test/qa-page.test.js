import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { server } from '../src/server.js';

let port, html, script;
before(async () => {
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);
  html = await res.text();
  script = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
});
after(() => { server.closeAllConnections(); server.close(); });

test('served page equals web/index.html', async () => {
  assert.equal(html, await readFile(new URL('../web/index.html', import.meta.url), 'utf8'));
});

test('M2.1 markup contract', () => {
  assert.match(html, /<form[^>]*id="add-form"/);
  assert.match(html, /<label[^>]*for="title"[^>]*>\s*New todo\s*<\/label>/);
  assert.match(html, /<input[^>]*id="title"/);
  assert.match(html, /<button[^>]*id="add-btn"[^>]*type="submit"|<button[^>]*type="submit"[^>]*id="add-btn"/);
  assert.match(html, /<p[^>]*id="error"[^>]*role="alert"|<p[^>]*role="alert"[^>]*id="error"/);
  assert.match(html, /<ul[^>]*id="list"/);
});

test('M2.4/S1.1 novalidate, no required, maxlength, autocomplete off', () => {
  assert.match(html.match(/<form[^>]*>/)[0], /novalidate/);
  const input = html.match(/<input[^>]*>/)[0];
  assert.doesNotMatch(input, /\brequired\b/);
  assert.match(input, /maxlength="120"/);
  assert.match(input, /autocomplete="off"/);
  assert.match(script, /Enter a title\./);
});

test('M3.1/M3.5 no HTML injection sinks, textContent used', () => {
  for (const sink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(']) assert.ok(!script.includes(sink), sink);
  assert.match(script, /li\.textContent\s*=\s*todo\.title/);
  assert.match(script, /errorEl\.textContent\s*=\s*msg/);
});

test('S1.2 in-flight guard, button disabled and restored in finally', () => {
  assert.match(script, /if \(busy\) return/);
  assert.match(script, /btn\.disabled = true/);
  assert.match(script, /Adding\.\.\./);
  assert.match(script, /finally\s*\{[\s\S]*btn\.disabled = false/);
});

test('M2.5/M2.7 error copy present', () => {
  assert.match(script, /Could not reach the server\. Check your connection and try again\./);
  assert.match(script, /Could not add the todo\. Try again\./);
});
