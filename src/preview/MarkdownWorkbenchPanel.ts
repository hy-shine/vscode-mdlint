import * as vscode from 'vscode';
import { exportHtml } from '../core/export';
import { getWorkbenchConfig, updatePreviewStyle, updateShowToc, updateThemeMode } from '../core/config';
import { formatMarkdownDocument } from '../core/formatter';
import { renderMarkdown } from '../core/markdown';
import { extractToc } from '../core/toc';
import { PreviewState, PreviewStyle, ThemeMode } from '../types';

export class MarkdownWorkbenchPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private sourceUri: vscode.Uri | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  public reveal(editor: vscode.TextEditor): void {
    this.sourceUri = editor.document.uri;
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'mdlint.preview',
        'MDLint',
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

      this.panel.webview.html = this.getHtml(this.panel.webview);
    }

    this.panel.title = `MDLint · ${editor.document.fileName.split(/[\\/]/).pop() ?? 'Preview'}`;
    this.panel.reveal(vscode.ViewColumn.Beside);
    void this.update(editor);
  }

  public async update(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!this.panel) {
      return;
    }

    const document = await this.resolveDocument(editor);
    if (!document || document.languageId !== 'markdown') {
      return;
    }

    const markdown = document.getText();
    const toc = extractToc(markdown);
    const rendered = renderMarkdown(markdown, toc);
    const config = getWorkbenchConfig();

    const state: PreviewState = {
      title: document.fileName.split(/[\\/]/).pop() ?? 'Untitled.md',
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
    const document = await this.resolveDocument(vscode.window.activeTextEditor);
    if (!document || document.languageId !== 'markdown') {
      return;
    }

    const editor = await this.resolveEditor(document);

    const formatted = formatMarkdownDocument(document.getText());
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
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
        await this.update(undefined);
        return;
      case 'setPreviewStyle':
        await updatePreviewStyle(message.value);
        await this.update(undefined);
        return;
      case 'toggleToc':
        await updateShowToc(message.value);
        await this.update(undefined);
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
        if (this.sourceUri) {
          await exportHtml(this.sourceUri, this.context);
        }
        return;
      default:
        return;
    }
  }

  private async resolveDocument(editor: vscode.TextEditor | undefined): Promise<vscode.TextDocument | undefined> {
    if (editor && editor.document.languageId === 'markdown') {
      this.sourceUri = editor.document.uri;
      return editor.document;
    }

    if (!this.sourceUri) {
      return undefined;
    }

    return vscode.workspace.openTextDocument(this.sourceUri);
  }

  private async resolveEditor(document: vscode.TextDocument): Promise<vscode.TextEditor> {
    const existingEditor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === document.uri.toString(),
    );

    if (existingEditor) {
      return existingEditor;
    }

    return vscode.window.showTextDocument(document, { preserveFocus: true, preview: false });
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
    <title>MDLint</title>
  </head>
  <body>
    <div class="app-shell">
      <section class="main-panel">
        <div class="outline-control" id="outline-control">
          <button class="outline-trigger" id="outline-trigger" type="button" aria-label="Outline" title="Outline">&#9776;</button>
          <div class="outline-panel" id="outline-panel">
            <div class="outline-panel-title">Outline</div>
            <nav id="toc-list" class="toc-list"></nav>
          </div>
        </div>
        <div class="floating-controls" id="floating-controls">
          <button class="floating-trigger" id="floating-trigger" type="button" aria-label="Preview settings" title="Preview settings" aria-expanded="false">
            <span class="floating-trigger-ring"></span>
            <span class="floating-trigger-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" focusable="false">
                <path d="M4 5.25h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <path d="M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <path d="M4 14.75h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <circle cx="7" cy="5.25" r="1.9" fill="currentColor"/>
                <circle cx="13" cy="10" r="1.9" fill="currentColor"/>
                <circle cx="9.5" cy="14.75" r="1.9" fill="currentColor"/>
              </svg>
            </span>
          </button>
          <div class="floating-menu" id="floating-menu">
            <div class="floating-menu-header">
              <div class="floating-menu-eyebrow">Preview</div>
            </div>
            <div class="floating-menu-section-label">Appearance</div>
            <button class="floating-menu-group" data-group="theme" type="button" aria-expanded="false">
              <span class="floating-menu-group-icon" aria-hidden="true">◐</span>
              <span class="floating-menu-group-copy">
                <span class="floating-menu-group-label">Theme</span>
              </span>
              <span class="floating-menu-group-value" id="theme-value">Auto</span>
              <span class="floating-menu-group-arrow">&#9656;</span>
            </button>
            <div class="floating-menu-sub" id="theme-options">
              <button class="floating-menu-item" data-value="auto">Auto</button>
              <button class="floating-menu-item" data-value="light">Light</button>
              <button class="floating-menu-item" data-value="dark">Dark</button>
            </div>
            <button class="floating-menu-group" data-group="style" type="button" aria-expanded="false">
              <span class="floating-menu-group-icon" aria-hidden="true">✦</span>
              <span class="floating-menu-group-copy">
                <span class="floating-menu-group-label">Style</span>
              </span>
              <span class="floating-menu-group-value" id="style-value">Default</span>
              <span class="floating-menu-group-arrow">&#9656;</span>
            </button>
            <div class="floating-menu-sub" id="style-options">
              <button class="floating-menu-item" data-value="default">Default</button>
              <button class="floating-menu-item" data-value="github">GitHub</button>
              <button class="floating-menu-item" data-value="notion">Notion</button>
              <button class="floating-menu-item" data-value="tokyo-night">Tokyo Night</button>
              <button class="floating-menu-item" data-value="obsidian">Obsidian</button>
            </div>
            <div class="floating-menu-divider"></div>
            <div class="floating-menu-section-label">Actions</div>
            <button class="floating-menu-action" id="format-button" type="button">
              <span class="floating-menu-action-icon" aria-hidden="true">⌘</span>
              <span class="floating-menu-action-copy">
                <span class="floating-menu-action-title">Format Document</span>
              </span>
            </button>
            <button class="floating-menu-action" id="export-button" type="button">
              <span class="floating-menu-action-icon" aria-hidden="true">↗</span>
              <span class="floating-menu-action-copy">
                <span class="floating-menu-action-title">Export HTML</span>
              </span>
            </button>
          </div>
        </div>
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
  | { type: 'exportHtml' };

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
