import axios from 'axios';
import { getCredentials } from '../utils/config.js';

export class AiService {
    constructor() { }

    async generate(prompt) {
        const { aiKey, aiProvider, aiEnabled } = getCredentials();

        if (!aiEnabled) {
            throw new Error('AI features are disabled. Run "jira config ai enable" to enable.');
        }

        if (!aiKey) {
            throw new Error('AI API Key not configured. Run "jira config ai enable" or "jira config setup".');
        }

        // Basic implementation for OpenAI - extensible for others
        if (aiProvider === 'openai' || !aiProvider) {
            return this.callOpenAI(aiKey, prompt);
        } else if (aiProvider === 'gemini') {
            return this.callGemini(aiKey, prompt);
        } else if (aiProvider === 'anthropic') {
            return this.callAnthropic(aiKey, prompt);
        }

        throw new Error(`Unsupported AI Provider: ${aiProvider}`);
    }

    async callOpenAI(key, prompt) {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o', // or gpt-3.5-turbo
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            }, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            return response.data.choices[0].message.content;
        } catch (e) {
            throw new Error(`OpenAI API Error: ${e.response?.data?.error?.message || e.message}`);
        }
    }

    async callGemini(key, prompt) {
        // Placeholder for Gemini implementation
        throw new Error("Gemini implementation pending.");
    }

    async callAnthropic(key, prompt) {
        // Placeholder for Anthropic
        throw new Error("Anthropic implementation pending.");
    }
}

export const aiService = new AiService();
