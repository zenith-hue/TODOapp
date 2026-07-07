export default function TodoItem({ todo, onToggle }) {
  const className = [todo.completed && 'completed', todo.syncFailed && 'sync-failed']
    .filter(Boolean)
    .join(' ');

  return (
    <li className={className}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
      />
      <span>{todo.text}</span>
    </li>
  );
}
