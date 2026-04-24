import { TocItem } from '../types';

const headingPattern = /^(#{1,6})\s+(.+?)\s*$/;

export function extractToc(markdown: string): TocItem[] {
  const slugCounts = new Map<string, number>();

  return markdown.split(/\r?\n/).reduce<TocItem[]>((items, line, index) => {
    const match = line.match(headingPattern);

    if (!match) {
      return items;
    }

    const level = match[1].length;
    const text = match[2].trim();
    const base = slugify(text);

    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count}`;

    items.push({
      level,
      text,
      line: index,
      slug,
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
