const handleAddTodo = () => {
    if (inputValue.trim() !== '') {
      onAddTodo(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="todo-input">
      <input
        type="text"
        placeholder="Add a new todo"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleAddTodo();
          }
        }}
      />
      <button onClick={handleAddTodo}>Add</button>
    </div>
  );
};

// TodoItem component
const TodoItem: React.FC<{
  todo: Todo;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}> = ({ todo, onToggleTodo, onDeleteTodo }) => {
  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="todo-content">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggleTodo(todo.id)}
        />
        <span>{todo.title}</span>
      </div>
      <button className="delete-btn" onClick={() => onDeleteTodo(todo.id)}>
        Delete
      </button>
    </div>
  );
};

// TodoList component
const TodoList: React.FC<{
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}> = ({ todos, onToggleTodo, onDeleteTodo }) => {
  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
        />
      ))}
    </div>
  );
};

// App component
const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    // Load todos from local storage on initial render