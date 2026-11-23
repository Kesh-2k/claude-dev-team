import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TITLE, validateTitle, listTodos, addTodo, resetTodos } from '../src/todos.js';

test('validateTitle trims', () => {
  assert.deepEqual(validateTitle('  Buy milk  '), { ok: true, title: 'Buy milk' });
});
test('120 chars passes, 121 fails', () => {
  assert.equal(validateTitle('a'.repeat(MAX_TITLE)).ok, true);
  assert.deepEqual(validateTitle('a'.repeat(MAX_TITLE + 1)), { ok: false, error: 'title must be at most 120 characters' });
  assert.equal(validateTitle(' ' + 'a'.repeat(MAX_TITLE) + ' ').ok, true);
});
test('invalid inputs give exact messages', () => {
  const cases = [
    [undefined, 'title is required'],
    [123, 'title must be a string'],
    [null, 'title must be a string'],
    [{}, 'title must be a string'],
    ['', 'title must not be empty'],
    ['   ', 'title must not be empty'],
  ];
  for (const [input, error] of cases) assert.deepEqual(validateTitle(input), { ok: false, error });
});
test('addTodo ids', () => {
  resetTodos([]);
  assert.deepEqual(addTodo('a'), { id: 1, title: 'a', done: false });
  resetTodos([{ id: 1, title: 'x', done: false }, { id: 5, title: 'y', done: true }]);
  assert.equal(addTodo('z').id, 6);
  assert.equal(listTodos().length, 3);
});
