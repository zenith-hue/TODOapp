import { SHEET_API_URL } from './config.js';

export function mapRowToTodo(row) {
  const [id, text, completed] = row;
  return {
    id,
    text: text ?? '',
    completed: String(completed).trim().toUpperCase() === 'TRUE',
  };
}

export function renderTodo(todo, onToggle) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  if (todo.completed) li.classList.add('completed');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => {
    li.classList.toggle('completed', checkbox.checked);
    if (onToggle) {
      Promise.resolve(onToggle(todo.id, checkbox.checked)).catch(() => {
        li.classList.add('sync-failed');
      });
    }
  });

  const span = document.createElement('span');
  span.textContent = todo.text;

  li.appendChild(checkbox);
  li.appendChild(span);
  return li;
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

export function addTodo(inputEl, listEl) {
  const text = inputEl.value.trim();
  if (!text) return;

  const todo = { id: crypto.randomUUID(), text, completed: false };
  const li = renderTodo(todo, syncTodoStatus);
  listEl.appendChild(li);

  syncNewTodo(todo).catch(() => {
    li.classList.add('sync-failed');
  });

  inputEl.value = '';
  inputEl.focus();
}

export async function loadTodos(listEl, errorEl) {
  try {
    const res = await fetch(SHEET_API_URL);
    if (!res.ok) throw new Error('Failed to fetch todos');
    const rows = await res.json();
    rows.map(mapRowToTodo).forEach((todo) => {
      listEl.appendChild(renderTodo(todo, syncTodoStatus));
    });
  } catch {
    if (errorEl) {
      errorEl.textContent = '할 일을 불러오지 못했습니다.';
      errorEl.hidden = false;
    }
  }
}

const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('todo-list');
const errorMessage = document.getElementById('error-message');

if (input && addBtn && list) {
  addBtn.addEventListener('click', () => addTodo(input, list));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo(input, list);
  });
  if (SHEET_API_URL) {
    loadTodos(list, errorMessage);
  }
}
