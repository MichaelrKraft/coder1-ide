class VoiceInterface {
    constructor() {
        this.isListening = false;
        this.isRecording = false;
        this.sessionId = null;
        this.socket = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recognition = null;
        this.audioContext = null;
        this.analyser = null;
        this.waveformCanvas = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize Socket.IO
            if (typeof io !== 'undefined') {
                this.socket = io();
                this.setupSocketListeners();
            }

            // Create voice session
            await this.createSession();

            // Setup Web Audio API for visualization
            this.setupAudioVisualization();

            // Setup speech recognition if available
            this.setupSpeechRecognition();

            console.log('Voice interface initialized successfully');
        } catch (error) {
            console.error('Voice interface initialization failed:', error);
        }
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to voice server');
            if (this.sessionId) {
                this.socket.emit('voice:join_session', { sessionId: this.sessionId });
            }
        });

        this.socket.on('voice:session_joined', (data) => {
            console.log('Joined voice session:', data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from voice server');
        });
    }

    async createSession() {
        try {
            const response = await fetch('/api/voice/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'web_user' })
            });

            if (response.ok) {
                const data = await response.json();
                this.sessionId = data.sessionId;
                console.log('Voice session created:', this.sessionId);
            }
        } catch (error) {
            console.error('Failed to create voice session:', error);
        }
    }

    setupSpeechRecognition() {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.updateUI('listening');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Speech recognized:', transcript);
                this.processVoiceInput(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateUI('idle');
            };

            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                this.updateUI('idle');
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    setupAudioVisualization() {
        this.waveformCanvas = document.getElementById('voiceWaveform');
        if (this.waveformCanvas) {
            this.canvasContext = this.waveformCanvas.getContext('2d');
        }
    }

    async startListening() {
        if (!this.recognition) {
            console.error('Speech recognition not available');
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        try {
            this.isListening = true;
            this.recognition.start();
            this.updateUI('listening');
        } catch (error) {
            console.error('Failed to start listening:', error);
            this.isListening = false;
            this.updateUI('idle');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
        this.updateUI('idle');
    }

    async processVoiceInput(text) {
        try {
            this.updateUI('processing');
            this.displayTranscript(text);

            // Send to voice processing API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('sessionId', this.sessionId);

            // For now, we'll process commands directly since we don't have audio file
            const response = await this.processTextCommand(text);
            
            if (response.success) {
                await this.handleCommandResponse(response);
            }

        } catch (error) {
            console.error('Voice processing error:', error);
            this.showNotification('Voice processing failed', 'error');
            this.updateUI('error');
        }
    }

    async processTextCommand(text) {
        // Process the text locally first (since we're using browser speech recognition)
        const lowerText = text.toLowerCase();
        
        // Navigation commands
        if (lowerText.includes('open ide') || lowerText.includes('launch ide') || lowerText.includes('enter ide')) {
            return { success: true, action: 'navigate', target: '/ide', message: 'Opening Coder1 IDE with Smart PRD Generator...' };
        }
        
        if (lowerText.includes('go home') || lowerText.includes('back to home') || lowerText.includes('homepage')) {
            return { success: true, action: 'navigate', target: '/', message: 'Going home...' };
        }

        // Project building commands
        if (lowerText.includes('start building') || lowerText.includes('create project') || lowerText.includes('new project')) {
            return { success: true, action: 'navigate', target: '/ide', message: 'Opening Smart PRD Generator to start building...' };
        }

        // Demo and tour commands
        if (lowerText.includes('show me around') || lowerText.includes('tour') || lowerText.includes('guide me')) {
            return { 
                success: true, 
                action: 'tour', 
                message: 'Welcome to Autonomous Vibe Interface! This is an AI-powered development platform. You can say "Open IDE" to access the Smart PRD and Wireframe Generator, or "Start building" to create a new project. The IDE includes voice-controlled project planning, requirements generation, and wireframe creation.' 
            };
        }

        // Help commands
        if (lowerText.includes('help') || lowerText.includes('what can you do') || lowerText.includes('commands')) {
            return { 
                success: true, 
                action: 'help', 
                message: `Autonomous Vibe Interface Voice Commands: "Open IDE" to launch the Smart PRD Generator, "Start building" to create projects, "Show me around" for a tour, "Go home" to return to the main page, and many more commands available in the IDE!` 
            };
        }

        // Welcome and introduction
        if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('welcome')) {
            return { 
                success: true, 
                action: 'welcome', 
                message: 'Hello! Welcome to Autonomous Vibe Interface. I can help you navigate with voice commands. Try saying "Open IDE" to get started or "Help" to see all available commands.' 
            };
        }

        // Feature explanations
        if (lowerText.includes('what is this') || lowerText.includes('explain') || lowerText.includes('about')) {
            return { 
                success: true, 
                action: 'explain', 
                message: 'This is Autonomous Vibe Interface, an AI-powered development platform with voice control. It features Smart PRD generation, wireframe creation, expert consultation, and intelligent project planning. Say "Open IDE" to explore the full interface.' 
            };
        }

        // Default response with more context
        return { 
            success: true, 
            action: 'chat', 
            message: `I heard: "${text}". Try voice commands like "Open IDE", "Start building", "Help", or "Show me around" to get started.` 
        };
    }

    async handleCommandResponse(response) {
        if (response.action === 'navigate') {
            this.showNotification(response.message, 'info');
            this.speak(response.message);
            setTimeout(() => {
                window.location.href = response.target;
            }, 1500);
        } else if (response.action === 'tour' || response.action === 'explain') {
            this.showNotification('🎯 Platform Tour', 'info');
            this.speak(response.message);
        } else if (response.action === 'help') {
            this.showNotification('🎤 Voice Commands', 'info');
            this.speak(response.message);
        } else if (response.action === 'welcome') {
            this.showNotification('👋 Welcome!', 'success');
            this.speak(response.message);
        } else if (response.action === 'requirements') {
            this.showNotification(response.message, 'info');
            this.speak(response.message);
            // Could trigger requirements modal here
        } else {
            this.showNotification('Voice command processed', 'success');
            this.speak(response.message);
        }

        this.updateUI('success');
    }

    showNotification(message, type = 'info') {
        if (window.voiceNotifications) {
            window.voiceNotifications.show(message, type);
        }
    }

    async speak(text) {
        try {
            // Try server-side TTS first
            const response = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    sessionId: this.sessionId,
                    voice: 'alloy'
                })
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('audio')) {
                    // Real audio from OpenAI
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    
                    audio.onended = () => {
                        URL.revokeObjectURL(audioUrl);
                    };
                    
                    await audio.play();
                    return;
                } else {
                    // Probably demo mode, fall back to browser TTS
                    console.log('Server TTS in demo mode, using browser speech');
                }
            }
        } catch (error) {
            console.log('Server TTS failed, using browser speech:', error.message);
        }
        
        // Fallback to browser's built-in speech synthesis
        this.speakWithBrowser(text);
    }

    speakWithBrowser(text) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure voice settings
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // Try to use a pleasant voice
            const voices = speechSynthesis.getVoices();
            const preferredVoices = ['Samantha', 'Ava', 'Allison', 'Susan', 'Karen'];
            
            for (const preferred of preferredVoices) {
                const voice = voices.find(v => v.name.includes(preferred));
                if (voice) {
                    utterance.voice = voice;
                    break;
                }
            }
            
            // Fallback to first English voice
            if (!utterance.voice) {
                const englishVoice = voices.find(v => v.lang.startsWith('en'));
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
            }
            
            utterance.onstart = () => {
                console.log('Browser speech started');
            };
            
            utterance.onend = () => {
                console.log('Browser speech ended');
            };
            
            utterance.onerror = (event) => {
                console.error('Browser speech error:', event.error);
                this.showNotification('Speech synthesis failed', 'error');
            };
            
            speechSynthesis.speak(utterance);
            
            // Show notification that we're using browser TTS
            this.showNotification('🔊 Speaking with browser voice', 'info', 2000);
        } else {
            console.error('Speech synthesis not supported');
            this.showNotification('Speech synthesis not supported in this browser', 'error');
        }
    }

    displayTranscript(text) {
        const transcriptElement = document.getElementById('voiceTranscript');
        if (transcriptElement) {
            transcriptElement.textContent = text;
            transcriptElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                transcriptElement.style.display = 'none';
            }, 5000);
        }
    }

    updateUI(state) {
        const micButton = document.getElementById('voiceMicButton');
        const statusElement = document.getElementById('voiceStatus');
        
        if (micButton) {
            micButton.className = `voice-mic-button ${state}`;
            
            switch (state) {
                case 'listening':
                    micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    micButton.title = 'Stop listening';
                    break;
                case 'processing':
                    micButton.innerHTML = '<i class="fas fa-cog fa-spin"></i>';
                    micButton.title = 'Processing...';
                    break;
                case 'success':
                    micButton.innerHTML = '<i class="fas fa-check"></i>';
                    micButton.title = 'Command processed';
                    setTimeout(() => this.updateUI('idle'), 2000);
                    break;
                case 'error':
                    micButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                    micButton.title = 'Error occurred';
                    setTimeout(() => this.updateUI('idle'), 2000);
                    break;
                default: // idle
                    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    micButton.title = 'Click to start voice command';
                    break;
            }
        }

        if (statusElement) {
            const statusTexts = {
                idle: 'Ready for voice command',
                listening: 'Listening...',
                processing: 'Processing command...',
                success: 'Command executed',
                error: 'Error processing command'
            };
            statusElement.textContent = statusTexts[state] || statusTexts.idle;
        }
    }

    createVoiceUI() {
        // Create voice control UI elements
        const voiceContainer = document.createElement('div');
        voiceContainer.id = 'voiceContainer';
        voiceContainer.className = 'voice-container';
        voiceContainer.innerHTML = `
            <div class="voice-panel">
                <button id="voiceMicButton" class="voice-mic-button idle" title="Click to start voice command">
                    <i class="fas fa-microphone"></i>
                </button>
                <div id="voiceStatus" class="voice-status">Ready for voice command</div>
                <div id="voiceTranscript" class="voice-transcript" style="display: none;"></div>
                <canvas id="voiceWaveform" class="voice-waveform" width="200" height="50"></canvas>
            </div>
        `;

        // Add to page
        document.body.appendChild(voiceContainer);

        // Add event listeners
        document.getElementById('voiceMicButton').addEventListener('click', () => {
            this.startListening();
        });

        this.setupAudioVisualization();
    }

    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
        if (this.recognition) {
            this.recognition.stop();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.voiceInterface = new VoiceInterface();
    
    // Create UI if elements don't exist
    if (!document.getElementById('voiceContainer')) {
        window.voiceInterface.createVoiceUI();
    }
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceInterface;
}