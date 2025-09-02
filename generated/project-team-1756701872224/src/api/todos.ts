// Todo API - Future backend integration
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Mock API for now - replace with real backend calls
export const todoApi = {
  async fetchTodos(): Promise<Todo[]> {
    // Simulate API call
    return JSON.parse(localStorage.getItem('todos') || '[]');
  },

  async createTodo(text: string): Promise<Todo> {
    const todo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date(),
    };
    
    const todos = await this.fetchTodos();
    todos.push(todo);
    localStorage.setItem('todos', JSON.stringify(todos));
    
    return todo;
  },

  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    const todos = await this.fetchTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Todo not found');
    
    todos[index] = { ...todos[index], ...updates, updatedAt: new Date() };
    localStorage.setItem('todos', JSON.stringify(todos));
    
    return todos[index];
  },

  async deleteTodo(id: string): Promise<void> {
    const todos = await this.fetchTodos();
    const filtered = todos.filter(t => t.id !== id);
    localStorage.setItem('todos', JSON.stringify(filtered));
  }
};
