import React, { useState } from 'react';
import { Button } from './components/Button';

/**
 * Main Application Component
 * 
 * This is a simple example demonstrating:
 * - React functional components
 * - TypeScript types
 * - State management with hooks
 * - Component composition
 */
function App() {
  // State to track button clicks
  const [clickCount, setClickCount] = useState<number>(0);
  const [message, setMessage] = useState<string>('Welcome to Coder1 IDE!');

  // Event handler for button clicks
  const handleClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // Update message based on click count
    if (newCount === 1) {
      setMessage('Great! You clicked the button!');
    } else if (newCount === 5) {
      setMessage('Wow, 5 clicks! You\'re getting the hang of it!');
    } else if (newCount === 10) {
      setMessage('10 clicks! You\'re a natural! 🎉');
    } else if (newCount > 10) {
      setMessage(`${newCount} clicks and counting! Keep going!`);
    } else {
      setMessage(`You've clicked ${newCount} times!`);
    }
  };

  // Reset handler
  const handleReset = () => {
    setClickCount(0);
    setMessage('Welcome to Coder1 IDE!');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 Coder1 IDE Demo App</h1>
        <p style={styles.subtitle}>
          A simple React + TypeScript example
        </p>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.message}>{message}</h2>
          
          <div style={styles.counter}>
            <span style={styles.counterLabel}>Click Count:</span>
            <span style={styles.counterValue}>{clickCount}</span>
          </div>

          <div style={styles.buttonGroup}>
            <Button 
              onClick={handleClick}
              variant="primary"
            >
              Click Me!
            </Button>
            
            <Button 
              onClick={handleReset}
              variant="secondary"
              disabled={clickCount === 0}
            >
              Reset
            </Button>
          </div>

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>💡 What's Happening Here?</h3>
            <ul style={styles.infoList}>
              <li><strong>State Management</strong>: Using React's useState hook</li>
              <li><strong>Event Handling</strong>: Button clicks update state</li>
              <li><strong>Component Props</strong>: Passing data to Button component</li>
              <li><strong>Type Safety</strong>: TypeScript ensures correct types</li>
            </ul>
          </div>
        </div>

        <div style={styles.tips}>
          <h3 style={styles.tipsTitle}>🎯 Try This:</h3>
          <ol style={styles.tipsList}>
            <li>Click the button and watch the message change</li>
            <li>Try clicking 5 times, then 10 times</li>
            <li>Look at the component code to see how it works</li>
            <li>Modify the messages or add new features</li>
            <li>Ask Claude Code for help if you get stuck!</li>
          </ol>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>Built with React + TypeScript in Coder1 IDE</p>
      </footer>
    </div>
  );
}

// Inline styles (in a real project, you might use CSS modules or styled-components)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f1419',
    color: '#c5d1d8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
  } as React.CSSProperties,
  
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  } as React.CSSProperties,
  
  title: {
    fontSize: '3rem',
    margin: '0 0 10px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  
  subtitle: {
    fontSize: '1.2rem',
    color: '#8b98a5',
    margin: 0,
  } as React.CSSProperties,
  
  main: {
    maxWidth: '800px',
    margin: '0 auto',
  } as React.CSSProperties,
  
  card: {
    backgroundColor: '#1a2332',
    borderRadius: '12px',
    padding: '40px',
    marginBottom: '30px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  
  message: {
    fontSize: '1.8rem',
    textAlign: 'center' as const,
    marginBottom: '30px',
    color: '#00d9ff',
  } as React.CSSProperties,
  
  counter: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  } as React.CSSProperties,
  
  counterLabel: {
    fontSize: '1.2rem',
    marginRight: '15px',
    color: '#8b98a5',
  } as React.CSSProperties,
  
  counterValue: {
    fontSize: '2.5rem',
    fontWeight: 'bold' as const,
    color: '#00d9ff',
  } as React.CSSProperties,
  
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '40px',
  } as React.CSSProperties,
  
  infoBox: {
    backgroundColor: '#0f1419',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  
  infoTitle: {
    fontSize: '1.2rem',
    marginTop: 0,
    marginBottom: '15px',
    color: '#00d9ff',
  } as React.CSSProperties,
  
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: '1.8',
  } as React.CSSProperties,
  
  tips: {
    backgroundColor: '#1a2332',
    borderRadius: '12px',
    padding: '30px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  
  tipsTitle: {
    fontSize: '1.5rem',
    marginTop: 0,
    marginBottom: '20px',
    color: '#00d9ff',
  } as React.CSSProperties,
  
  tipsList: {
    margin: 0,
    paddingLeft: '25px',
    lineHeight: '2',
    fontSize: '1.1rem',
  } as React.CSSProperties,
  
  footer: {
    textAlign: 'center' as const,
    marginTop: '60px',
    color: '#8b98a5',
    fontSize: '0.9rem',
  } as React.CSSProperties,
};

export default App;
