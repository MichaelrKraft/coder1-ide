import React, { useState, useEffect } from 'react';
import TodoItem from './TodoItem';
import AddTodo from './AddTodo';
import './TodoApp.css';

const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  // Load todos from localStorage on component mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // Add new todo
  const addTodo = (text) => {
    const newTodo = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    };
    setTodos([...todos, newTodo]);
  };

  // Toggle todo completion
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  // Delete todo
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Edit todo text
  const editTodo = (id, newText) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, text: newText.trim() } : todo
    ));
  };

  // Clear all completed todos
  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  // Toggle all todos
  const toggleAll = () => {
    const allCompleted = todos.every(todo => todo.completed);
    setTodos(todos.map(todo => ({ ...todo, completed: !allCompleted })));
  };

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true; // 'all'
  });

  // Calculate statistics
  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;

  return (
    <div className="todo-app">
      <header className="header">
        <h1>todos</h1>
        <AddTodo onAdd={addTodo} />
      </header>

      {todos.length > 0 && (
        <main className="main">
          <div className="toggle-all-container">
            <input
              id="toggle-all"
              className="toggle-all"
              type="checkbox"
              checked={todos.length > 0 && activeCount === 0}
              onChange={toggleAll}
            />
            <label htmlFor="toggle-all">Mark all as complete</label>
          </div>
          
          <ul className="todo-list">
            {filteredTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEdit={editTodo}
              />
            ))}
          </ul>
        </main>
      )}

      {todos.length > 0 && (
        <footer className="footer">
          <span className="todo-count">
            <strong>{activeCount}</strong> {activeCount === 1 ? 'item' : 'items'} left
          </span>
          
          <ul className="filters">
            <li>
              <button
                className={filter === 'all' ? 'selected' : ''}
                onClick={() => setFilter('all')}
              >
                All
              </button>
            </li>
            <li>
              <button
                className={filter === 'active' ? 'selected' : ''}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
            </li>
            <li>
              <button
                className={filter === 'completed' ? 'selected' : ''}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
            </li>
          </ul>

          {completedCount > 0 && (
            <button className="clear-completed" onClick={clearCompleted}>
              Clear completed ({completedCount})
            </button>
          )}
        </footer>
      )}

      {todos.length === 0 && (
        <div className="empty-state">
          <p>No todos yet. Add one above!</p>
        </div>
      )}
    </div>
  );
};

export default TodoApp;