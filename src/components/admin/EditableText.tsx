import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import { useAdminStore } from './useAdminStore';

interface Props {
  i18nKey: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

const blockTags = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'li']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatText(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function parseHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n');

  const temp = document.createElement('div');
  temp.innerHTML = withBreaks;
  return (temp.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function EditableText({ i18nKey, as: Tag = 'span', className = '' }: Props) {
  const { getText, setText } = useAdminStore();
  const [isEditing, setIsEditing] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const text = getText(i18nKey);
  const TagName = Tag;
  const WrapperTag = (blockTags.has(Tag) ? 'div' : 'span') as keyof JSX.IntrinsicElements;

  useEffect(() => {
    if (!ref.current || isEditing) return;
    ref.current.innerHTML = formatText(text);
  }, [isEditing, text]);

  const stopEvent = useCallback((event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const startEditing = useCallback((event: MouseEvent<HTMLElement>) => {
    stopEvent(event);
    setIsEditing(true);
    window.setTimeout(() => ref.current?.focus(), 0);
  }, [stopEvent]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    if (!ref.current) return;
    const newText = parseHtml(ref.current.innerHTML);
    if (newText !== text) {
      setText(i18nKey, newText);
    } else {
      ref.current.innerHTML = formatText(text);
    }
  }, [i18nKey, setText, text]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditing(false);
      if (ref.current) {
        ref.current.innerHTML = formatText(text);
      }
    }
  }, [text]);

  return (
    <WrapperTag
      className={`group/edit relative ${blockTags.has(Tag) ? 'block' : 'inline-block'} max-w-full align-top`}
      onClick={startEditing}
      onClickCapture={startEditing}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{ cursor: 'text' }}
    >
      <TagName
        ref={(node) => {
          ref.current = node as HTMLElement | null;
        }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={stopEditing}
        onKeyDown={handleKeyDown}
        onClick={(event: MouseEvent<HTMLElement>) => stopEvent(event)}
        onClickCapture={(event: MouseEvent<HTMLElement>) => stopEvent(event)}
        className={`${className} ${isEditing ? 'outline outline-2 outline-blue-400 rounded-lg px-1 bg-blue-50/20 min-w-[2rem]' : ''}`}
        dangerouslySetInnerHTML={{ __html: formatText(text) }}
      />
      {!isEditing && (
        <button
          type="button"
          onClick={(event) => startEditing(event as unknown as MouseEvent<HTMLElement>)}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="absolute -top-3 -right-3 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-lg z-[60] hover:bg-blue-600"
          title={`Edit: ${i18nKey}`}
        >
          ✏️
        </button>
      )}
    </WrapperTag>
  );
}
