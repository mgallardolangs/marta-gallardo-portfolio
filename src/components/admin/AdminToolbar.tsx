import { useState } from 'react';
import { useAdminStore } from './useAdminStore';

function openNetlifyLogin() {
  const identity = (window as typeof window & {
    netlifyIdentity?: { open?: (view: 'login') => void };
  }).netlifyIdentity;

  if (typeof identity?.open === 'function') {
    identity.open('login');
  }
}

const LANGS = [
  { code: 'es' as const, label: 'ES' },
  { code: 'en' as const, label: 'EN' },
  { code: 'fr' as const, label: 'FR' },
];

const PUBLIC_PICKER_LANGS = [
  { code: 'es' as const, label: 'ES' },
  { code: 'en' as const, label: 'EN' },
  { code: 'fr' as const, label: 'FR' },
  { code: 'de' as const, label: 'DE' },
  { code: 'it' as const, label: 'IT' },
  { code: 'ca' as const, label: 'CA' },
];

const NAV_LABELS = [
  { key: 'nav.home', label: 'Inicio' },
  { key: 'nav.ugc', label: 'Contenido creativo' },
  { key: 'nav.translationSeo', label: 'Traducción / SEO' },
  { key: 'nav.blog', label: 'Blog' },
  { key: 'nav.contact', label: 'Contacto' },
] as const;

export default function AdminToolbar() {
  const store = useAdminStore();
  const [expanded, setExpanded] = useState(false);
  const publicLanguagePicker = store.getPublicLanguagePicker();
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
        className="bg-gray-900 text-white rounded-full px-4 py-2 shadow-2xl flex items-center gap-2 text-sm hover:bg-gray-800 transition-colors"
      >
        ✏️ Editar
        {store.isDirty && (
          <span className="bg-orange-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{store.pendingCount}</span>
        )}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white rounded-2xl shadow-2xl p-4 min-w-[288px]">
          {/* Admin session status */}
          <div className="mb-3 rounded-lg bg-gray-800 px-3 py-2">
            {store.isAuthenticated ? (
              <p className="text-[11px] font-semibold text-green-400">🟢 Sesión activa</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-amber-300">🔒 Inicia sesión para publicar</p>
                <button
                  type="button"
                  onClick={openNetlifyLogin}
                  className="text-[11px] font-semibold text-white underline underline-offset-2 hover:text-gray-200"
                >
                  Iniciar sesión
                </button>
              </div>
            )}
          </div>

          {/* Language switcher */}
          <div className="mb-3">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Idioma</p>
            <div className="flex gap-1">
              {LANGS.map((l) => (
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

          <div className="mb-3">
            <p className="mb-2 text-[10px] text-gray-400">Etiquetas de navegación</p>
            <div className="space-y-2">
              {NAV_LABELS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-[11px] text-gray-200">
                  <span className="w-24 shrink-0 text-[10px] uppercase tracking-[0.16em] text-gray-400">
                    {item.label}
                  </span>
                  <input
                    type="text"
                    aria-label={item.label}
                    value={store.getText(item.key)}
                    onChange={(event) => store.setText(item.key, event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-gray-800 px-2 py-1.5 text-xs text-white outline-none placeholder:text-gray-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Idiomas visibles</p>
            <div className="flex flex-wrap gap-1.5">
              {PUBLIC_PICKER_LANGS.map((pickerLang) => {
                const isVisible = publicLanguagePicker.includes(pickerLang.code);

                return (
                  <button
                    key={pickerLang.code}
                    type="button"
                    disabled={pickerLang.code === 'es'}
                    onClick={() => store.setPublicLanguageVisibility(pickerLang.code, !isVisible)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                      isVisible
                        ? 'bg-white text-gray-900 font-semibold'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    } ${pickerLang.code === 'es' ? 'opacity-70' : ''}`}
                  >
                    <span aria-hidden="true">{isVisible ? '✓' : '○'}</span>
                    {pickerLang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {store.isDirty && (
              <div className="space-y-1">
                <button type="button" onClick={store.saveDraft} className="w-full text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                  💾 Guardar borrador
                </button>
                <p className="px-1 text-[10px] text-gray-400">
                  Guardar borrador guarda el texto y los ajustes en este navegador; los archivos subidos solo habrá que volver a seleccionarlos si recargas la página.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => void store.publish()}
                disabled={!store.isAuthenticated || !store.isDirty || store.isPublishing || store.orbitValidationErrors.length > 0}
                className={`w-full text-xs px-3 py-2 rounded-lg font-bold transition-colors text-left ${store.isAuthenticated && store.isDirty && store.orbitValidationErrors.length === 0 ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-700 text-gray-500'}`}
              >
                {store.isPublishing ? '⏳ Publicando…' : '🚀 Publicar cambios'}
              </button>
              <p className="px-1 text-[10px] text-gray-400">
                Publicar cambios envía los cambios al repositorio y reconstruye el sitio público.
              </p>
            </div>
            <a href="/" className="text-xs text-gray-400 hover:text-white px-3 py-2">
              ← Salir del editor
            </a>
          </div>

          {/* Toasts */}
          {store.orbitValidationErrors.length > 0 && (
            <p className="mt-2 text-xs text-amber-300">⚠️ Corrige los avisos del orbit antes de publicar.</p>
          )}
          {store.draftMessage && <p className={`mt-2 text-xs ${draftToneClass}`}>💾 {store.draftMessage}</p>}
          {store.publishSuccess && <p className="mt-2 text-xs text-green-400">✅ ¡Publicado! El sitio se reconstruirá en ~2 min.</p>}
          {store.publishError && <p className="mt-2 text-xs text-red-400">❌ {store.publishError}</p>}
        </div>
      )}
    </>
  );
}
