
export function renderADF(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;

    // Handle text nodes
    if (node.type === 'text') {
        return node.text || '';
    }

    // Handle content arrays
    if (node.content && Array.isArray(node.content)) {
        return node.content.map(renderADF).join('');
    }

    // Handle specific block types (optional formatting)
    switch (node.type) {
        case 'paragraph':
            return renderADF({ content: node.content }) + '\n';
        case 'bulletList':
        case 'orderedList':
            return renderADF({ content: node.content });
        case 'listItem':
            return '• ' + renderADF({ content: node.content });
        case 'hardBreak':
            return '\n';
        default:
            return '';
    }
}
