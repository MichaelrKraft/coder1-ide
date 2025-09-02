const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class TTSService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'demo_key'
        });
    }

    async generateSpeech(text, options = {}) {
        // Skip OpenAI entirely if we don't have a real API key or know we'll get quota error
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo_key') {
            console.log('No OpenAI API key configured, using demo mode');
            return await this.generateDemoAudio(text, options);
        }

        try {
            // Default options
            const voice = options.voice || 'alloy'; // alloy, echo, fable, onyx, nova, shimmer
            const model = options.model || 'tts-1';
            const speed = options.speed || 1.0;

            // Call OpenAI TTS API
            const mp3 = await this.openai.audio.speech.create({
                model: model,
                voice: voice,
                input: text,
                speed: speed,
                response_format: 'mp3'
            });

            // Convert to buffer
            const buffer = Buffer.from(await mp3.arrayBuffer());

            return {
                success: true,
                audio: buffer,
                format: 'mp3',
                text: text,
                voice: voice,
                duration: this.estimateDuration(text, speed)
            };

        } catch (error) {
            console.error('TTS Error:', error.message);
            
            // Always use demo mode if OpenAI fails (quota, missing key, etc.)
            return await this.generateDemoAudio(text, options);
        }
    }

    async generateDemoAudio(text, options = {}) {
        // Generate a realistic demo audio response
        const voice = options.voice || 'alloy';
        const speed = options.speed || 1.0;
        
        // Create a simple audio buffer (silence) as placeholder
        // In a real implementation, you could use Web Speech API or another TTS service
        const duration = this.estimateDuration(text, speed);
        const sampleRate = 44100;
        const samples = Math.floor(duration * sampleRate);
        
        // Create a minimal WAV file with silence
        const audioBuffer = this.createSilentWav(samples, sampleRate);
        
        return {
            success: true,
            audio: audioBuffer,
            format: 'wav',
            text: text,
            voice: `${voice}_demo`,
            duration: duration,
            demo: true,
            message: `Demo TTS: "${text}" (${duration}s)`
        };
    }

    createSilentWav(samples, sampleRate) {
        // Create a minimal WAV file with silence for demo purposes
        const buffer = Buffer.alloc(44 + samples * 2);
        
        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + samples * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20);
        buffer.writeUInt16LE(1, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28);
        buffer.writeUInt16LE(2, 32);
        buffer.writeUInt16LE(16, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(samples * 2, 40);
        
        // Silent audio data (all zeros)
        buffer.fill(0, 44);
        
        return buffer;
    }

    async generateResponseSpeech(responseText, context = {}) {
        // Process the response text for better speech
        let processedText = this.processTextForSpeech(responseText);
        
        // Choose voice based on context
        let voice = 'alloy'; // Default professional voice
        
        if (context.mode === 'friendly') {
            voice = 'nova'; // More friendly voice
        } else if (context.mode === 'technical') {
            voice = 'onyx'; // More authoritative voice
        }

        return await this.generateSpeech(processedText, { voice });
    }

    processTextForSpeech(text) {
        // Remove markdown formatting
        let processed = text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic
            .replace(/`(.*?)`/g, '$1')       // Remove inline code
            .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
            .replace(/#{1,6}\s/g, '')        // Remove headers
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
            .replace(/\n+/g, '. ')           // Replace newlines with periods
            .replace(/\s+/g, ' ')            // Normalize whitespace
            .trim();

        // Add natural pauses
        processed = processed
            .replace(/\. /g, '. ... ') // Add pause after sentences
            .replace(/: /g, ': ... ')  // Add pause after colons
            .replace(/; /g, '; ... '); // Add pause after semicolons

        return processed;
    }

    estimateDuration(text, speed = 1.0) {
        // Rough estimation: average speaking rate is ~150 words per minute
        const words = text.split(' ').length;
        const baseMinutes = words / 150;
        const adjustedMinutes = baseMinutes / speed;
        return Math.ceil(adjustedMinutes * 60); // Return seconds
    }

    async saveAudioToFile(audioBuffer, filename) {
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, filename);
        fs.writeFileSync(filePath, audioBuffer);
        return filePath;
    }
}

module.exports = TTSService;