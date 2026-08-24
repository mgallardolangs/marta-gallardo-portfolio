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

export type InsertMarkdownHeadingResult = {
  markdown: string;
  selectionStart: number;
  selectionEnd: number;
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

function getLineStart(markdown: string, index: number): number {
  return markdown.lastIndexOf('\n', Math.max(0, index) - 1) + 1;
}

function getLineEnd(markdown: string, index: number): number {
  const lineEnd = markdown.indexOf('\n', index);
  return lineEnd === -1 ? markdown.length : lineEnd;
}

function ensureStandalonePrefix(text: string): string {
  if (!text) return '';
  if (text.endsWith('\n\n')) return text;
  if (text.endsWith('\n')) return `${text}\n`;
  return `${text}\n\n`;
}

function ensureStandaloneSuffix(text: string): string {
  if (!text) return '';
  if (text.startsWith('\n\n')) return text;
  if (text.startsWith('\n')) return `\n${text}`;
  return `\n\n${text}`;
}

function createInsertedHeading(markdown: string, headingText: string, selectionStart: number): InsertMarkdownHeadingResult {
  return {
    markdown,
    selectionStart,
    selectionEnd: selectionStart + headingText.length,
  };
}

export function insertMarkdownHeading(markdown: string, selectionStart: number, selectionEnd: number, level: 2 | 3): InsertMarkdownHeadingResult {
  const start = Math.max(0, selectionStart);
  const end = Math.max(start, selectionEnd);
  const prefix = `${'#'.repeat(level)} `;
  const fallbackText = level === 2 ? 'Section title' : 'Subsection title';
  const selectedText = markdown.slice(start, end).trim();

  if (!markdown.trim()) {
    const headingText = selectedText || fallbackText;
    return createInsertedHeading(`${prefix}${headingText}`, headingText, prefix.length);
  }

  const lineStart = getLineStart(markdown, start);
  const lineEnd = getLineEnd(markdown, end);
  const currentLine = markdown.slice(lineStart, lineEnd);
  const existingHeadingMatch = currentLine.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/);
  const headingText = selectedText || existingHeadingMatch?.[1]?.trim() || fallbackText;

  if (existingHeadingMatch) {
    const nextMarkdown = `${markdown.slice(0, lineStart)}${prefix}${headingText}${markdown.slice(lineEnd)}`;
    return {
      markdown: nextMarkdown,
      selectionStart: lineStart + prefix.length,
      selectionEnd: lineStart + prefix.length + headingText.length,
    };
  }

  const beforeHeading = ensureStandalonePrefix(markdown.slice(0, start).replace(/[ \t]+$/, ''));
  const nextMarkdown = `${beforeHeading}${prefix}${headingText}${ensureStandaloneSuffix(markdown.slice(end).replace(/^[ \t]+/, ''))}`;
  return createInsertedHeading(nextMarkdown, headingText, beforeHeading.length + prefix.length);
}
