import React from 'react';
import { Calculator } from './components/Calculator';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <Calculator />
      </div>
    </ThemeProvider>
  );
}

export default App;