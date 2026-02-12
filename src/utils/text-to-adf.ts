/**
 * Converts plain text to Atlassian Document Format (ADF).
 * Splits on newlines to create separate paragraphs.
 *
 * @param {string} text - Plain text string
 * @returns {object} ADF document node
 */
export function textToADF(text: any) {
    if (!text || typeof text !== 'string') {
        return {
            type: 'doc',
            version: 1,
            content: [
                {
                    type: 'paragraph',
                    content: []
                }
            ]
        };
    }

    const paragraphs = text.split('\n').map(line => ({
        type: 'paragraph',
        content: line.trim().length > 0
            ? [{ type: 'text', text: line }]
            : []
    }));

    return {
        type: 'doc',
        version: 1,
        content: paragraphs
    };
}
