import * as vscode from 'vscode';
import { formatMarkdownDocument } from '../core/formatter';

export class MarkdownFormattingProvider implements vscode.DocumentFormattingEditProvider {
  public provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    if (document.languageId !== 'markdown') {
      return [];
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );

    return [vscode.TextEdit.replace(fullRange, formatMarkdownDocument(document.getText()))];
  }
}
