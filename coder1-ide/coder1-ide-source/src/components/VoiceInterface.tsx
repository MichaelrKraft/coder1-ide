import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceInterface.css';

interface VoiceInterfaceProps {
  onVoiceCommand: (command: string, action: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onVoiceCommand, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [confidence, setConfidence] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
        setStatus('listening');
        setIsListening(true);
        setTranscript('');
        
        // Set timeout for auto-stop
        timeoutRef.current = setTimeout(() => {
          if (recognition && isListening) {
            recognition.stop();
          }
        }, 5000); // 5 second timeout
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0][0];
        const command = result.transcript.toLowerCase().trim();
        const confidence = result.confidence;
        
        console.log('🎤 Voice recognition result:', command, 'confidence:', confidence);
        setTranscript(result.transcript);
        setConfidence(confidence);
        setStatus('processing');
        
        // Process the command
        processVoiceCommand(command);
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('🎤 Voice recognition error:', event.error);
        setStatus('error');
        setIsListening(false);
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Reset status after error
        setTimeout(() => {
          setStatus('idle');
          setTranscript('');
        }, 2000);
      };
      
      recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        setIsListening(false);
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Reset status after processing
        setTimeout(() => {
          setStatus('idle');
          if (status !== 'error') {
            setTranscript('');
          }
        }, 2000);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('🎤 Speech recognition not supported');
      setIsSupported(false);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const processVoiceCommand = useCallback((command: string) => {
    console.log('🔄 Processing voice command:', command);
    
    let action = 'unknown';
    let cleanCommand = command;
    
    // Map voice commands to actions
    if (command.includes('claude') || command.includes('start claude') || command.includes('run claude') || command.includes('open claude')) {
      action = 'run-claude';
      cleanCommand = 'claude';
    } else if (command.startsWith('type ') || command.startsWith('enter ') || command.startsWith('run ')) {
      action = 'terminal-input';
      cleanCommand = command.replace(/^(type|enter|run)\s+/i, '').trim();
    } else if (command.includes('clear terminal') || command === 'clear') {
      action = 'clear-terminal';
      cleanCommand = 'clear';
    } else if (command.includes('help')) {
      action = 'help';
      cleanCommand = 'help';
    } else if (command.includes('sleep mode')) {
      action = 'toggle-sleep';
    } else if (command.includes('supervision')) {
      action = 'toggle-supervision';
    } else if (command.includes('infinite loop') || command.includes('parallel agents')) {
      action = 'toggle-infinite';
    } else if (command.includes('hivemind')) {
      action = 'open-hivemind';
    } else {
      // Try to interpret as a direct terminal command
      const commonCommands = ['ls', 'cd', 'pwd', 'git', 'npm', 'yarn', 'python', 'node', 'cat', 'mkdir', 'rm'];
      const firstWord = command.split(' ')[0].toLowerCase();
      
      if (commonCommands.includes(firstWord)) {
        action = 'terminal-input';
        cleanCommand = command;
      }
    }
    
    console.log('🎯 Command mapped:', { original: command, action, clean: cleanCommand });
    
    // Send command to parent component
    if (onVoiceCommand) {
      onVoiceCommand(cleanCommand, action);
    }
  }, [onVoiceCommand]);

  const startListening = useCallback(() => {
    if (!isSupported || disabled || isListening) {
      return;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('🎤 Failed to start recognition:', error);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
      }
    }
  }, [isSupported, disabled, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Handle push-to-talk interaction
  const handleMouseDown = useCallback(() => {
    startListening();
  }, [startListening]);

  const handleMouseUp = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleMouseLeave = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const getStatusIcon = () => {
    switch (status) {
      case 'listening': return '🎤';
      case 'processing': return '⚡';
      case 'error': return '❌';
      default: return '🎙️';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'error': return 'Error occurred';
      default: return 'Click to speak';
    }
  };

  if (!isSupported) {
    return (
      <div className="voice-interface unsupported">
        <div className="voice-button disabled" title="Speech recognition not supported">
          🚫
        </div>
        <div className="voice-status">Not supported</div>
      </div>
    );
  }

  return (
    <div className="voice-interface">
      <button
        className={`voice-button ${status} ${disabled ? 'disabled' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled || !isSupported}
        title={getStatusText()}
      >
        🎤
      </button>
    </div>
  );
};

export default VoiceInterface;