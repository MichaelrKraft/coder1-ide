class VoiceCommandProcessor {
    constructor() {
        this.commands = new Map();
        this.setupCommands();
    }

    setupCommands() {
        // Navigation commands
        this.commands.set('navigation', {
            'open ide': { action: 'navigate', target: '/ide' },
            'launch ide': { action: 'navigate', target: '/ide' },
            'go to ide': { action: 'navigate', target: '/ide' },
            'open coder1': { action: 'navigate', target: '/ide' },
            'go home': { action: 'navigate', target: '/' },
            'back to home': { action: 'navigate', target: '/' },
            'home page': { action: 'navigate', target: '/' }
        });

        // IDE commands
        this.commands.set('ide', {
            'create new file': { action: 'ide_command', command: 'new_file' },
            'new file': { action: 'ide_command', command: 'new_file' },
            'save file': { action: 'ide_command', command: 'save' },
            'open terminal': { action: 'ide_command', command: 'toggle_terminal' },
            'close terminal': { action: 'ide_command', command: 'toggle_terminal' },
            'run command': { action: 'ide_command', command: 'run_command' },
            'clear terminal': { action: 'ide_command', command: 'clear_terminal' }
        });

        // Requirements gathering commands
        this.commands.set('requirements', {
            'start building': { action: 'requirements', command: 'start_questionnaire' },
            'create project': { action: 'requirements', command: 'start_questionnaire' },
            'answer question': { action: 'requirements', command: 'answer_question' },
            'skip question': { action: 'requirements', command: 'skip_question' },
            'next question': { action: 'requirements', command: 'next_question' },
            'previous question': { action: 'requirements', command: 'previous_question' }
        });

        // General commands
        this.commands.set('general', {
            'help': { action: 'help', topic: 'general' },
            'what can you do': { action: 'help', topic: 'capabilities' },
            'voice commands': { action: 'help', topic: 'voice_commands' },
            'stop listening': { action: 'voice_control', command: 'stop_listening' },
            'start listening': { action: 'voice_control', command: 'start_listening' },
            'mute': { action: 'voice_control', command: 'mute' },
            'unmute': { action: 'voice_control', command: 'unmute' }
        });
    }

    processCommand(text, context = {}) {
        const lowerText = text.toLowerCase().trim();
        
        // First check for direct command matches
        for (const [category, commands] of this.commands.entries()) {
            for (const [command, config] of Object.entries(commands)) {
                if (lowerText.includes(command)) {
                    return {
                        matched: true,
                        category,
                        command,
                        config,
                        confidence: this.calculateConfidence(lowerText, command),
                        originalText: text
                    };
                }
            }
        }

        // Check for partial matches or fuzzy matching
        const fuzzyMatch = this.findFuzzyMatch(lowerText);
        if (fuzzyMatch) {
            return fuzzyMatch;
        }

        // If no command matched, treat as general chat
        return {
            matched: false,
            category: 'chat',
            command: 'general_message',
            config: { action: 'chat', message: text },
            confidence: 0.1,
            originalText: text
        };
    }

    findFuzzyMatch(text) {
        const words = text.split(' ');
        let bestMatch = null;
        let bestScore = 0;

        for (const [category, commands] of this.commands.entries()) {
            for (const [command, config] of Object.entries(commands)) {
                const score = this.calculateFuzzyScore(words, command.split(' '));
                if (score > 0.6 && score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        matched: true,
                        category,
                        command,
                        config,
                        confidence: score,
                        originalText: text,
                        fuzzy: true
                    };
                }
            }
        }

        return bestMatch;
    }

    calculateFuzzyScore(textWords, commandWords) {
        let matches = 0;
        for (const cmdWord of commandWords) {
            for (const textWord of textWords) {
                if (textWord.includes(cmdWord) || cmdWord.includes(textWord)) {
                    matches++;
                    break;
                }
            }
        }
        return matches / commandWords.length;
    }

    calculateConfidence(text, command) {
        // Simple confidence calculation based on exact match
        if (text === command) return 1.0;
        if (text.includes(command)) return 0.9;
        
        // Calculate based on word overlap
        const textWords = text.split(' ');
        const commandWords = command.split(' ');
        let matches = 0;
        
        for (const cmdWord of commandWords) {
            if (textWords.includes(cmdWord)) {
                matches++;
            }
        }
        
        return matches / commandWords.length;
    }

    getHelpText(topic = 'general') {
        const helpTexts = {
            general: `
I can help you with voice commands for the Autonomous Vibe Interface. 
Say "voice commands" to hear what I can do, or try commands like:
- "Open IDE" to launch the code editor
- "Go home" to return to the main page  
- "Start building" to begin a new project
- "Help" for more assistance
            `.trim(),
            
            capabilities: `
I can help you navigate and control the interface using voice commands:
- Navigation: Open IDE, go home, launch applications
- Code editing: Create files, run commands, manage terminal
- Project building: Start requirements gathering, answer questions
- General assistance: Get help, control voice settings
            `.trim(),
            
            voice_commands: `
Available voice commands:
Navigation: "open IDE", "go home", "back to home"
IDE: "new file", "save file", "open terminal", "run command"  
Projects: "start building", "create project", "next question"
Control: "stop listening", "help", "what can you do"
            `.trim()
        };

        return helpTexts[topic] || helpTexts.general;
    }

    getAllCommands() {
        const allCommands = {};
        for (const [category, commands] of this.commands.entries()) {
            allCommands[category] = Object.keys(commands);
        }
        return allCommands;
    }

    addCustomCommand(category, command, config) {
        if (!this.commands.has(category)) {
            this.commands.set(category, {});
        }
        this.commands.get(category)[command] = config;
    }

    removeCommand(category, command) {
        if (this.commands.has(category)) {
            delete this.commands.get(category)[command];
        }
    }
}

module.exports = VoiceCommandProcessor;