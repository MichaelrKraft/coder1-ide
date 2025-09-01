import { useState, useEffect } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Load todos from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      setTodos(JSON.parse(saved));
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text: string) => {
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
    setTodos(prev => [...prev, newTodoItem]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  return {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    newTodo,
    setNewTodo,
  };
};
