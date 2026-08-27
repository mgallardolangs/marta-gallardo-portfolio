import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAdminStore } from './useAdminStore';
import {
  ADMIN_AUTH_GATE_OPEN_MAX_RETRIES,
  ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
  createAdminAuthGateOpenController,
} from '../../lib/adminInit.js';

type NetlifyIdentityEvent = 'open' | 'close' | 'login';

type NetlifyIdentityWindow = typeof window & {
  netlifyIdentity?: {
    open?: (view: 'login') => void;
    on?: (event: NetlifyIdentityEvent, callback: () => void) => void;
    off?: (event: NetlifyIdentityEvent, callback: () => void) => void;
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const loginButtonRef = useRef<HTMLButtonElement | null>(null);
  const openControllerRef = useRef<ReturnType<typeof createAdminAuthGateOpenController> | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const shouldRenderWall = !allowTokenless && !store.isAuthenticated && !isWidgetOpen;
  const isBlocking = shouldRenderWall;

  const getOpenController = () => {
    if (openControllerRef.current) return openControllerRef.current;

    openControllerRef.current = createAdminAuthGateOpenController({
      tryOpen: () => openNetlifyLogin(),
      scheduleRetry: (callback, delay) => window.setTimeout(callback, delay),
      clearRetry: (timeoutId) => window.clearTimeout(timeoutId),
      retryDelayMs: ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
      maxRetries: ADMIN_AUTH_GATE_OPEN_MAX_RETRIES,
    });

    return openControllerRef.current;
  };

  const handleManualLoginClick = () => {
    const opened = getOpenController().attemptManualOpen();
    if (opened) {
      // Hide the gate immediately so the widget's own modal (which uses a
      // lower z-index than this overlay) is visible without waiting for
      // the widget's own 'open' event to propagate through React state.
      setIsWidgetOpen(true);
    }
  };

  // Track the Netlify Identity widget's own modal state so this gate can
  // step out of the way while the login dialog is visible. Our overlay uses
  // z-index 150 with an opaque background; without this the widget's own
  // modal (z-index 99) would open behind our gate and the admin would see
  // nothing happen after clicking "Iniciar sesión".
  useEffect(() => {
    const identity = (window as NetlifyIdentityWindow).netlifyIdentity;
    if (!identity?.on) return;

    const onWidgetOpen = () => setIsWidgetOpen(true);
    const onWidgetClose = () => setIsWidgetOpen(false);
    const onWidgetLogin = () => setIsWidgetOpen(false);

    identity.on('open', onWidgetOpen);
    identity.on('close', onWidgetClose);
    identity.on('login', onWidgetLogin);

    return () => {
      identity.off?.('open', onWidgetOpen);
      identity.off?.('close', onWidgetClose);
      identity.off?.('login', onWidgetLogin);
    };
  }, []);

  // Keep the background admin shell inert only while this wall is actually
  // rendered. Ties the DOM inert flag directly to the same render decision
  // used below, then updates it synchronously via useLayoutEffect so the
  // admin becomes interactive the instant authentication succeeds — even if
  // React hasn't yet flushed a passive effect from the Identity listener.
  useLayoutEffect(() => {
    if (allowTokenless) return;
    const shell = document.getElementById(ADMIN_SHELL_ID) as InertElement | null;
    if (!shell) return;

    shell.inert = shouldRenderWall;

    return () => {
      shell.inert = false;
    };
  }, [allowTokenless, shouldRenderWall]);

  // Auto-open the Netlify Identity login dialog exactly once per production
  // unauthenticated page load. Manual and automatic opens share the same
  // success bookkeeping so a user-triggered login click can cancel a queued
  // auto-retry without blocking deliberate future manual clicks.
  useEffect(() => {
    if (allowTokenless) return;
    if (store.isAuthenticated) return;
    const openController = getOpenController();
    openController.attemptAutoOpen();

    return () => {
      openController.dispose();
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

  if (!shouldRenderWall) return null;

  const isExpired = store.initialized;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-gate-heading"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-ink p-6 text-paper"
    >
      <div className="w-full max-w-lg border border-paper/20 bg-ink p-8 text-left md:p-10">
        <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amaranth">
          MG · ADMIN
        </p>
        <h1 id="admin-auth-gate-heading" className="mt-5 font-heading text-4xl leading-none text-paper md:text-5xl">
          {isExpired ? 'Sesión de administrador expirada' : 'Acceso de administrador requerido'}
        </h1>
        <p className="mt-5 font-body text-sm leading-7 text-paper/70">
          {isExpired
            ? 'La sesión de administrador ha expirado. Tus cambios sin publicar siguen abiertos en esta pestaña; inicia sesión de nuevo para continuar sin recargar la página ni perder nada.'
            : 'No hay una sesión de administrador activa. Inicia sesión para abrir y usar el editor.'}
        </p>
        <button
          ref={loginButtonRef}
          type="button"
          autoFocus
          onClick={handleManualLoginClick}
          className="mt-7 inline-flex items-center justify-center border border-amaranth bg-amaranth px-6 py-3 font-body text-xs font-semibold uppercase tracking-[0.24em] text-ink transition-colors hover:bg-paper hover:text-amaranth"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
