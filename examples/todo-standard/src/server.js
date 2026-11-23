import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { validateTitle, listTodos, addTodo } from './todos.js';
const MAX_BODY = 1024;
const sendJson = (res, status, obj, extra = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(JSON.stringify(obj));
};
const tooLarge = (res) => sendJson(res, 413, { error: 'Request body too large' }, { Connection: 'close' });
// Resolves to the body string, or null when the limit is exceeded.
async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function postTodo(req, res) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return sendJson(res, 415, { error: 'Content-Type must be application/json' });
  const raw = await readBody(req, MAX_BODY);
  if (raw === null) return tooLarge(res);
  let body;
  try { body = JSON.parse(raw); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return sendJson(res, 400, { error: 'Body must be a JSON object' });
  const v = validateTitle(body.title);
  if (!v.ok) return sendJson(res, 400, { error: v.error });
  sendJson(res, 201, addTodo(v.title));
}
export const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/todos' && req.method === 'GET') return sendJson(res, 200, listTodos());
    if (req.url === '/api/todos' && req.method === 'POST') return await postTodo(req, res);
    if (req.url === '/' ) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(await readFile(new URL('../web/index.html', import.meta.url))); }
    res.writeHead(404); res.end();
  } catch (err) {
    console.error(err.stack);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
    else res.end();
  }
});
if (process.argv[1] === new URL(import.meta.url).pathname) server.listen(3000);
