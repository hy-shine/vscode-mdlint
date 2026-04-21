# Markdown Workbench

Markdown Workbench 是一个功能丰富的 VS Code Markdown 扩展，提供增强的预览体验、主题切换、多种预览风格、目录导航、代码高亮、数学公式、Mermaid 图表、滚动同步以及导出功能。

### 功能特性

- **增强预览面板**
  - 双向滚动同步（编辑器 ↔ 预览）
  - 左侧目录导航（TOC）及当前章节高亮
  - 顶部工具栏（主题切换、风格切换、格式化、导出）
  - 编辑器右上角预览按钮

- **主题与风格**
  - 主题模式：自动 / 浅色 / 深色
  - 预览风格：Default / GitHub / Notion / Tokyo Night / Obsidian

- **渲染能力**
  - 代码高亮（基于 highlight.js）
  - 数学公式（基于 KaTeX）
  - Mermaid 图表（通过 CDN 动态加载）

- **编辑增强**
  - Markdown 格式化（列表标准化、引用块间距、水平分割线统一等）
  - VS Code 原生格式化入口集成

- **导出发布**
  - HTML 导出（独立文件，内联样式）
  - PDF 导出（通过浏览器打印对话框）

### 安装

1. 从 VS Code 扩展市场安装（发布后）
2. 或手动安装 `.vsix` 文件：
   ```bash
   code --install-extension md-workbench-0.0.1.vsix
   ```

### 使用

#### 打开预览

- 点击编辑器右上角的预览按钮（`$(open-preview)` 图标）
- 或使用命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）搜索 `Markdown Workbench: Open Preview`

#### 格式化文档

- 点击工具栏的 `Format` 按钮
- 或使用命令面板搜索 `Markdown Workbench: Format Document`
- 或使用 VS Code 原生格式化命令（`Shift+Alt+F` / `Shift+Option+F`）

#### 导出

- **HTML 导出**：点击工具栏的 `HTML` 按钮或命令面板搜索 `Markdown Workbench: Export HTML`
- **PDF 导出**：点击工具栏的 `PDF` 按钮或命令面板搜索 `Markdown Workbench: Export PDF`

### 配置

在 VS Code 设置中搜索 `Markdown Workbench`：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `mdlint.themeMode` | string | `auto` | 主题模式：`auto` / `light` / `dark` |
| `mdlint.previewStyle` | string | `default` | 预览风格：`default` / `github` / `notion` / `tokyo-night` / `obsidian` |
| `mdlint.showToc` | boolean | `true` | 是否显示目录侧边栏 |

### 命令

| 命令 | 说明 |
|------|------|
| `Markdown Workbench: Open Preview` | 打开预览面板 |
| `Markdown Workbench: Format Document` | 格式化当前文档 |
| `Markdown Workbench: Refresh TOC` | 刷新目录 |
| `Markdown Workbench: Export HTML` | 导出为 HTML |
| `Markdown Workbench: Export PDF` | 导出为 PDF |

### 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式编译
npm run watch

# 打包
npm install -g @vscode/vsce
vsce package
```

### 许可证

MIT License
