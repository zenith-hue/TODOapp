import { useEffect, useState } from 'react';
import TodoItem from './TodoItem.jsx';
import { fetchTodos, syncNewTodo, syncTodoStatus } from './sheetApi.js';
import { SHEET_API_URL } from '../config.js';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!SHEET_API_URL) return;
    fetchTodos()
      .then(setTodos)
      .catch(() => setError('할 일을 불러오지 못했습니다.'));
  }, []);

  function markSyncFailed(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, syncFailed: true } : t)));
  }

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const todo = { id: crypto.randomUUID(), text: trimmed, completed: false };
    setTodos((prev) => [...prev, todo]);
    setText('');

    syncNewTodo(todo).catch(() => markSyncFailed(todo.id));
  }

  function handleToggle(id, completed) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    syncTodoStatus(id, completed).catch(() => markSyncFailed(id));
  }

  return (
    <div className="app">
      <h1>TO DO 리스트</h1>
      {error && <p className="error-message">{error}</p>}
      <div className="input-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="할 일을 입력하세요"
        />
        <button onClick={handleAdd}>추가</button>
      </div>
      <ul className="todo-list">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />
        ))}
      </ul>
    </div>
  );
}
