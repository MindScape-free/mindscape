import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

/**
 * Custom Remark plugin to detect [[Topic]] syntax
 */
export function remarkEntityLink() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index, parent) => {
      const regex = /\[\[([^\]]+)\]\]/g;
      const value = node.value;
      const nodes = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(value)) !== null) {
        const [fullMatch, topic] = match;
        const start = match.index;

        if (start > lastIndex) {
          nodes.push({ type: 'text', value: value.slice(lastIndex, start) });
        }

        nodes.push({
          type: 'entityLink',
          data: {
            hName: 'entityLink',
            hProperties: { topic },
          },
          children: [{ type: 'text', value: topic }],
        });

        lastIndex = start + fullMatch.length;
      }

      if (lastIndex < value.length) {
        nodes.push({ type: 'text', value: value.slice(lastIndex) });
      }

      if (nodes.length > 0) {
        parent.children.splice(index, 1, ...nodes);
        return index + nodes.length;
      }
    });
  };
}

/**
 * Processes markdown content into an AST-like structure or HTML
 * Note: For React components, we usually use react-markdown which handles this.
 * This pipeline is for pre-processing or static analysis.
 */
export async function processMarkdown(content: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkEntityLink)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(content);

  return String(file);
}
