# Changelog

All notable changes to the MDLint extension will be documented in this file.

## [0.1.0] - 2026-04-21

### Added
- Enhanced Markdown preview panel with real-time rendering
- Multiple preview themes: Default, GitHub, Notion, Tokyo Night, Obsidian
- Theme mode support: Auto, Light, Dark
- Table of contents (TOC) sidebar with scroll sync
- Syntax highlighting for code blocks using highlight.js
- Math formula rendering with KaTeX
- Markdown document formatting
- Export to HTML functionality
- Floating settings menu with left-flyout sub-menus
- Code copy button in code blocks
- Mermaid diagram support

### Fixed
- Shell command list regex fix for special characters (e.g., g++)

### Changed
- Activation event changed to `onLanguage:markdown` for better startup performance
- Optimized menu UI: reduced padding and card height for compact display
- Removed hint text from menu items to save space
- Changed menu width from 280px to 250px

## [0.0.1-beta] - 2026-04-21

### Added
- Initial release
- Basic Markdown preview
- Theme and style configuration
- TOC extraction and display
- Format document command
