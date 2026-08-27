import { useEffect } from 'react';
import { adminStore } from './adminStore';
import originalEs from '../../i18n/es.json';
import originalEn from '../../i18n/en.json';
import originalFr from '../../i18n/fr.json';
import {
  ADMIN_INIT_FALLBACK_DELAY_MS,
  ADMIN_INIT_MAX_RETRIES,
  ADMIN_INIT_RETRY_DELAY_MS,
  getAdminInitDecision,
  getNetlifyIdentityToken,
  shouldAllowTokenlessAdminInit,
} from '../../lib/adminInit.js';

interface Props {
  i18nJson: string;
  siteJson: string;
  lang: string;
}

export default function AdminInit({ i18nJson, siteJson, lang }: Props) {
  useEffect(() => {
    const parsedI18n = JSON.parse(i18nJson) as Record<string, unknown>;
    const parsedSite = JSON.parse(siteJson) as Record<string, unknown>;
    const restoredI18n = {
      ...parsedI18n,
      es: {
        ...(parsedI18n.es as Record<string, unknown>),
        translationPage: {
          ...(((parsedI18n.es as Record<string, unknown>)?.translationPage as Record<string, unknown>) ?? {}),
          heroMark: originalEs.translationPage.heroMark,
        },
      },
      en: {
        ...(parsedI18n.en as Record<string, unknown>),
        translationPage: {
          ...(((parsedI18n.en as Record<string, unknown>)?.translationPage as Record<string, unknown>) ?? {}),
          heroMark: originalEn.translationPage.heroMark,
        },
      },
      fr: {
        ...(parsedI18n.fr as Record<string, unknown>),
        translationPage: {
          ...(((parsedI18n.fr as Record<string, unknown>)?.translationPage as Record<string, unknown>) ?? {}),
          heroMark: originalFr.translationPage.heroMark,
        },
      },
    };
    let draftLoaded = adminStore.isInitialized();
    let identityListenersCleanup: (() => void) | null = null;
    let identityInitStarted = false;
    let retryAttempts = 0;
    let retryTimeout: number | undefined;

    const hostAllowsTokenlessFallback = shouldAllowTokenlessAdminInit(window.location.hostname);

    const applyIdentityState = (allowTokenlessFallback: boolean) => {
      const w = window as typeof window & {
        netlifyIdentity?: {
          init?: () => void;
          open?: (view: 'login') => void;
          currentUser?: () => { token?: { access_token?: string } } | null;
          on?: (event: 'init' | 'login' | 'logout', callback: () => void) => void;
          off?: (event: 'init' | 'login' | 'logout', callback: () => void) => void;
        };
      };
      const token = getNetlifyIdentityToken(w.netlifyIdentity?.currentUser?.());
      const decision = getAdminInitDecision({
        isInitialized: adminStore.isInitialized(),
        identityToken: token,
        allowTokenlessFallback,
      });

      if (decision === 'init-with-token' || decision === 'init-without-token') {
        adminStore.init(restoredI18n, parsedSite, lang, token);
        if (!draftLoaded) {
          adminStore.loadDraft();
          draftLoaded = true;
        }
        return true;
      }

      if (decision === 'update-token') {
        adminStore.setAuthToken(token);
        return true;
      }

      // decision === 'wait': production has no user/token yet. AdminAuthGate
      // owns the login prompt in this case, so AdminInit only keeps polling
      // for a future 'init'/'login' identity event instead of opening the
      // Netlify Identity widget itself.
      return false;
    };

    const allowTokenlessFallback = hostAllowsTokenlessFallback;
    const bindIdentityListeners = () => {
      const identity = (window as typeof window & {
        netlifyIdentity?: {
          init?: () => void;
          open?: (view: 'login') => void;
          on?: (event: 'init' | 'login' | 'logout', callback: () => void) => void;
          off?: (event: 'init' | 'login' | 'logout', callback: () => void) => void;
        };
      }).netlifyIdentity;

      if (!identity?.on) return false;
      if (identityListenersCleanup) return true;

      const onIdentityChange = () => {
        applyIdentityState(false);
      };
      const onIdentityLogout = () => {
        adminStore.clearAuthToken();
      };

      identity.on('init', onIdentityChange);
      identity.on('login', onIdentityChange);
      identity.on('logout', onIdentityLogout);
      identityListenersCleanup = () => {
        identity.off?.('init', onIdentityChange);
        identity.off?.('login', onIdentityChange);
        identity.off?.('logout', onIdentityLogout);
        identityListenersCleanup = null;
      };

      if (identity.init && !identityInitStarted) {
        identity.init();
        identityInitStarted = true;
      }

      return true;
    };

    const syncIdentity = () => {
      const listenersBound = bindIdentityListeners();
      const identityApplied = applyIdentityState(false);
      return listenersBound || identityApplied;
    };

    const attemptIdentitySync = () => {
      if (syncIdentity()) {
        return;
      }

      retryAttempts += 1;
      if (retryAttempts >= ADMIN_INIT_MAX_RETRIES) {
        return;
      }

      retryTimeout = window.setTimeout(attemptIdentitySync, ADMIN_INIT_RETRY_DELAY_MS);
    };

    attemptIdentitySync();

    const fallback = allowTokenlessFallback
      ? window.setTimeout(() => {
          applyIdentityState(true);
        }, ADMIN_INIT_FALLBACK_DELAY_MS)
      : undefined;

    return () => {
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
      if (fallback) window.clearTimeout(fallback);
      identityListenersCleanup?.();
    };
  }, []); // empty deps — run once only

  return null;
}
