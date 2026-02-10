import { describe, it, expect } from 'vitest';
import { parseADF } from '../../src/utils/adf-parser.js';

describe('parseADF', () => {
    it('should return empty string for null/undefined', () => {
        expect(parseADF(null)).toBe('');
        expect(parseADF(undefined)).toBe('');
    });

    it('should return empty string for empty doc', () => {
        expect(parseADF({ type: 'doc', content: [] })).toBe('');
    });

    it('should parse a simple paragraph', () => {
        const adf = {
            type: 'doc',
            content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Hello world' }]
            }]
        };
        expect(parseADF(adf)).toContain('Hello world');
    });

    it('should parse multiple paragraphs', () => {
        const adf = {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }
            ]
        };
        const result = parseADF(adf);
        expect(result).toContain('First');
        expect(result).toContain('Second');
    });

    it('should parse headings', () => {
        const adf = {
            type: 'doc',
            content: [{
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'My Heading' }]
            }]
        };
        expect(parseADF(adf)).toContain('My Heading');
    });

    it('should parse bullet lists', () => {
        const adf = {
            type: 'doc',
            content: [{
                type: 'bulletList',
                content: [{
                    type: 'listItem',
                    content: [{
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Item 1' }]
                    }]
                }]
            }]
        };
        const result = parseADF(adf);
        expect(result).toContain('Item 1');
    });

    it('should parse code blocks', () => {
        const adf = {
            type: 'doc',
            content: [{
                type: 'codeBlock',
                content: [{ type: 'text', text: 'const x = 1;' }]
            }]
        };
        expect(parseADF(adf)).toContain('const x = 1;');
    });

    it('should handle string input (non-ADF)', () => {
        expect(parseADF('plain text')).toBe('plain text');
    });
});
