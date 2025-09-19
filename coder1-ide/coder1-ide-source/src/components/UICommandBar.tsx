import React, { useState } from 'react';
import { generateBasicComponent } from '../services/ComponentGenerator';
import './UICommandBar.css';

const UICommandBar: React.FC = () => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) return;
    
    // Parse the command
    const parts = command.trim().split(' ');
    
    if (parts[0] === 'create' || (parts[0] === '/ui' && parts[1] === 'create')) {
      const description = parts[0] === 'create' 
        ? parts.slice(1).join(' ')
        : parts.slice(2).join(' ');
      
      if (!description) {
        setMessage('❌ Error: Component description required');
        return;
      }
      
      setIsProcessing(true);
      setMessage(`🎨 Generating component: "${description}"...`);
      
      try {
        // Generate the component
        const component = await generateBasicComponent(description);
        
        // Send to Preview via postMessage
        window.postMessage({
          type: 'UI_COMPONENT_GENERATED',
          component: component
        }, '*');
        
        setMessage(`✅ Component generated: ${component.name}`);
        setCommand(''); // Clear input on success
      } catch (error: any) {
        setMessage(`❌ Error: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else if (parts[0] === 'help' || (parts[0] === '/ui' && parts[1] === 'help')) {
      setMessage('Available commands: create <description> | help | version');
    } else if (parts[0] === 'version' || (parts[0] === '/ui' && parts[1] === 'version')) {
      setMessage('Preview Enhancement v1.0.0 - Phase 1');
    } else {
      setMessage(`❌ Unknown command: ${parts[0]}`);
    }
  };

  return (
    <div className="ui-command-bar">
      <form onSubmit={handleSubmit}>
        <div className="command-input-group">
          <span className="command-prefix">/ui</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="create button | create card | help"
            disabled={isProcessing}
            className="command-input"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={isProcessing || !command.trim()}
            className="command-submit"
          >
            {isProcessing ? '⟳' : '▶'}
          </button>
        </div>
      </form>
      {message && (
        <div className={`command-message ${message.startsWith('✅') ? 'success' : message.startsWith('❌') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UICommandBar;