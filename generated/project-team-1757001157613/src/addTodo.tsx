const addTodo = () => {
    if (newTodoTitle.trim() !== '') {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        title: newTodoTitle,
        completed: false,
      };
      setTodos([...todos, newTodo]);
      setNewTodoTitle('');
    }
  };

  // Toggle the completion status of a Todo item