import { useAdminStore } from './useAdminStore';

const LANGS = [
  { code: 'es' as const, label: '🇪🇸 ES' },
  { code: 'en' as const, label: '🇬🇧 EN' },
  { code: 'fr' as const, label: '🇫🇷 FR' },
];

const NAV = [
  { href: '/admin/', label: 'Inicio' },
  { href: '/admin/ugc', label: 'UGC' },
  { href: '/admin/translation-seo', label: 'Traducción' },
  { href: '/admin/contact', label: 'Contacto' },
  { href: '/admin/blog/', label: 'Blog' },
];

export default function AdminToolbar() {
  const store = useAdminStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gray-900 text-white shadow-xl print:hidden">
      <div className="flex items-center justify-between px-4 py-2 max-w-7xl mx-auto gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold bg-blue-500 px-2 py-1 rounded text-[10px]">✏️ EDIT</span>
          <div className="flex gap-0.5">
            {LANGS.map((lang) => (
              <button
                type="button"
                key={lang.code}
                onClick={() => store.setLang(lang.code)}
                className={`px-2 py-1 rounded transition-colors ${store.currentLang === lang.code ? 'bg-white text-gray-900 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="hidden md:flex gap-0.5">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="px-2 py-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {store.isDirty && (
            <span className="bg-orange-500 px-2 py-0.5 rounded-full font-bold">{store.pendingCount}</span>
          )}
          {store.isDirty && (
            <button type="button" onClick={store.saveDraft} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
              Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => void store.publish()}
            disabled={!store.isDirty || store.isPublishing}
            className={`px-3 py-1 rounded font-bold ${store.isDirty ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            {store.isPublishing ? '⏳...' : '🚀 Publish'}
          </button>
          <a href="/" className="text-gray-400 hover:text-white">Exit →</a>
        </div>
      </div>
      {store.publishSuccess && <div className="bg-green-600 text-center py-1 text-xs">✅ Published! Rebuilding in ~2 min.</div>}
      {store.publishError && <div className="bg-red-600 text-center py-1 text-xs">❌ {store.publishError}</div>}
    </div>
  );
}
