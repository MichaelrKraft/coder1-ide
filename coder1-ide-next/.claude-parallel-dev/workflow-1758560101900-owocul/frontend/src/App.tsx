import React from 'react';
import { Calculator } from './components/Calculator';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>React Calculator</h1>
        <p>Use your keyboard or click buttons to calculate</p>
      </header>
      <main>
        <Calculator />
      </main>
      <footer className="app-footer">
        <p>
          <kbd>0-9</kbd> Numbers • <kbd>+−×÷</kbd> Operations • <kbd>=</kbd> or <kbd>Enter</kbd> Calculate • 
          <kbd>C</kbd> Clear Entry • <kbd>Esc</kbd> Clear All
        </p>
      </footer>
    </div>
  );
}

export default App;