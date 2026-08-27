import { useEffect, useRef } from 'react';
import { useAdminStore } from './useAdminStore';
import {
  ADMIN_AUTH_GATE_OPEN_MAX_RETRIES,
  ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
} from '../../lib/adminInit.js';

type NetlifyIdentityWindow = typeof window & {
  netlifyIdentity?: {
    open?: (view: 'login') => void;
  };
};

type InertElement = HTMLElement & { inert: boolean };

const ADMIN_SHELL_ID = 'admin-editing-shell';

interface Props {
  allowTokenless: boolean;
}

/**
 * Opens the Netlify Identity login dialog. Returns true only when the widget
 * script had already defined `open` and the call was actually made, so
 * callers can tell a real open from a silent no-op (widget still loading).
 */
function openNetlifyLogin(): boolean {
  const identity = (window as NetlifyIdentityWindow).netlifyIdentity;
  if (typeof identity?.open !== 'function') return false;
  identity.open('login');
  return true;
}

/**
 * Full-screen production auth wall: blocks every admin control until a real
 * Netlify Identity session exists. AdminLayout computes the local bypass
 * (see shouldAllowTokenlessAdminInit) from Astro.url.hostname while server
 * rendering and passes it down as `allowTokenless`, so this gate's very
 * first server-rendered markup and its first client render always agree —
 * there is no host-lookup effect that would flash nothing before the wall
 * appears.
 */
export default function AdminAuthGate({ allowTokenless }: Props) {
  const store = useAdminStore();
  const hasAutoOpenedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const loginButtonRef = useRef<HTMLButtonElement | null>(null);
  const isBlocking = !allowTokenless && !store.isAuthenticated;

  // Keep the background admin shell inert while this wall is showing, and
  // restore it the instant a real session exists (or this gate unmounts).
  useEffect(() => {
    if (allowTokenless) return;
    const shell = document.getElementById(ADMIN_SHELL_ID) as InertElement | null;
    if (!shell) return;

    shell.inert = !store.isAuthenticated;

    return () => {
      shell.inert = false;
    };
  }, [allowTokenless, store.isAuthenticated]);

  // Auto-open the Netlify Identity login dialog exactly once per production
  // unauthenticated page load. The widget script can still be loading when
  // this effect first runs, so retry on a bounded timer until `open` exists,
  // and only flip the one-shot flag after a real, successful call — never
  // before — so a slow widget cannot be silently skipped, and a fast one
  // cannot be reopened into a modal storm.
  useEffect(() => {
    if (allowTokenless) return;
    if (store.isAuthenticated) return;
    if (hasAutoOpenedRef.current) return;

    let attempts = 0;
    let timeoutId: number | undefined;

    const tryOpen = () => {
      if (openNetlifyLogin()) {
        hasAutoOpenedRef.current = true;
        return;
      }

      attempts += 1;
      if (attempts >= ADMIN_AUTH_GATE_OPEN_MAX_RETRIES) return;
      timeoutId = window.setTimeout(tryOpen, ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS);
    };

    tryOpen();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [allowTokenless, store.isAuthenticated]);

  // Trap Tab/Shift+Tab on the single login CTA: this dialog only ever has
  // one focusable control, so any Tab press should keep focus there instead
  // of escaping into the (inert) background shell.
  useEffect(() => {
    if (!isBlocking) return;

    const node = dialogRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      loginButtonRef.current?.focus();
    };

    node?.addEventListener('keydown', handleKeyDown);
    return () => {
      node?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBlocking]);

  if (allowTokenless) return null;
  if (store.isAuthenticated) return null;

  const isExpired = store.initialized;

  return (
    <div
      ref={dialogRef}
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
          ref={loginButtonRef}
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
