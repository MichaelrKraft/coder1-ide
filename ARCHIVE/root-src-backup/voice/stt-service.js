const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class STTService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'demo_key'
        });
    }

    async transcribeAudio(audioBuffer, options = {}) {
        try {
            // Create a temporary file for the audio
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `audio_${Date.now()}.webm`);
            fs.writeFileSync(tempFilePath, audioBuffer);

            // Call OpenAI Whisper API
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: 'whisper-1',
                language: options.language || 'en',
                response_format: 'json',
                temperature: 0.2
            });

            // Clean up temp file
            fs.unlinkSync(tempFilePath);

            return {
                success: true,
                text: transcription.text,
                confidence: 0.95, // Whisper doesn't return confidence, so we estimate
                language: options.language || 'en'
            };

        } catch (error) {
            console.error('STT Error:', error.message);
            
            // Fallback for demo mode
            if (process.env.OPENAI_API_KEY === 'demo_key') {
                return {
                    success: true,
                    text: "This is a demo transcription. Please configure OPENAI_API_KEY for real speech recognition.",
                    confidence: 0.95,
                    language: 'en',
                    demo: true
                };
            }

            return {
                success: false,
                error: error.message,
                text: ''
            };
        }
    }

    async detectWakeWord(text, wakeWords = ['hey coder', 'hey coder1', 'coder1']) {
        const lowerText = text.toLowerCase();
        const detectedWakeWord = wakeWords.find(word => lowerText.includes(word));
        
        if (detectedWakeWord) {
            // Extract the command after the wake word
            const wakeWordIndex = lowerText.indexOf(detectedWakeWord);
            const command = text.substring(wakeWordIndex + detectedWakeWord.length).trim();
            
            return {
                detected: true,
                wakeWord: detectedWakeWord,
                command: command,
                originalText: text
            };
        }

        return {
            detected: false,
            originalText: text
        };
    }

    async processVoiceCommand(text) {
        // Basic command processing
        const lowerText = text.toLowerCase();
        
        // IDE commands
        if (lowerText.includes('open ide') || lowerText.includes('launch ide')) {
            return { type: 'navigation', action: 'open_ide' };
        }
        
        if (lowerText.includes('go home') || lowerText.includes('back to home')) {
            return { type: 'navigation', action: 'go_home' };
        }

        // Requirements gathering commands
        if (lowerText.includes('start building') || lowerText.includes('create project')) {
            return { type: 'requirements', action: 'start_questionnaire' };
        }

        // General AI interaction
        return { type: 'chat', action: 'process_message', message: text };
    }
}

module.exports = STTService;