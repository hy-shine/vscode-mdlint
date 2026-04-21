import * as vscode from 'vscode';
import { PreviewStyle, ThemeMode } from '../types';

const SECTION = 'mdlint';

export interface WorkbenchConfig {
  themeMode: ThemeMode;
  previewStyle: PreviewStyle;
  showToc: boolean;
}

export function getWorkbenchConfig(): WorkbenchConfig {
  const config = vscode.workspace.getConfiguration(SECTION);

  return {
    themeMode: config.get<ThemeMode>('themeMode', 'auto'),
    previewStyle: config.get<PreviewStyle>('previewStyle', 'default'),
    showToc: config.get<boolean>('showToc', true),
  };
}

export async function updateThemeMode(themeMode: ThemeMode): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('themeMode', themeMode, vscode.ConfigurationTarget.Global);
}

export async function updatePreviewStyle(previewStyle: PreviewStyle): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('previewStyle', previewStyle, vscode.ConfigurationTarget.Global);
}

export async function updateShowToc(showToc: boolean): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('showToc', showToc, vscode.ConfigurationTarget.Global);
}
