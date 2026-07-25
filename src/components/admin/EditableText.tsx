import { useEffect, useRef, useState } from 'react';
import { adminStore } from './adminStore';

interface Props {
  i18nKey: string;
  as?: string;
  className?: string;
}

function formatText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\\n/g, '<br/>')
    .replace(/\n/g, '<br/>');
}

function htmlToText(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html.replace(/<br\s*\/?>/gi, '\\n').replace(/<\/p>\s*<p[^>]*>/gi, '\\n');
  return (d.textContent || '').replace(/\u00a0/g, ' ').trim();
}

/*
 * ponytail: React is NOT allowed to touch innerHTML during editing.
 * - No dangerouslySetInnerHTML
 * - No useSyncExternalStore (causes re-renders that clobber content)
 * - All DOM manipulation via refs
 * - Store subscription only updates when NOT editing
 */
export default function EditableText({ i18nKey, as: Tag = 'span', className = '' }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const [editing, setEditing] = useState(false);

  // Mount: set initial text + subscribe to store (but skip updates while editing)
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.innerHTML = formatText(adminStore.getText(i18nKey));
    return adminStore.subscribe(() => {
      if (!editingRef.current && el) {
        el.innerHTML = formatText(adminStore.getText(i18nKey));
      }
    });
  }, [i18nKey]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingRef.current) return;
    editingRef.current = true;
    setEditing(true);
    const el = elRef.current;
    if (el) {
      el.contentEditable = 'true';
      el.focus();
    }
  };

  const finishEdit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    const el = elRef.current;
    if (!el) return;
    el.contentEditable = 'false';
    const newText = htmlToText(el.innerHTML);
    const oldText = adminStore.getText(i18nKey);
    if (newText !== oldText) {
      adminStore.setText(i18nKey, newText);
    }
    el.innerHTML = formatText(adminStore.getText(i18nKey));
  };

  const cancelEdit = () => {
    editingRef.current = false;
    setEditing(false);
    const el = elRef.current;
    if (el) {
      el.contentEditable = 'false';
      el.innerHTML = formatText(adminStore.getText(i18nKey));
    }
  };

  // Use native event listener for keydown to avoid React interference
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [i18nKey]);

  const isBlock = ['div','p','h1','h2','h3','h4','h5','h6','section','li'].includes(Tag);

  return (
    <div
      className={`group/edit relative ${isBlock ? 'block' : 'inline-block'}`}
      style={{ display: isBlock ? 'block' : 'inline-block' }}
    >
      {/* The actual editable element — React NEVER sets its innerHTML after mount */}
      <div
        ref={elRef}
        onClick={startEdit}
        onBlur={finishEdit}
        suppressContentEditableWarning
        className={`${className} ${editing ? 'outline outline-2 outline-blue-400 rounded-lg bg-blue-50/20' : 'cursor-pointer'}`}
        style={{ minWidth: '1rem' }}
      />
      {!editing && (
        <button
          type="button"
          onClick={startEdit}
          className="absolute -top-3 -right-3 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-lg z-[60] hover:bg-blue-600"
        >
          ✏️
        </button>
      )}
    </div>
  );
}
