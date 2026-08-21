import { useState } from 'react';
import { useAdminStore } from './useAdminStore';

const LANGS = [
  { code: 'es' as const, label: 'ES' },
  { code: 'en' as const, label: 'EN' },
  { code: 'fr' as const, label: 'FR' },
];

export default function AdminToolbar() {
  const store = useAdminStore();
  const [expanded, setExpanded] = useState(false);
  const draftToneClass = store.draftTone === 'success'
    ? 'text-green-400'
    : store.draftTone === 'warning'
      ? 'text-amber-300'
      : store.draftTone === 'error'
        ? 'text-red-400'
        : 'text-gray-400';

  return (
    <>
      {/* Floating pill button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-900 text-white rounded-full px-4 py-2 shadow-2xl flex items-center gap-2 text-sm hover:bg-gray-800 transition-colors cursor-pointer"
      >
        ✏️ Edit
        {store.isDirty && (
          <span className="bg-orange-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{store.pendingCount}</span>
        )}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white rounded-2xl shadow-2xl p-4 min-w-[240px]">
          {/* Language switcher */}
          <div className="mb-3">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Idioma</p>
            <div className="flex gap-1">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => store.setLang(l.code)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${store.currentLang === l.code ? 'bg-white text-gray-900 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {store.isDirty && (
              <button type="button" onClick={store.saveDraft} className="w-full text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                💾 Save draft
              </button>
            )}
            <button
              type="button"
              onClick={() => void store.publish()}
              disabled={!store.isDirty || store.isPublishing || store.orbitValidationErrors.length > 0}
              className={`w-full text-xs px-3 py-2 rounded-lg font-bold transition-colors text-left ${store.isDirty && store.orbitValidationErrors.length === 0 ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              {store.isPublishing ? '⏳ Publishing...' : '🚀 Publish changes'}
            </button>
            <a href="/" className="text-xs text-gray-400 hover:text-white px-3 py-2">
              ← Exit editor
            </a>
          </div>

          {/* Toasts */}
          {store.orbitValidationErrors.length > 0 && (
            <p className="mt-2 text-xs text-amber-300">⚠️ Fix the orbit warnings before publishing.</p>
          )}
          {store.draftMessage && <p className={`mt-2 text-xs ${draftToneClass}`}>💾 {store.draftMessage}</p>}
          {store.publishSuccess && <p className="mt-2 text-xs text-green-400">✅ Published! Rebuilds in ~2 min.</p>}
          {store.publishError && <p className="mt-2 text-xs text-red-400">❌ {store.publishError}</p>}
        </div>
      )}
    </>
  );
}
