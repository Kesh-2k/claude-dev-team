export const MAX_TITLE = 120;
let todos = [{ id: 1, title: 'First task', done: false }];
export function validateTitle(input) {
  if (input === undefined) return { ok: false, error: 'title is required' };
  if (typeof input !== 'string') return { ok: false, error: 'title must be a string' };
  const title = input.trim();
  if (!title) return { ok: false, error: 'title must not be empty' };
  if (title.length > MAX_TITLE) return { ok: false, error: `title must be at most ${MAX_TITLE} characters` };
  return { ok: true, title };
}
export function listTodos() { return todos; }
export function addTodo(title) {
  const id = todos.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  const todo = { id, title, done: false };
  todos.push(todo);
  return todo;
}
export function resetTodos(seed = [{ id: 1, title: 'First task', done: false }]) {
  todos = seed.map((t) => ({ ...t }));
}
