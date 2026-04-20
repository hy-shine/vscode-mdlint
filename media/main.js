const vscode = acquireVsCodeApi();

const body = document.body;
const previewContent = document.getElementById('preview-content');
const contentArea = document.querySelector('.content-area');
const tocList = document.getElementById('toc-list');
const outlineControl = document.getElementById('outline-control');
const outlineTrigger = document.getElementById('outline-trigger');
const floatingControls = document.getElementById('floating-controls');
const floatingTrigger = document.getElementById('floating-trigger');
const floatingMenu = document.getElementById('floating-menu');
const themeOptions = document.getElementById('theme-options');
const styleOptions = document.getElementById('style-options');
const exportOptions = document.getElementById('export-options');
const formatButton = document.getElementById('format-button');
const themeValueEl = document.getElementById('theme-value');
const styleValueEl = document.getElementById('style-value');

let currentState = {
  themeMode: 'auto',
  previewStyle: 'default',
};

let isScrollingFromEditor = false;
let scrollSyncDebounce = null;

// --- Outline popup toggle ---
outlineTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  outlineControl.classList.toggle('is-open');
});

// --- Floating menu toggle ---
floatingTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  floatingControls.classList.toggle('is-open');
});

// --- Dismiss floating menu on outside click ---
document.addEventListener('click', (e) => {
  if (!floatingControls.contains(e.target)) {
    floatingControls.classList.remove('is-open');
    collapseAllGroups();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    outlineControl.classList.remove('is-open');
    floatingControls.classList.remove('is-open');
    collapseAllGroups();
  }
});

// --- Collapsible group toggle ---
floatingMenu.addEventListener('click', (e) => {
  const group = e.target.closest('.floating-menu-group');
  if (!group) { return; }
  e.stopPropagation();
  const wasExpanded = group.classList.contains('is-expanded');
  collapseAllGroups();
  if (!wasExpanded) {
    group.classList.add('is-expanded');
  }
});

function collapseAllGroups() {
  for (const g of floatingMenu.querySelectorAll('.floating-menu-group.is-expanded')) {
    g.classList.remove('is-expanded');
  }
}

// --- Theme option clicks ---
themeOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setThemeMode', value: item.dataset.value });
});

// --- Style option clicks ---
styleOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setPreviewStyle', value: item.dataset.value });
});

// --- Export option clicks ---
exportOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  if (item.dataset.value === 'html') {
    vscode.postMessage({ type: 'exportHtml' });
  } else if (item.dataset.value === 'pdf') {
    vscode.postMessage({ type: 'exportPdf' });
  }
  floatingControls.classList.remove('is-open');
  collapseAllGroups();
});

// --- Format action ---
formatButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'formatDocument' });
  floatingControls.classList.remove('is-open');
  collapseAllGroups();
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
  setBodyPresentation(state.themeMode, state.previewStyle);
  syncFloatingMenu(state.themeMode, state.previewStyle);
  previewContent.innerHTML = state.html;
  renderToc(state.toc);
  renderMermaidDiagrams();
  updateActiveTocLink();
});

function setBodyPresentation(themeMode, previewStyle) {
  body.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  body.classList.remove('style-default', 'style-github', 'style-notion', 'style-tokyo-night', 'style-obsidian');
  body.classList.add(`theme-${themeMode}`);
  body.classList.add(`style-${previewStyle}`);
}

function syncFloatingMenu(themeMode, previewStyle) {
  for (const item of themeOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === themeMode);
  }
  for (const item of styleOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === previewStyle);
  }
  if (themeValueEl) {
    themeValueEl.textContent = themeMode.charAt(0).toUpperCase() + themeMode.slice(1).replace('-', ' ');
  }
  if (styleValueEl) {
    styleValueEl.textContent = previewStyle.charAt(0).toUpperCase() + previewStyle.slice(1).replace('-', ' ');
  }
}

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
