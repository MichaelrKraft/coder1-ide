const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="app">
      <h1>Todo App</h1>
      <TodoInput onAddTodo={addTodo} />
      <TodoList todos={todos} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} />
    </div>
  );
};

export default App;
```

Here's a breakdown of the code:

1. **Interfaces**: We define an interface `Todo` to represent a single todo item, with properties for `id`, `title`, and `completed`.

2. **TodoInput Component**: This component handles the input field and the "Add" button for creating new todo items. It uses the `useState` hook to manage the input value and calls the `onAddTodo` callback function when the user presses the "Enter" key or clicks the "Add" button.

3. **TodoItem Component**: This component represents a single todo item. It displays the todo title, a checkbox to mark the todo as completed, and a "Delete" button. It calls the `onToggleTodo` and `onDeleteTodo` callback functions when the user interacts with the todo item.

4. **TodoList Component**: This component renders a list of `TodoItem` components, passing the necessary props to each one.

5. **App Component**: This is the main component that manages the overall state of the todo app. It uses the `useState` hook to store the list of todos and the `useEffect` hook to load and save the todos to/from local storage.

   - The `addTodo` function creates a new todo item and adds it to the list of todos.
   - The `toggleTodo` function updates the `completed` status of a todo item.
   - The `deleteTodo` function removes a todo item from the list.

The app follows best practices for React development, including the use of functional components, hooks, and TypeScript for type safety. It also considers user experience by providing a simple and intuitive interface, and accessibility by ensuring that the todo items can be interacted with using a keyboard.