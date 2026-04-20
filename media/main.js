const vscode = acquireVsCodeApi();

const body = document.body;
const previewContent = document.getElementById('preview-content');
const contentArea = document.querySelector('.content-area');
const tocPanel = document.getElementById('toc-panel');
const tocList = document.getElementById('toc-list');
const themeModeSelect = document.getElementById('theme-mode-select');
const previewStyleSelect = document.getElementById('preview-style-select');
const toggleTocButton = document.getElementById('toggle-toc-button');
const formatButton = document.getElementById('format-button');
const exportHtmlButton = document.getElementById('export-html-button');
const exportPdfButton = document.getElementById('export-pdf-button');

let currentState = {
  tocVisible: true,
};

let isScrollingFromEditor = false;
let scrollSyncDebounce = null;

themeModeSelect.addEventListener('change', () => {
  vscode.postMessage({ type: 'setThemeMode', value: themeModeSelect.value });
});

previewStyleSelect.addEventListener('change', () => {
  vscode.postMessage({ type: 'setPreviewStyle', value: previewStyleSelect.value });
});

toggleTocButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'toggleToc', value: !currentState.tocVisible });
});

formatButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'formatDocument' });
});

exportHtmlButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportHtml' });
});

exportPdfButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportPdf' });
});

window.addEventListener('message', (event) => {
  const message = event.data;

  if (message.type === 'scrollToLine') {
    isScrollingFromEditor = true;
    const line = message.value;
    const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let target = null;
    for (const heading of headings) {
      const headingLine = heading.dataset.sourceLine;
      if (headingLine !== undefined && Number(headingLine) <= line) {
        target = heading;
      } else {
        break;
      }
    }
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    setTimeout(() => { isScrollingFromEditor = false; }, 120);
    return;
  }

  if (message.type !== 'render') {
    return;
  }

  const state = message.payload;
  currentState = state;
  document.title = state.title;
  body.dataset.themeMode = state.themeMode;
  body.dataset.previewStyle = state.previewStyle;
  themeModeSelect.value = state.themeMode;
  previewStyleSelect.value = state.previewStyle;
  tocPanel.classList.toggle('is-visible', state.tocVisible);
  previewContent.innerHTML = state.html;
  renderToc(state.toc);
  renderMermaidDiagrams();
  updateActiveTocLink();
});

function renderToc(items) {
  tocList.innerHTML = '';

  for (const item of items) {
    const link = document.createElement('a');
    link.href = `#${item.slug}`;
    link.textContent = item.text;
    link.className = 'toc-link';
    link.style.paddingLeft = `${(item.level - 1) * 12 + 8}px`;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      vscode.postMessage({ type: 'revealLine', value: item.line });
      const target = document.getElementById(item.slug);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    tocList.appendChild(link);
  }
}

contentArea.addEventListener('scroll', () => {
  updateActiveTocLink();

  if (isScrollingFromEditor) {
    return;
  }

  if (scrollSyncDebounce !== null) {
    clearTimeout(scrollSyncDebounce);
  }

  scrollSyncDebounce = setTimeout(() => {
    const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const areaRect = contentArea.getBoundingClientRect();
    let bestHeading = null;
    let bestOffset = Infinity;

    for (const heading of headings) {
      const rect = heading.getBoundingClientRect();
      const offset = rect.top - areaRect.top;
      if (offset <= 80 && offset > -rect.height) {
        if (80 - offset < bestOffset) {
          bestOffset = 80 - offset;
          bestHeading = heading;
        }
      }
    }

    if (bestHeading && bestHeading.dataset.sourceLine !== undefined) {
      vscode.postMessage({ type: 'scrollToLine', value: Number(bestHeading.dataset.sourceLine) });
    }
  }, 80);
});

async function renderMermaidDiagrams() {
  const mermaidBlocks = previewContent.querySelectorAll('code.language-mermaid');
  if (mermaidBlocks.length === 0) {
    return;
  }

  const mermaid = await loadMermaid();
  if (!mermaid) {
    return;
  }

  for (const block of mermaidBlocks) {
    const pre = block.parentElement;
    const wrapper = pre?.parentElement;
    if (!pre || !wrapper) {
      continue;
    }

    const source = block.textContent;
    if (!source) {
      continue;
    }

    try {
      const { svg } = await mermaid.render(`mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, source);
      const container = document.createElement('div');
      container.className = 'mermaid-diagram';
      container.innerHTML = svg;
      wrapper.replaceWith(container);
    } catch {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'mermaid-error';
      errorDiv.textContent = 'Mermaid rendering failed';
      wrapper.replaceWith(errorDiv);
    }
  }
}

function updateActiveTocLink() {
  const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const areaRect = contentArea.getBoundingClientRect();
  let activeId = null;

  for (const heading of headings) {
    const rect = heading.getBoundingClientRect();
    if (rect.top <= areaRect.top + 80) {
      activeId = heading.id;
    }
  }

  const links = tocList.querySelectorAll('.toc-link');
  for (const link of links) {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('is-active', isActive);
  }
}

async function loadMermaid() {
  if (window.mermaid) {
    return window.mermaid;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      if (window.mermaid) {
        window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
        resolve(window.mermaid);
      } else {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}
