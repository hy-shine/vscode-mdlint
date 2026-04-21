# Markdown Workbench

Markdown Workbench is a feature-rich VS Code Markdown extension that provides an enhanced preview experience with theme switching, multiple preview styles, table of contents navigation, code highlighting, math formulas, Mermaid diagrams, scroll synchronization, and export functionality.

### Features

- **Enhanced Preview Panel**
  - Bidirectional scroll synchronization (editor ↔ preview)
  - Left-side table of contents (TOC) with current section highlighting
  - Top toolbar (theme toggle, style toggle, format, export)
  - Preview button in editor title bar

- **Themes & Styles**
  - Theme modes: Auto / Light / Dark
  - Preview styles: Default / GitHub / Notion / Tokyo Night / Obsidian

- **Rendering Capabilities**
  - Code highlighting (powered by highlight.js)
  - Math formulas (powered by KaTeX)
  - Mermaid diagrams (loaded dynamically via CDN)

- **Editing Enhancement**
  - Markdown formatting (list normalization, blockquote spacing, horizontal rule standardization, etc.)
  - Integration with VS Code native formatting provider

- **Export**
  - HTML export (standalone file with inline styles)
  - PDF export (via browser print dialog)

### Installation

1. Install from VS Code Marketplace (when published)
2. Or manually install the `.vsix` file:
   ```bash
   code --install-extension md-workbench-0.0.1.vsix
   ```

### Usage

#### Open Preview

- Click the preview button in the editor title bar (`$(open-preview)` icon)
- Or use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for `Markdown Workbench: Open Preview`

#### Format Document

- Click the `Format` button in the toolbar
- Or use the command palette and search for `Markdown Workbench: Format Document`
- Or use VS Code native format command (`Shift+Alt+F` / `Shift+Option+F`)

#### Export

- **HTML Export**: Click the `HTML` button in the toolbar or search for `Markdown Workbench: Export HTML` in the command palette
- **PDF Export**: Click the `PDF` button in the toolbar or search for `Markdown Workbench: Export PDF` in the command palette

### Configuration

Search for `Markdown Workbench` in VS Code settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mdlint.themeMode` | string | `auto` | Theme mode: `auto` / `light` / `dark` |
| `mdlint.previewStyle` | string | `default` | Preview style: `default` / `github` / `notion` / `tokyo-night` / `obsidian` |
| `mdlint.showToc` | boolean | `true` | Show table of contents sidebar |

### Commands

| Command | Description |
|---------|-------------|
| `Markdown Workbench: Open Preview` | Open preview panel |
| `Markdown Workbench: Format Document` | Format current document |
| `Markdown Workbench: Refresh TOC` | Refresh table of contents |
| `Markdown Workbench: Export HTML` | Export as HTML |
| `Markdown Workbench: Export PDF` | Export as PDF |

### Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package
npm install -g @vscode/vsce
vsce package
```

### License

MIT License
