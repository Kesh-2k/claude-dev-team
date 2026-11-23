import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.js';
import { resetTodos } from '../src/todos.js';

let base;
before(async () => { await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { server.closeAllConnections(); server.close(); });
beforeEach(() => resetTodos());

const post = (body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(`${base}/api/todos`, { method: 'POST', headers, body });
const list = async () => (await fetch(`${base}/api/todos`)).json();

test('201 with shape, trimmed, then GET includes it', async () => {
  const res = await post(JSON.stringify({ title: '  Buy milk  ' }));
  assert.equal(res.status, 201);
  assert.match(res.headers.get('content-type'), /^application\/json; charset=utf-8$/);
  assert.deepEqual(await res.json(), { id: 2, title: 'Buy milk', done: false });
  assert.deepEqual((await list()).at(-1), { id: 2, title: 'Buy milk', done: false });
});
test('id/done/extra fields ignored; id = max+1', async () => {
  resetTodos([{ id: 1, title: 'a', done: false }, { id: 5, title: 'b', done: false }]);
  const res = await post(JSON.stringify({ title: 'x', id: 99, done: true, extra: 1 }));
  assert.deepEqual(await res.json(), { id: 6, title: 'x', done: false });
});
test('charset content type accepted', async () => {
  const res = await post('{"title":"x"}', { 'Content-Type': 'Application/JSON; charset=utf-8' });
  assert.equal(res.status, 201);
});
test('title length boundary 120 / 121', async () => {
  assert.equal((await post(JSON.stringify({ title: 'a'.repeat(120) }))).status, 201);
  const res = await post(JSON.stringify({ title: 'a'.repeat(121) }));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'title must be at most 120 characters' });
});
const bad = [
  ['empty body', '', 'Invalid JSON'],
  ['malformed', '{"title":', 'Invalid JSON'],
  ['array', '[]', 'Body must be a JSON object'],
  ['null', 'null', 'Body must be a JSON object'],
  ['string', '"x"', 'Body must be a JSON object'],
  ['missing title', '{}', 'title is required'],
  ['number title', '{"title":123}', 'title must be a string'],
  ['null title', '{"title":null}', 'title must be a string'],
  ['whitespace title', '{"title":"   "}', 'title must not be empty'],
  ['empty title', '{"title":""}', 'title must not be empty'],
];
for (const [name, body, error] of bad) {
  test(`400 ${name}`, async () => {
    const res = await post(body);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error });
    assert.equal((await list()).length, 1);
    assert.equal((await fetch(`${base}/api/todos`)).status, 200);
  });
}
test('415 for wrong or missing content type', async () => {
  for (const headers of [{ 'Content-Type': 'text/plain' }, {}]) {
    const res = await post('{"title":"x"}', headers);
    assert.equal(res.status, 415);
    assert.deepEqual(await res.json(), { error: 'Content-Type must be application/json' });
  }
  assert.equal((await list()).length, 1);
});
test('413 for 2 KB body, server stays up', async () => {
  const res = await post(JSON.stringify({ title: 'x', pad: 'p'.repeat(2048) }));
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { error: 'Request body too large' });
  assert.equal((await list()).length, 1);
  assert.equal((await fetch(`${base}/`)).status, 200);
});
test('GET / and GET /api/todos still work', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  await res.text();
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});
