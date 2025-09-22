import React from 'react';
import { Calculator } from './components/Calculator/Calculator';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React Calculator</h1>
        <Calculator />
      </header>
    </div>
  );
}

export default App;