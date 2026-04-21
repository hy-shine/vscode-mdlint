import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getWorkbenchConfig } from './config';
import { renderMarkdown } from './markdown';
import { extractToc } from './toc';

export async function exportHtml(sourceUri: vscode.Uri, context: vscode.ExtensionContext): Promise<void> {
  const markdown = await vscode.workspace.fs.readFile(sourceUri);
  const markdownText = new TextDecoder().decode(markdown);
  const config = getWorkbenchConfig();
  const toc = extractToc(markdownText);
  const rendered = renderMarkdown(markdownText, toc);

  const themeMode = config.themeMode === 'auto'
    ? (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark')
    : config.themeMode;
  const styleCss = loadExportCss(context, themeMode, config.previewStyle);
  const katexCss = loadKatexCss(context);

  const tocHtml = config.showToc
    ? `<nav class="export-toc">${toc.map((item) => `<div class="export-toc-item level-${item.level}"><a href="#${item.slug}">${item.text}</a></div>`).join('\n')}</nav>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${path.basename(sourceUri.fsPath, '.md')}</title>
  <style>${katexCss}</style>
  <style>${styleCss}</style>
</head>
<body class="export-body theme-${themeMode} style-${config.previewStyle}">
  ${tocHtml}
  <article class="preview-content">${rendered.html}</article>
</body>
</html>`;

  const targetPath = sourceUri.fsPath.replace(/\.md$/, '.html');
  const targetUri = vscode.Uri.file(targetPath);

  await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(html));
  await vscode.window.showInformationMessage(`Exported HTML: ${targetPath}`, 'Open').then((choice) => {
    if (choice === 'Open') {
      void vscode.env.openExternal(targetUri);
    }
  });
}

function loadExportCss(context: vscode.ExtensionContext, themeMode: string, previewStyle: string): string {
  const cssPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'main.css').fsPath;
  try {
    let css = fs.readFileSync(cssPath, 'utf-8');
    css += `
.export-body {
  margin: 0 auto;
  max-width: 920px;
  padding: 40px 24px;
}
.export-toc {
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 8px;
}
.export-toc-item a {
  color: inherit;
  text-decoration: none;
}
.export-toc-item a:hover {
  text-decoration: underline;
}
.export-toc-item.level-1 { margin-left: 0; font-weight: 600; }
.export-toc-item.level-2 { margin-left: 1rem; }
.export-toc-item.level-3 { margin-left: 2rem; }
.export-toc-item.level-4 { margin-left: 3rem; }
.export-toc-item.level-5 { margin-left: 4rem; }
.export-toc-item.level-6 { margin-left: 5rem; }
.export-body {
  background: var(--bg);
  color: var(--text);
}
`;
    return css;
  } catch {
    return '';
  }
}

function loadKatexCss(context: vscode.ExtensionContext): string {
  const cssPath = vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'katex', 'dist', 'katex.min.css').fsPath;
  try {
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
}
