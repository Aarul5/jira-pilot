
import { describe, it, expect } from 'vitest';
import { textToADF } from '../../src/utils/text-to-adf.js';
import { parseADF } from '../../src/utils/adf-parser.js';

describe('ADF Utilities', () => {
    describe('textToADF', () => {
        it('should convert simple text to ADF paragraph', () => {
            const result = textToADF('Hello World');
            expect(result.type).toBe('doc');
            expect(result.content[0].content[0].text).toBe('Hello World');
        });

        it('should handle multiline text', () => {
            const result = textToADF('Hello\nWorld');
            expect(result.content).toHaveLength(2);
            expect(result.content[0].content[0].text).toBe('Hello');
            expect(result.content[1].content[0].text).toBe('World');
        });

        it('should handle empty input', () => {
            const result = textToADF('');
            expect(result.type).toBe('doc');
            expect(result.content[0].type).toBe('paragraph');
        });
    });

    describe('parseADF', () => {
        it('should parse simple text paragraph', () => {
            const adf = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Hello' }]
                    }
                ]
            };
            expect(parseADF(adf).trim()).toBe('Hello');
        });

        it('should parse multiple paragraphs', () => {
            const adf = {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
                    { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] }
                ]
            };
            expect(parseADF(adf).trim()).toBe('Line 1\n\nLine 2');
        });

        it('should handle null/undefined', () => {
            expect(parseADF(null)).toBe('');
            expect(parseADF(undefined)).toBe('');
        });
    });
});
