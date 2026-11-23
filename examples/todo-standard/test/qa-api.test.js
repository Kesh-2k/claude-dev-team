import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { server } from '../src/server.js';
import { resetTodos } from '../src/todos.js';

let port;
before(async () => { await new Promise((r) => server.listen(0, r)); port = server.address().port; });
after(() => { server.closeAllConnections(); server.close(); });
beforeEach(() => resetTodos());

const url = (p = '/api/todos') => `http://127.0.0.1:${port}${p}`;
const post = (body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(url(), { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
const list = async () => (await fetch(url())).json();
const rawReq = (opts, chunks = [], method = 'POST') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: '/api/todos', method, agent: false, ...opts }, (res) => {
    const bufs = [];
    res.on('data', (d) => bufs.push(d));
    res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(bufs).toString('utf8'), headers: res.headers }));
  });
  req.on('error', reject);
  for (const c of chunks) req.write(c);
  req.end();
});
async function expectErr(res, status, msg) {
  assert.equal(res.status, status);
  assert.deepEqual(await res.json(), { error: msg });
}

test('M1.1/M1.2 create trims, exact shape, appears in list', async () => {
  const res = await post({ title: '  Buy milk  ' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await res.json(), { id: 2, title: 'Buy milk', done: false });
  const l = await list();
  assert.equal(l.length, 2);
  assert.equal(l[0].title, 'First task');
  assert.deepEqual(l[1], { id: 2, title: 'Buy milk', done: false });
});

test('M1.3 ids: max+1, empty list gives 1, client id ignored', async () => {
  resetTodos([{ id: 1, title: 'a', done: false }, { id: 5, title: 'b', done: false }]);
  assert.equal((await (await post({ title: 'x' })).json()).id, 6);
  resetTodos([]);
  assert.equal((await (await post({ title: 'x' })).json()).id, 1);
  const r = await (await post({ title: 'x', id: 999 })).json();
  assert.equal(r.id, 2);
});

test('M1.7 id/done/extra ignored', async () => {
  const res = await post({ title: 'a', id: 99, done: true, extra: 1 });
  assert.equal(res.status, 201);
  const b = await res.json();
  assert.deepEqual(Object.keys(b).sort(), ['done', 'id', 'title']);
  assert.equal(b.done, false);
  for (const t of await list()) assert.ok(!('extra' in t));
});

test('M1.4 length limits (UTF-16 units, after trim)', async () => {
  assert.equal((await post({ title: 'a'.repeat(120) })).status, 201);
  assert.equal((await post({ title: '  ' + 'a'.repeat(120) + '  ' })).status, 201);
  const n = (await list()).length;
  await expectErr(await post({ title: 'a'.repeat(121) }), 400, 'title must be at most 120 characters');
  assert.equal((await list()).length, n);
  const emoji = '😀'.repeat(60);
  const ok = await post({ title: emoji });
  assert.equal(ok.status, 201);
  assert.equal((await ok.json()).title, emoji);
  assert.ok((await list()).some((t) => t.title === emoji));
  await expectErr(await post({ title: '😀'.repeat(61) }), 400, 'title must be at most 120 characters');
  const e = 'é'.repeat(120);
  assert.equal((await (await post({ title: e })).json()).title, e);
});

test('M1.5 invalid titles -> 400, list unchanged', async () => {
  const n = (await list()).length;
  for (const t of ['', '   ', '\t\n', ' ']) await expectErr(await post({ title: t }), 400, 'title must not be empty');
  await expectErr(await post({}), 400, 'title is required');
  for (const t of [123, null, true, {}, []]) await expectErr(await post({ title: t }), 400, 'title must be a string');
  assert.equal((await list()).length, n);
});

test('M1.6 malformed / empty / non-object bodies', async () => {
  const n = (await list()).length;
  for (const b of ['{"title":', 'hello', '']) await expectErr(await post(b), 400, 'Invalid JSON');
  for (const b of ['[]', 'null', '"x"', '5']) await expectErr(await post(b), 400, 'Body must be a JSON object');
  assert.equal((await list()).length, n);
});

test('M1.8 content-type handling', async () => {
  const msg = 'Content-Type must be application/json';
  const raw = await rawReq({}, ['{"title":"a"}']);
  assert.equal(raw.status, 415);
  assert.deepEqual(JSON.parse(raw.body), { error: msg });
  await expectErr(await post('{"title":"a"}', { 'Content-Type': 'text/plain' }), 415, msg);
  await expectErr(await post('title=a', { 'Content-Type': 'application/x-www-form-urlencoded' }), 415, msg);
  assert.equal((await post('{"title":"a"}', { 'Content-Type': 'APPLICATION/JSON; charset=utf-8' })).status, 201);
});

test('M1.9 body size limits', async () => {
  const n = (await list()).length;
  const big = JSON.stringify({ title: 'a', pad: 'x'.repeat(2000) });
  await expectErr(await post(big), 413, 'Request body too large');
  // chunked, no content-length
  const chunked = await rawReq({ headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } },
    [big.slice(0, 700), big.slice(700, 1400), big.slice(1400)]);
  assert.equal(chunked.status, 413);
  assert.deepEqual(JSON.parse(chunked.body), { error: 'Request body too large' });
  // boundary
  const base = '{"title":"a"}';
  const at = base + ' '.repeat(1024 - base.length);
  assert.equal(Buffer.byteLength(at), 1024);
  assert.equal((await post(at)).status, 201);
  assert.equal((await post(at + ' ')).status, 413);
  // multibyte: < 1024 chars, > 1024 bytes
  const mb = JSON.stringify({ title: 'a', pad: 'é'.repeat(600) });
  assert.ok(mb.length < 1024 && Buffer.byteLength(mb) > 1024);
  assert.equal((await post(mb)).status, 413);
  assert.equal((await list()).length, n + 1);
});

test('M1.10 415 wins over 413', async () => {
  const res = await post('x'.repeat(3000), { 'Content-Type': 'text/plain' });
  await expectErr(res, 415, 'Content-Type must be application/json');
});

test('M1.12 concurrent POSTs give unique consecutive ids', async () => {
  const rs = await Promise.all(Array.from({ length: 20 }, () => post({ title: 'same' })));
  assert.ok(rs.every((r) => r.status === 201));
  const ids = (await Promise.all(rs.map((r) => r.json()))).map((b) => b.id).sort((a, b) => a - b);
  assert.deepEqual(ids, Array.from({ length: 20 }, (_, i) => i + 2));
  assert.equal((await list()).length, 21);
});

test('M1.13 chunked body split mid multibyte char', async () => {
  const buf = Buffer.from(JSON.stringify({ title: 'a😀b' }));
  const i = buf.indexOf(0xf0) + 2;
  const r = await rawReq({ headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, [buf.subarray(0, i), buf.subarray(i)]);
  assert.equal(r.status, 201);
  assert.equal(JSON.parse(r.body).title, 'a😀b');
});

test('M1.14 unsupported routes do not 500', async () => {
  for (const [m, p] of [['PUT', '/api/todos'], ['DELETE', '/api/todos'], ['POST', '/api/unknown'], ['GET', '/nope']]) {
    const res = await fetch(url(p), { method: m });
    assert.ok([404, 405].includes(res.status), `${m} ${p} -> ${res.status}`);
  }
  assert.equal((await fetch(url())).status, 200);
});

test('M1.15 GET shape', async () => {
  const res = await fetch(url());
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^application\/json/);
  const l = await res.json();
  assert.ok(Array.isArray(l));
  for (const t of l) assert.deepEqual(Object.keys(t).sort(), ['done', 'id', 'title']);
});

test('M3.2 XSS payloads stored and returned raw', async () => {
  for (const title of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', `& < > " ' </li>`]) {
    const res = await post({ title });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).title, title);
    assert.ok((await list()).some((t) => t.title === title));
  }
});
