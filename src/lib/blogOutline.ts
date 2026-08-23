export type BlogHeadingLike = {
  id?: string;
  slug?: string;
  text?: string;
  title?: string;
  level?: number;
  depth?: number;
  children?: BlogHeadingLike[];
};

export type BlogOutlineChild = {
  id: string;
  text: string;
  number: string;
  level: 3;
};

export type BlogOutlineEntry = {
  id: string;
  text: string;
  number: string;
  level: 2;
  children: BlogOutlineChild[];
};

function stripInlineMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/`+/g, '')
    .replace(/[*_~]/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .trim();
}

function createAstroCompatibleSlug(text: string, seenSlugs: Map<string, number>): string {
  const baseSlug = stripInlineMarkup(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

  const count = seenSlugs.get(baseSlug) ?? 0;
  seenSlugs.set(baseSlug, count + 1);
  return count === 0 ? baseSlug : `${baseSlug}-${count}`;
}

function getHeadingLevel(heading: BlogHeadingLike): number {
  return heading.depth ?? heading.level ?? 0;
}

function getHeadingText(heading: BlogHeadingLike): string {
  return String(heading.text ?? heading.title ?? '').trim();
}

function getHeadingId(heading: BlogHeadingLike, seenSlugs: Map<string, number>): string {
  const existingId = String(heading.slug ?? heading.id ?? '').trim();
  if (existingId) return existingId;
  return createAstroCompatibleSlug(getHeadingText(heading), seenSlugs);
}

export function buildBlogOutline(headings: readonly BlogHeadingLike[]): BlogOutlineEntry[] {
  const outline: BlogOutlineEntry[] = [];
  const seenSlugs = new Map<string, number>();

  headings.forEach((heading) => {
    const level = getHeadingLevel(heading);
    const text = getHeadingText(heading);
    if (!text) return;

    if (level === 2) {
      outline.push({
        id: getHeadingId(heading, seenSlugs),
        text,
        number: String(outline.length + 1).padStart(2, '0'),
        level: 2,
        children: [],
      });
      return;
    }

    if (level === 3 && outline.length > 0) {
      const parent = outline.at(-1);
      if (!parent) return;
      parent.children.push({
        id: getHeadingId(heading, seenSlugs),
        text,
        number: `${parent.number}.${parent.children.length + 1}`,
        level: 3,
      });
    }
  });

  return outline;
}

export function parseMarkdownOutline(markdown: string): BlogOutlineEntry[] {
  const headings = markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(##|###)\s+(.+?)\s*#*\s*$/))
    .filter(Boolean)
    .map((match) => ({
      level: match?.[1] === '###' ? 3 : 2,
      text: stripInlineMarkup(match?.[2] ?? ''),
    }));

  return buildBlogOutline(headings);
}

export function insertMarkdownHeading(markdown: string, selectionStart: number, selectionEnd: number, level: 2 | 3): string {
  const prefix = `${'#'.repeat(level)} `;
  const fallbackText = level === 2 ? 'Section title' : 'Subsection title';
  const selectedText = markdown.slice(selectionStart, selectionEnd).trim() || fallbackText;

  return `${markdown.slice(0, selectionStart)}${prefix}${selectedText}${markdown.slice(selectionEnd)}`;
}
