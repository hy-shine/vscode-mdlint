export type ThemeMode = 'auto' | 'light' | 'dark';

export type PreviewStyle = 'default' | 'github' | 'notion' | 'tokyo-night' | 'obsidian' | 'paper' | 'typora';

export interface TocItem {
  level: number;
  text: string;
  line: number;
  slug: string;
}

export interface PreviewState {
  title: string;
  html: string;
  rawText: string;
  toc: TocItem[];
  themeMode: ThemeMode;
  previewStyle: PreviewStyle;
  tocVisible: boolean;
}
