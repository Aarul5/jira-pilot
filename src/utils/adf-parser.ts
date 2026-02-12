export function parseADF(content: any) {
    if (!content) return '';
    if (typeof content === 'string') return content;

    if (content.type === 'doc') {
        return content.content.map((node: any) => parseNode(node)).join('\n');
    }

    return JSON.stringify(content);
}

function parseNode(node: any): string {
    if (!node) return '';

    switch (node.type) {
        case 'paragraph':
            return parseParagraph(node);
        case 'text':
            return node.text;
        case 'bulletList':
            return parseList(node, '•');
        case 'orderedList':
            return parseList(node, '1.');
        case 'heading':
            return `\n${'#'.repeat(node.attrs?.level || 1)} ${node.content.map((c: any) => parseNode(c)).join('')}\n`;
        case 'codeBlock':
            return `\n\`\`\`${node.attrs?.language || ''}\n${node.content.map((c: any) => c.text).join('')}\n\`\`\`\n`;
        case 'blockquote':
            return `> ${node.content.map((c: any) => parseNode(c)).join('')}`;
        default:
            if (node.content) {
                return node.content.map((c: any) => parseNode(c)).join('');
            }
            return ''; // Unknown node, skip or fallback
    }
}

function parseParagraph(node: any) {
    if (!node.content) return '\n';
    return node.content.map((c: any) => parseNode(c)).join('') + '\n';
}

function parseList(node: any, marker: string) {
    if (!node.content) return '';
    return node.content.map((item: any, index: number) => {
        const prefix = marker === '1.' ? `${index + 1}. ` : `${marker} `;
        return `${prefix}${item.content.map((c: any) => parseNode(c)).join('')}`;
    }).join('\n') + '\n';
}
