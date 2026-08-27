import { useEffect, useRef, useState } from 'react';
import { useAdminStore } from './useAdminStore';
import { shouldAllowTokenlessAdminInit } from '../../lib/adminInit.js';

type NetlifyIdentityWindow = typeof window & {
  netlifyIdentity?: {
    open?: (view: 'login') => void;
  };
};

function openNetlifyLogin() {
  const identity = (window as NetlifyIdentityWindow).netlifyIdentity;
  if (typeof identity?.open === 'function') {
    identity.open('login');
  }
}

/**
 * Full-screen production auth wall: blocks every admin control until a real
 * Netlify Identity session exists. Local loopback hosts (see
 * shouldAllowTokenlessAdminInit) bypass this gate entirely so local preview
 * keeps working without login.
 */
export default function AdminAuthGate() {
  const store = useAdminStore();
  const [host, setHost] = useState<string | null>(null);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    // Only read window.location after mount so server rendering and the very
    // first client hydration pass stay identical (no window on the server).
    setHost(window.location.hostname);
  }, []);

  useEffect(() => {
    if (host === null) return;
    if (shouldAllowTokenlessAdminInit(host)) return;
    if (store.isAuthenticated) return;
    if (hasAutoOpenedRef.current) return;
    // Auto-open the Netlify Identity login dialog exactly once per production
    // unauthenticated page load. AdminInit no longer opens it, so this ref
    // guard is the single owner of that auto-open behavior.
    hasAutoOpenedRef.current = true;
    openNetlifyLogin();
  }, [host, store.isAuthenticated]);

  // Server render and the pre-effect client render must stay null so
  // hydration never mismatches.
  if (host === null) return null;
  if (shouldAllowTokenlessAdminInit(host)) return null;
  if (store.isAuthenticated) return null;

  const isExpired = store.initialized;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-gate-heading"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-charcoal/90 p-6 text-center backdrop-blur-sm"
    >
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 id="admin-auth-gate-heading" className="text-xl font-bold text-charcoal">
          {isExpired ? 'Sesión de administrador expirada' : 'Acceso de administrador requerido'}
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          {isExpired
            ? 'La sesión de administrador ha expirado. Tus cambios sin publicar siguen abiertos en esta pestaña; inicia sesión de nuevo para continuar sin recargar la página ni perder nada.'
            : 'No hay una sesión de administrador activa. Inicia sesión para abrir y usar el editor.'}
        </p>
        <button
          type="button"
          autoFocus
          onClick={openNetlifyLogin}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-charcoal px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal/80"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
