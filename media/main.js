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
const formatButton = document.getElementById('format-button');
const exportButton = document.getElementById('export-button');
const themeValueEl = document.getElementById('theme-value');
const styleValueEl = document.getElementById('style-value');

let currentState = {
  themeMode: 'auto',
  previewStyle: 'default',
};

let isScrollingFromEditor = false;
let scrollSyncDebounce = null;
let suppressScrollSync = false;
let suppressScrollSyncTimer = null;

// --- Outline popup toggle ---
outlineTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  outlineControl.classList.toggle('is-open');
});

// --- Floating menu toggle ---
floatingTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = floatingControls.classList.toggle('is-open');
  floatingTrigger.setAttribute('aria-expanded', String(isOpen));
});

// --- Dismiss floating menu on outside click ---
document.addEventListener('click', (e) => {
  if (!floatingControls.contains(e.target)) {
    floatingControls.classList.remove('is-open');
    floatingTrigger.setAttribute('aria-expanded', 'false');
    collapseAllGroups();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    outlineControl.classList.remove('is-open');
    floatingControls.classList.remove('is-open');
    floatingTrigger.setAttribute('aria-expanded', 'false');
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
    group.setAttribute('aria-expanded', 'true');
  }
});

function collapseAllGroups() {
  for (const g of floatingMenu.querySelectorAll('.floating-menu-group.is-expanded')) {
    g.classList.remove('is-expanded');
    g.setAttribute('aria-expanded', 'false');
  }
}

// --- Theme option clicks ---
themeOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setThemeMode', value: item.dataset.value });
  collapseAllGroups();
});

// --- Style option clicks ---
styleOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setPreviewStyle', value: item.dataset.value });
  collapseAllGroups();
});

// --- Export action ---
exportButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportHtml' });
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
  setupCodeCopyButtons();
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
      target?.scrollIntoView({ block: 'nearest' });
      highlightTocItem(item.slug);
      suppressScrollSync = true;
      if (suppressScrollSyncTimer) {
        clearTimeout(suppressScrollSyncTimer);
      }
      suppressScrollSyncTimer = setTimeout(() => {
        suppressScrollSync = false;
      }, 400);
    });
    tocList.appendChild(link);
  }
}

contentArea.addEventListener('scroll', () => {
  if (!suppressScrollSync) {
    updateActiveTocLink();
  }

  if (isScrollingFromEditor || suppressScrollSync) {
    return;
  }

  if (scrollSyncDebounce !== null) {
    clearTimeout(scrollSyncDebounce);
  }

  scrollSyncDebounce = setTimeout(() => {
    if (isScrollingFromEditor || suppressScrollSync) {
      return;
    }

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
      vscode.postMessage({ type: 'syncEditorScroll', value: Number(bestHeading.dataset.sourceLine) });
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
    replaceMermaidBlocksWithError(mermaidBlocks, 'Mermaid failed to load');
    return;
  }

  try {
    mermaid.initialize(getMermaidConfig());
  } catch (error) {
    console.error('Mermaid initialize failed with themed config, falling back.', error);
    try {
      mermaid.initialize(getFallbackMermaidConfig());
    } catch (fallbackError) {
      console.error('Mermaid fallback initialize failed.', fallbackError);
      replaceMermaidBlocksWithError(mermaidBlocks, 'Mermaid rendering unavailable');
      return;
    }
  }

  for (const block of mermaidBlocks) {
    const pre = block.parentElement;
    if (!pre) {
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
      container.dataset.style = currentState.previewStyle;
      container.innerHTML = svg;
      pre.replaceWith(container);
    } catch (error) {
      console.error('Mermaid render failed.', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'mermaid-error';
      errorDiv.textContent = 'Mermaid rendering failed';
      pre.replaceWith(errorDiv);
    }
  }
}

function highlightTocItem(slug) {
  const links = tocList.querySelectorAll('.toc-link');
  for (const link of links) {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${slug}`);
  }
}

function updateActiveTocLink() {
  const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const areaRect = contentArea.getBoundingClientRect();
  let activeId = null;

  const isAtBottom = contentArea.scrollHeight - contentArea.scrollTop - contentArea.clientHeight < 40;

  for (const heading of headings) {
    const rect = heading.getBoundingClientRect();
    if (rect.top <= areaRect.top + 80) {
      activeId = heading.id;
    }
  }

  if (!activeId && isAtBottom) {
    for (let i = headings.length - 1; i >= 0; i--) {
      const rect = headings[i].getBoundingClientRect();
      if (rect.top < areaRect.bottom) {
        activeId = headings[i].id;
        break;
      }
    }
  }

  const links = tocList.querySelectorAll('.toc-link');
  for (const link of links) {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('is-active', isActive);
  }
}

function getCssVar(name, fallback = '') {
  const value = getComputedStyle(body).getPropertyValue(name).trim();
  return value || fallback;
}

function getMermaidConfig() {
  const previewStyle = currentState.previewStyle;
  const fontFamily = getComputedStyle(previewContent).fontFamily || getComputedStyle(body).fontFamily;
  const background = getCssVar('--bg', '#ffffff');
  const panel = getCssVar('--panel', '#ffffff');
  const surfaceSoft = getCssVar('--surface-soft', panel);
  const border = getCssVar('--border', '#d0d7de');
  const text = getCssVar('--text', '#1f2328');
  const muted = getCssVar('--muted', '#59636e');
  const accent = getCssVar('--accent', '#0969da');

  const themeVariables = {
    background,
    fontFamily,
    fontSize: previewStyle === 'notion' ? '15px' : '14px',
    primaryColor: previewStyle === 'notion' ? surfaceSoft : panel,
    primaryTextColor: text,
    primaryBorderColor: border,
    lineColor: accent,
    secondaryColor: surfaceSoft,
    secondaryTextColor: text,
    secondaryBorderColor: border,
    tertiaryColor: background,
    tertiaryTextColor: text,
    tertiaryBorderColor: border,
    mainBkg: panel,
    secondBkg: surfaceSoft,
    tertiaryBkg: background,
    clusterBkg: surfaceSoft,
    clusterBorder: border,
    edgeLabelBackground: background,
    actorBkg: panel,
    actorBorder: border,
    actorTextColor: text,
    noteBkgColor: surfaceSoft,
    noteTextColor: text,
    noteBorderColor: border,
    signalColor: accent,
    signalTextColor: muted,
    labelBoxBkgColor: background,
    labelBoxBorderColor: border,
    labelTextColor: text,
  };

  return {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables,
    flowchart: {
      curve: previewStyle === 'notion' ? 'basis' : 'linear',
      htmlLabels: true,
    },
    sequence: {
      diagramMarginX: 24,
      diagramMarginY: 18,
      actorMargin: 32,
    },
  };
}

function getFallbackMermaidConfig() {
  const isDark = body.classList.contains('theme-dark') || (body.classList.contains('theme-auto') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: isDark ? 'dark' : 'default',
    flowchart: {
      htmlLabels: true,
    },
  };
}

function replaceMermaidBlocksWithError(blocks, message) {
  for (const block of blocks) {
    const pre = block.parentElement;
    if (!pre) {
      continue;
    }
    const errorDiv = document.createElement('div');
    errorDiv.className = 'mermaid-error';
    errorDiv.textContent = message;
    pre.replaceWith(errorDiv);
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
        resolve(window.mermaid);
      } else {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

function setupCodeCopyButtons() {
  const copyButtons = previewContent.querySelectorAll('.code-copy-button');
  for (const button of copyButtons) {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      const code = button.dataset.code;
      if (!code) {
        return;
      }

      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 2000);
      } catch {
        button.textContent = 'Failed';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    });
  }
}
