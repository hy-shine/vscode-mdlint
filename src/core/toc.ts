import { TocItem } from '../types';

const headingPattern = /^(#{1,6})\s+(.+?)\s*$/;

export function extractToc(markdown: string): TocItem[] {
  return markdown.split(/\r?\n/).reduce<TocItem[]>((items, line, index) => {
    const match = line.match(headingPattern);

    if (!match) {
      return items;
    }

    const level = match[1].length;
    const text = match[2].trim();

    items.push({
      level,
      text,
      line: index,
      slug: slugify(text),
    });

    return items;
  }, []);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
