import React from 'react';
import './App.css';
import TodoList from './components/TodoList';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>📝 Todo App</h1>
        <p>Built by AI Team - crud-with-ui workflow</p>
      </header>
      <main>
        <TodoList />
      </main>
    </div>
  );
}

export default App;
