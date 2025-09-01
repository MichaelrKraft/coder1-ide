import React from 'react';
import { useTodos } from '../hooks/useTodos';
import TodoItem from './TodoItem';

const TodoList: React.FC = () => {
  const { todos, addTodo, toggleTodo, deleteTodo, newTodo, setNewTodo } = useTodos();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodo(newTodo);
    }
  };

  return (
    <div className="todo-list">
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="todo-input"
        />
        <button type="submit" className="add-button">
          Add Todo
        </button>
      </form>

      <div className="todos">
        {todos.length === 0 ? (
          <p className="empty-state">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TodoList;
