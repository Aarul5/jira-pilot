/**
 * Converts plain text to Atlassian Document Format (ADF).
 * Splits on newlines to create separate paragraphs.
 *
 * @param {string} text - Plain text string
 * @returns {object} ADF document node
 */
export declare function textToADF(text: any): {
    type: string;
    version: number;
    content: {
        type: string;
        content: {
            type: string;
            text: string;
        }[];
    }[];
};
