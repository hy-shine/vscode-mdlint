import hljs from 'highlight.js';
import katex from 'katex';
import { marked, Tokens } from 'marked';
import { TocItem } from '../types';

export interface RenderedMarkdown {
  html: string;
}

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
    const slug = headings.get(text) ?? text.toLowerCase().replace(/\s+/g, '-');
    const tocEntry = toc.find((item) => item.text === text);
    const sourceLine = tocEntry ? tocEntry.line : 0;
    return `<h${depth} id="${escapeAttribute(slug)}" data-source-line="${sourceLine}">${text}</h${depth}>`;
  };
  renderer.code = ({ text, lang }: Tokens.Code) => {
    if (lang === 'mermaid') {
      return `<div class="code-block"><div class="code-block-language">mermaid</div><pre><code class="language-mermaid">${escapeHtml(text)}</code></pre></div>`;
    }
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const languageLabel = lang ? `<div class="code-block-language">${escapeHtml(lang)}</div>` : '';
    return `<div class="code-block">${languageLabel}<pre><code class="hljs language-${escapeAttribute(language)}">${highlighted}</code></pre></div>`;
  };

  return {
    html: marked.parse(renderMath(markdown), { renderer }) as string,
  };
}

function renderMath(markdown: string): string {
  const fencedBlockPattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;

  return markdown
    .split(fencedBlockPattern)
    .map((segment) => {
      if (segment.startsWith('```') || segment.startsWith('~~~')) {
        return segment;
      }

      return renderInlineMath(renderBlockMath(segment));
    })
    .join('');
}

function renderBlockMath(input: string): string {
  return input.replace(/\$\$([\s\S]+?)\$\$/g, (_, expression: string) => {
    return `\n${katex.renderToString(expression.trim(), { displayMode: true, throwOnError: false })}\n`;
  });
}

function renderInlineMath(input: string): string {
  return input.replace(/(^|[^\\])\$(?!\$)([^$\n]+?)\$/g, (_, prefix: string, expression: string) => {
    return `${prefix}${katex.renderToString(expression.trim(), { displayMode: false, throwOnError: false })}`;
  });
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
