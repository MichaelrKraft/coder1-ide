import React, { useState } from 'react';

const TestComponent = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Hello from React!');

  const handleIncrement = () => {
    setCount(prev => prev + 1);
    setMessage(`Button clicked ${count + 1} times!`);
  };

  const handleReset = () => {
    setCount(0);
    setMessage('Counter reset!');
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '50px auto',
      padding: '30px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '15px',
      color: 'white',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    }}>
      <h1>🚀 React Live Preview Test</h1>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px 0'
      }}>
        <h2>Counter: {count}</h2>
        <p style={{ fontSize: '18px', margin: '15px 0' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            onClick={handleIncrement}
            style={{
              background: 'linear-gradient(45deg, #ff6b6b, #ffd93d)',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1)'}
          >
            Increment
          </button>
          
          <button 
            onClick={handleReset}
            style={{
              background: 'linear-gradient(45deg, #a8edea, #fed6e3)',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              color: '#333',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1)'}
          >
            Reset
          </button>
        </div>
      </div>
      
      <div style={{
        background: 'rgba(46, 204, 113, 0.2)',
        border: '1px solid #2ecc71',
        padding: '15px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3>✅ React Features Working:</h3>
        <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
          <li>✓ useState Hook</li>
          <li>✓ Event Handlers</li>
          <li>✓ Dynamic Styling</li>
          <li>✓ Component Rendering</li>
          <li>✓ Live Compilation</li>
        </ul>
      </div>
      
      <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '20px' }}>
        Try editing this TSX file in the IDE - changes should auto-refresh!
      </p>
    </div>
  );
};

export default TestComponent;