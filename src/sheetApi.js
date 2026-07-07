import { SHEET_API_URL } from '../config.js';

export function mapRowToTodo(row) {
  const [id, text, completed] = row;
  return {
    id,
    text: text ?? '',
    completed: String(completed).trim().toUpperCase() === 'TRUE',
  };
}

export async function fetchTodos() {
  const res = await fetch(SHEET_API_URL);
  if (!res.ok) throw new Error('Failed to fetch todos');
  const rows = await res.json();
  return rows.map(mapRowToTodo);
}

export function syncNewTodo(todo) {
  return fetch(SHEET_API_URL, {
    method: 'POST',
    body: JSON.stringify({ type: 'add', ...todo }),
  });
}

export function syncTodoStatus(id, completed) {
  return fetch(SHEET_API_URL, {
    method: 'POST',
    body: JSON.stringify({ type: 'update', id, completed }),
  });
}
