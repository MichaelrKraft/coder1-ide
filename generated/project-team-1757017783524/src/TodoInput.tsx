Sure, here's an example of a simple Todo app built with React, TypeScript, and modern web development practices:

```tsx
import React, { useState, useEffect } from 'react';

// Interface for a Todo item
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

// TodoInput component
const TodoInput: React.FC<{
  onAddTodo: (title: string) => void;
}> = ({ onAddTodo }) => {
  const [inputValue, setInputValue] = useState('');