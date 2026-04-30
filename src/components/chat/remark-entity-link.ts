import { visit } from 'unist-util-visit';
import { Node } from 'unist';

export function remarkEntityLink() {
  return (tree: Node) => {
    visit(tree, 'text', (node: any, index, parent) => {
      const regex = /\[\[([^\]]+)\]\]/g;
      const value = node.value;
      const nodes = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(value)) !== null) {
        const [fullMatch, topic] = match;
        const start = match.index;

        // Add preceding text
        if (start > lastIndex) {
          nodes.push({
            type: 'text',
            value: value.slice(lastIndex, start),
          });
        }

        // Add entity link node
        nodes.push({
          type: 'entityLink',
          data: {
            hName: 'entityLink',
            hProperties: {
              topic: topic,
            },
          },
          children: [{ type: 'text', value: topic }],
        });

        lastIndex = start + fullMatch.length;
      }

      // Add remaining text
      if (lastIndex < value.length) {
        nodes.push({
          type: 'text',
          value: value.slice(lastIndex),
        });
      }

      if (nodes.length > 0) {
        parent.children.splice(index, 1, ...nodes);
        return index + nodes.length;
      }
    });
  };
}
