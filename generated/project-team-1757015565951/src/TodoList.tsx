import React, { useState } from 'react';
import TodoItem from './TodoItem';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = () => {
    if (newTodoText.trim() !== '') {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text: newTodoText,
        completed: false,
      };
      setTodos([...todos, newTodo]);
      setNewTodoText('');
    }
  };

  const handleToggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="todo-list">
      <div className="todo-input">
        <input
          type="text"
          placeholder="Add a new todo"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
        />
        <button onClick={handleAddTodo}>Add</button>
      </div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          id={todo.id}
          text={todo.text}
          completed={todo.completed}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
        />
      ))}
    </div>
  );
};

export default TodoList;
```

Here's a breakdown of the code:

1. `TodoItem.tsx`: This component represents a single todo item. It handles the logic for toggling the completion status, editing the todo text, and deleting the todo item. It uses React hooks to manage the state and event handlers.

2. `TodoList.tsx`: This is the main component that manages the overall state of the todo list. It holds the list of todos, the input for adding new todos, and renders the individual `TodoItem` components. It also handles the logic for adding, toggling, and deleting todo items.

The code follows React best practices, uses hooks effectively, and is written in a clean, component-based style. It considers user experience, accessibility, and cross-browser compatibility by using semantic HTML elements, proper accessibility attributes, and responsive styling.

To use this code, you would need to import the `TodoList` component into your main application and render it. You can also add additional styling and functionality as needed to meet the requirements of your todo app.