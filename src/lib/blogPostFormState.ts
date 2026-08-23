import { insertMarkdownHeading } from './blogOutline.ts';

export type BlogToolbarAction = 'h2' | 'h3' | 'bold' | 'link';
export type BlogSelection = { start: number; end: number };
export type BlogImagePreviewState = { file: File | null; previewUrl: string };

const DEFAULT_LINK_URL = 'https://example.com';

export function applyBlogToolbarAction(markdown: string, selection: BlogSelection, action: BlogToolbarAction) {
  const start = Math.max(0, selection.start);
  const end = Math.max(start, selection.end);
  const selectedText = markdown.slice(start, end);

  if (action === 'h2' || action === 'h3') {
    const level = action === 'h2' ? 2 : 3;
    const prefix = `${'#'.repeat(level)} `;
    const nextMarkdown = insertMarkdownHeading(markdown, start, end, level);
    const nextText = selectedText.trim() || (level === 2 ? 'Section title' : 'Subsection title');

    return {
      markdown: nextMarkdown,
      selection: {
        start: start + prefix.length,
        end: start + prefix.length + nextText.length,
      },
    };
  }

  if (action === 'bold') {
    const nextText = selectedText || 'bold text';
    const wrappedText = `**${nextText}**`;

    return {
      markdown: `${markdown.slice(0, start)}${wrappedText}${markdown.slice(end)}`,
      selection: {
        start: start + 2,
        end: start + 2 + nextText.length,
      },
    };
  }

  const nextText = selectedText || 'Link text';
  const wrappedText = `[${nextText}](${DEFAULT_LINK_URL})`;
  const urlStart = start + nextText.length + 3;

  return {
    markdown: `${markdown.slice(0, start)}${wrappedText}${markdown.slice(end)}`,
    selection: {
      start: urlStart,
      end: urlStart + DEFAULT_LINK_URL.length,
    },
  };
}

export function createBlogImagePreviewState(
  file: File,
  createObjectURL: (file: File) => string = (nextFile) => URL.createObjectURL(nextFile),
): BlogImagePreviewState {
  return {
    file,
    previewUrl: createObjectURL(file),
  };
}

export function clearBlogImagePreviewState(
  state: BlogImagePreviewState,
  revokeObjectURL: (url: string) => void = (url) => URL.revokeObjectURL(url),
): BlogImagePreviewState {
  if (state.previewUrl) {
    revokeObjectURL(state.previewUrl);
  }

  return {
    file: null,
    previewUrl: '',
  };
}
