import { describe, it, expect } from 'vitest';
import { textToADF } from '../../src/utils/text-to-adf.js';

describe('textToADF', () => {
    it('should return empty doc for null/undefined/empty input', () => {
        const emptyDoc = {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [] }]
        };
        expect(textToADF('')).toEqual(emptyDoc);
        expect(textToADF(null)).toEqual(emptyDoc);
        expect(textToADF(undefined)).toEqual(emptyDoc);
    });

    it('should convert a single line to one paragraph', () => {
        const result = textToADF('Hello world');
        expect(result.type).toBe('doc');
        expect(result.version).toBe(1);
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('paragraph');
        expect(result.content[0].content[0].text).toBe('Hello world');
    });

    it('should convert multiple lines to multiple paragraphs', () => {
        const result = textToADF('Line one\nLine two\nLine three');
        expect(result.content).toHaveLength(3);
        expect(result.content[0].content[0].text).toBe('Line one');
        expect(result.content[1].content[0].text).toBe('Line two');
        expect(result.content[2].content[0].text).toBe('Line three');
    });

    it('should handle empty lines as empty paragraphs', () => {
        const result = textToADF('First\n\nThird');
        expect(result.content).toHaveLength(3);
        expect(result.content[0].content[0].text).toBe('First');
        expect(result.content[1].content).toEqual([]);
        expect(result.content[2].content[0].text).toBe('Third');
    });

    it('should handle special characters', () => {
        const result = textToADF('Test <html> & "quotes"');
        expect(result.content[0].content[0].text).toBe('Test <html> & "quotes"');
    });

    it('should always return doc structure', () => {
        const result = textToADF('Any text');
        expect(result).toHaveProperty('type', 'doc');
        expect(result).toHaveProperty('version', 1);
        expect(result).toHaveProperty('content');
    });
});
