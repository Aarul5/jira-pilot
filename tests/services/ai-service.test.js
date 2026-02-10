import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
    default: {
        post: vi.fn()
    }
}));

// Mock config
vi.mock('../../src/utils/config.js', () => ({
    getCredentials: vi.fn(() => ({
        aiEnabled: true,
        aiProvider: 'openai',
        aiKey: 'test-key'
    }))
}));

describe('AiService', () => {
    let AiService, aiService;

    beforeEach(async () => {
        vi.resetModules();
        const module = await import('../../src/services/ai-service.js');
        AiService = module.AiService;
        aiService = module.aiService;
    });

    it('should export an aiService instance', () => {
        expect(aiService).toBeDefined();
        expect(aiService).toBeInstanceOf(AiService);
    });

    it('should have a generate method', () => {
        expect(typeof aiService.generate).toBe('function');
    });

    it('should throw when AI is disabled', async () => {
        const { getCredentials } = await import('../../src/utils/config.js');
        getCredentials.mockReturnValueOnce({ aiEnabled: false, aiKey: 'key', aiProvider: 'openai' });

        const service = new AiService();
        await expect(service.generate('test')).rejects.toThrow('disabled');
    });

    it('should throw when API key is missing', async () => {
        const { getCredentials } = await import('../../src/utils/config.js');
        getCredentials.mockReturnValueOnce({ aiEnabled: true, aiKey: null, aiProvider: 'openai' });

        const service = new AiService();
        await expect(service.generate('test')).rejects.toThrow('not configured');
    });

    it('should throw for unsupported provider', async () => {
        const { getCredentials } = await import('../../src/utils/config.js');
        getCredentials.mockReturnValueOnce({ aiEnabled: true, aiKey: 'key', aiProvider: 'invalid' });

        const service = new AiService();
        await expect(service.generate('test')).rejects.toThrow('Unsupported');
    });

    it('should route to openai provider', async () => {
        const axios = (await import('axios')).default;
        axios.post.mockResolvedValueOnce({
            data: { choices: [{ message: { content: 'AI response' } }] }
        });

        const { getCredentials } = await import('../../src/utils/config.js');
        getCredentials.mockReturnValueOnce({ aiEnabled: true, aiKey: 'test-key', aiProvider: 'openai' });

        const service = new AiService();
        const result = await service.generate('Hello');

        expect(result).toBe('AI response');
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.openai.com/v1/chat/completions',
            expect.objectContaining({ model: 'gpt-4o' }),
            expect.any(Object)
        );
    });

    it('should route to gemini provider', async () => {
        const axios = (await import('axios')).default;
        axios.post.mockResolvedValueOnce({
            data: { candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }] }
        });

        const { getCredentials } = await import('../../src/utils/config.js');
        getCredentials.mockReturnValueOnce({ aiEnabled: true, aiKey: 'test-key', aiProvider: 'gemini' });

        const service = new AiService();
        const result = await service.generate('Hello');

        expect(result).toBe('Gemini response');
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('generativelanguage.googleapis.com'),
            expect.any(Object),
            expect.any(Object)
        );
    });

    it('should route to anthropic provider', async () => {
        const axios = (await import('axios')).default;
        axios.post.mockResolvedValueOnce({
            data: { content: [{ type: 'text', text: 'Claude response' }] }
        });

        const { getCredentials } = await import('../../src/utils/config.js');
        getCredentials.mockReturnValueOnce({ aiEnabled: true, aiKey: 'test-key', aiProvider: 'anthropic' });

        const service = new AiService();
        const result = await service.generate('Hello');

        expect(result).toBe('Claude response');
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.anthropic.com/v1/messages',
            expect.any(Object),
            expect.objectContaining({
                headers: expect.objectContaining({ 'x-api-key': 'test-key' })
            })
        );
    });
});
