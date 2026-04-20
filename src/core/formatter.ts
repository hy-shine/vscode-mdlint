export function formatMarkdownDocument(markdown: string): string {
  const lines = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''));

  const formatted: string[] = [];
  let blankCount = 0;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^```/)) {
      inCodeFence = !inCodeFence;
      formatted.push(normalizeCodeFence(line));
      blankCount = 0;
      continue;
    }

    if (inCodeFence) {
      formatted.push(line);
      blankCount = 0;
      continue;
    }

    const isBlank = line.trim().length === 0;

    if (isBlank) {
      blankCount += 1;
      if (blankCount > 1) {
        continue;
      }
      formatted.push('');
      continue;
    }

    blankCount = 0;
    formatted.push(normalizeLine(line, lines, i));
  }

  const result = formatted.join('\n').trimEnd();
  return result.length > 0 ? `${result}\n` : '';
}

function normalizeLine(line: string, lines: string[], index: number): string {
  let result = normalizeHeadingSpacing(line);
  result = normalizeListMarker(result);
  result = normalizeBlockquoteSpacing(result);
  result = normalizeHorizontalRule(result);

  if (isTableRow(result)) {
    const tableStart = findTableStart(lines, index);
    const tableEnd = findTableEnd(lines, index);
    if (tableStart !== -1 && tableEnd !== -1) {
      return result;
    }
  }

  return result;
}

function normalizeHeadingSpacing(line: string): string {
  const match = line.match(/^(#{1,6})([^\s#].*)$/);
  if (!match) {
    return line;
  }

  return `${match[1]} ${match[2].trim()}`;
}

function normalizeListMarker(line: string): string {
  const unorderedMatch = line.match(/^(\s*)([*+-])(\s+)/);
  if (unorderedMatch) {
    return `${unorderedMatch[1]}- ${line.slice(unorderedMatch[1].length + unorderedMatch[2].length + unorderedMatch[3].length).trimStart()}`;
  }

  const orderedMatch = line.match(/^(\s*)(\d+)\.(\s+)/);
  if (orderedMatch) {
    return `${orderedMatch[1]}${orderedMatch[2]}. ${line.slice(orderedMatch[1].length + orderedMatch[2].length + 1 + orderedMatch[3].length).trimStart()}`;
  }

  return line;
}

function normalizeBlockquoteSpacing(line: string): string {
  const match = line.match(/^(>+)/);
  if (!match) {
    return line;
  }

  return line.replace(/^(>+)(\s*)/, (_, markers: string) => {
    return markers + ' ';
  });
}

function normalizeHorizontalRule(line: string): string {
  if (line.match(/^\s*([-*_])\s*\1\s*\1(\s*\1)*\s*$/)) {
    return '---';
  }

  return line;
}

function normalizeCodeFence(line: string): string {
  const match = line.match(/^(`{3,})(\s*)(\w*)/);
  if (!match) {
    return line;
  }

  const lang = match[3];
  return lang ? `\`\`\`${lang}` : '```';
}

function isTableRow(line: string): boolean {
  return /^\|/.test(line.trim()) && /\|$/.test(line.trim());
}

function findTableStart(lines: string[], index: number): number {
  for (let i = index; i >= 0; i--) {
    if (!isTableRow(lines[i]) && !isTableDelimiter(lines[i])) {
      return i + 1;
    }
  }
  return 0;
}

function findTableEnd(lines: string[], index: number): number {
  for (let i = index; i < lines.length; i++) {
    if (!isTableRow(lines[i]) && !isTableDelimiter(lines[i])) {
      return i - 1;
    }
  }
  return lines.length - 1;
}

function isTableDelimiter(line: string): boolean {
  return /^\|?\s*[-:]+[-|\s:]*\|?\s*$/.test(line.trim());
}
