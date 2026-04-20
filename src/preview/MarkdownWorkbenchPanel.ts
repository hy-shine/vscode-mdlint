import * as vscode from 'vscode';
import { getWorkbenchConfig, updatePreviewStyle, updateShowToc, updateThemeMode } from '../core/config';
import { formatMarkdownDocument } from '../core/formatter';
import { renderMarkdown } from '../core/markdown';
import { extractToc } from '../core/toc';
import { PreviewState, PreviewStyle, ThemeMode } from '../types';

export class MarkdownWorkbenchPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  public reveal(editor: vscode.TextEditor): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'mdWorkbench.preview',
        'Markdown Workbench',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, 'media'),
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'katex', 'dist'),
          ],
          retainContextWhenHidden: true,
        },
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      }, null, this.disposables);

      this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
        await this.handleMessage(message);
      }, null, this.disposables);
    }

    this.panel.title = `Markdown Workbench · ${editor.document.fileName.split(/[\\/]/).pop() ?? 'Preview'}`;
    this.panel.reveal(vscode.ViewColumn.Beside);
    this.panel.webview.html = this.getHtml(this.panel.webview);
    void this.update(editor);
  }

  public async update(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!this.panel || !editor || editor.document.languageId !== 'markdown') {
      return;
    }

    const markdown = editor.document.getText();
    const toc = extractToc(markdown);
    const rendered = renderMarkdown(markdown, toc);
    const config = getWorkbenchConfig();

    const state: PreviewState = {
      title: editor.document.fileName.split(/[\\/]/).pop() ?? 'Untitled.md',
      html: rendered.html,
      rawText: markdown,
      toc,
      themeMode: config.themeMode,
      previewStyle: config.previewStyle,
      tocVisible: config.showToc,
    };

    await this.panel.webview.postMessage({ type: 'render', payload: state });
  }

  public postVisibleLineRange(line: number): void {
    if (!this.panel) {
      return;
    }

    void this.panel.webview.postMessage({ type: 'scrollToLine', value: line });
  }

  public async formatActiveDocument(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      return;
    }

    const formatted = formatMarkdownDocument(editor.document.getText());
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(editor.document.getText().length),
    );

    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
      editBuilder.replace(fullRange, formatted);
    });

    await this.update(editor);
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
    this.panel?.dispose();
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'setThemeMode':
        await updateThemeMode(message.value);
        await this.update(vscode.window.activeTextEditor);
        return;
      case 'setPreviewStyle':
        await updatePreviewStyle(message.value);
        await this.update(vscode.window.activeTextEditor);
        return;
      case 'toggleToc':
        await updateShowToc(message.value);
        await this.update(vscode.window.activeTextEditor);
        return;
      case 'revealLine': {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const position = new vscode.Position(message.value, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        return;
      }
      case 'scrollToLine': {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const line = Math.min(message.value, editor.document.lineCount - 1);
        const position = new vscode.Position(line, 0);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.Default);
        return;
      }
      case 'formatDocument':
        await this.formatActiveDocument();
        return;
      case 'exportHtml':
        await vscode.commands.executeCommand('mdWorkbench.exportHtml');
        return;
      case 'exportPdf':
        await vscode.commands.executeCommand('mdWorkbench.exportPdf');
        return;
      default:
        return;
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.css'));
    const katexStyleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'katex', 'dist', 'katex.min.css'),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: https://cdn.jsdelivr.net; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <link href="${katexStyleUri}" rel="stylesheet" />
    <title>Markdown Workbench</title>
  </head>
  <body data-theme-mode="auto" data-preview-style="default">
    <div class="app-shell">
      <aside class="toc-panel is-visible" id="toc-panel">
        <div class="panel-title">Outline</div>
        <nav id="toc-list" class="toc-list"></nav>
      </aside>
      <section class="main-panel">
        <header class="toolbar">
          <div class="toolbar-group">
            <span class="brand">Markdown Workbench</span>
          </div>
          <div class="toolbar-group controls">
            <select id="theme-mode-select" aria-label="Theme mode">
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <select id="preview-style-select" aria-label="Preview style">
              <option value="default">Default</option>
              <option value="github">GitHub</option>
              <option value="notion">Notion</option>
              <option value="tokyo-night">Tokyo Night</option>
              <option value="obsidian">Obsidian</option>
            </select>
            <button id="toggle-toc-button" type="button">TOC</button>
            <button id="format-button" type="button">Format</button>
            <button id="export-html-button" type="button">HTML</button>
            <button id="export-pdf-button" type="button">PDF</button>
          </div>
        </header>
        <main class="content-area">
          <article id="preview-content" class="preview-content"></article>
        </main>
      </section>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

type WebviewMessage =
  | { type: 'setThemeMode'; value: ThemeMode }
  | { type: 'setPreviewStyle'; value: PreviewStyle }
  | { type: 'toggleToc'; value: boolean }
  | { type: 'revealLine'; value: number }
  | { type: 'formatDocument' }
  | { type: 'scrollToLine'; value: number }
  | { type: 'exportHtml' }
  | { type: 'exportPdf' };

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
