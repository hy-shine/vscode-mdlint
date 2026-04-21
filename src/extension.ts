import * as vscode from 'vscode';
import { exportHtml } from './core/export';
import { MarkdownFormattingProvider } from './formatting/MarkdownFormattingProvider';
import { MarkdownWorkbenchPanel } from './preview/MarkdownWorkbenchPanel';

export function activate(context: vscode.ExtensionContext): void {
  try {
    console.log('[mdlint] activate start');
    const panel = new MarkdownWorkbenchPanel(context);
    const formattingProvider = new MarkdownFormattingProvider();

    context.subscriptions.push(
      panel,
      vscode.languages.registerDocumentFormattingEditProvider({ language: 'markdown' }, formattingProvider),
      vscode.commands.registerCommand('mdlint.openPreview', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
          void vscode.window.showInformationMessage('Open a Markdown file to use Markdown Workbench.');
          return;
        }

        panel.reveal(editor);
      }),
      vscode.commands.registerCommand('mdlint.formatDocument', async () => {
        await panel.formatActiveDocument();
      }),
      vscode.commands.registerCommand('mdlint.refreshToc', async () => {
        await panel.update(vscode.window.activeTextEditor);
      }),
      vscode.commands.registerCommand('mdlint.exportHtml', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
          void vscode.window.showInformationMessage('Open a Markdown file to export.');
          return;
        }
        await exportHtml(editor.document.uri, context);
      }),
      vscode.window.onDidChangeActiveTextEditor(async (editor: vscode.TextEditor | undefined) => {
        await panel.update(editor);
      }),
      vscode.workspace.onDidChangeTextDocument(async (event: vscode.TextDocumentChangeEvent) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
          return;
        }

        await panel.update(editor);
      }),
      vscode.workspace.onDidChangeConfiguration(async (event: vscode.ConfigurationChangeEvent) => {
        if (!event.affectsConfiguration('mdlint')) {
          return;
        }

        await panel.update(vscode.window.activeTextEditor);
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event: vscode.TextEditorVisibleRangesChangeEvent) => {
        if (event.textEditor.document.languageId !== 'markdown') {
          return;
        }

        const ranges = event.visibleRanges;
        if (ranges.length === 0) {
          return;
        }

        const topLine = ranges[0].start.line;
        panel.postVisibleLineRange(topLine);
      }),
    );

    console.log('[mdlint] activate end');
  } catch (err) {
    console.error('[mdlint] activate error:', err);
    throw err;
  }
}

export function deactivate(): void {}
