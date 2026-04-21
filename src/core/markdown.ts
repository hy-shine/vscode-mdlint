import hljs from 'highlight.js';
import katex from 'katex';
import { marked, TokenizerAndRendererExtension, Tokens } from 'marked';
import { TocItem } from '../types';
import { slugify } from './toc';

export interface RenderedMarkdown {
  html: string;
}

// --- Marked extensions for KaTeX math rendering ---
// Block math: $$...$$
const blockMathExtension: TokenizerAndRendererExtension = {
  name: 'blockMath',
  level: 'block',
  start(src: string) {
    return src.match(/^\$\$/m)?.index ?? -1;
  },
  tokenizer(src: string) {
    const match = src.match(/^\$\$([\s\S]+?)\$\$/);
    if (!match) {
      return undefined;
    }
    return {
      type: 'blockMath',
      raw: match[0],
      expression: match[1].trim(),
    };
  },
  renderer(token: Tokens.Generic) {
    return `<p>${katex.renderToString(token.expression as string, { displayMode: true, throwOnError: false })}</p>`;
  },
};

// Inline math: $...$
const inlineMathExtension: TokenizerAndRendererExtension = {
  name: 'inlineMath',
  level: 'inline',
  start(src: string) {
    return src.match(/(?<!\$)\$(?!\$)/)?.index ?? -1;
  },
  tokenizer(src: string) {
    const match = src.match(/^(?:^|[^\\])\$(?!\$)([^$\n]+?)\$(?!\$)/);
    if (!match) {
      return undefined;
    }
    return {
      type: 'inlineMath',
      raw: match[0],
      expression: match[1].trim(),
      prefix: match[0].startsWith('$') ? '' : match[0][0],
    };
  },
  renderer(token: Tokens.Generic) {
    const prefix = (token.prefix as string) ?? '';
    return `${prefix}${katex.renderToString(token.expression as string, { displayMode: false, throwOnError: false })}`;
  },
};

marked.use({ extensions: [blockMathExtension, inlineMathExtension] });

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(markdown: string, toc: TocItem[]): RenderedMarkdown {
  const headings = new Map(toc.map((item) => [item.text, item.slug]));
  const lineToSlug = new Map(toc.map((item) => [item.line, item.slug]));

  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
    const text = marked.Parser.parseInline(tokens);
    const slug = headings.get(text) ?? slugify(text);
    const tocEntry = toc.find((item) => item.text === text);
    const sourceLine = tocEntry ? tocEntry.line : 0;
    return `<h${depth} id="${escapeAttribute(slug)}" data-source-line="${sourceLine}">${text}</h${depth}>`;
  };
  renderer.code = ({ text, lang }: Tokens.Code) => {
    if (lang === 'mermaid') {
      return `<pre><code class="language-mermaid">${escapeHtml(text)}</code></pre>`;
    }
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const copyButton = `<button class="code-copy-button" data-code="${escapeAttribute(text)}" aria-label="Copy code">Copy</button>`;
    return `<pre>${copyButton}<code class="hljs language-${escapeAttribute(language)}">${highlighted}</code></pre>`;
  };

  return {
    html: marked.parse(markdown, { renderer }) as string,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
