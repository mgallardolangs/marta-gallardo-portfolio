import { useEffect } from 'react';
import { adminStore } from './adminStore';
import {
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
    let draftLoaded = adminStore.isInitialized();

    const applyIdentityState = (allowTokenlessFallback: boolean) => {
      const w = window as typeof window & {
        netlifyIdentity?: {
          currentUser?: () => { token?: { access_token?: string } } | null;
          on?: (event: 'init' | 'login', callback: () => void) => void;
        };
      };
      const token = getNetlifyIdentityToken(w.netlifyIdentity?.currentUser?.());
      const decision = getAdminInitDecision({
        isInitialized: adminStore.isInitialized(),
        identityToken: token,
        allowTokenlessFallback,
      });

      if (decision === 'init-with-token' || decision === 'init-without-token') {
        adminStore.init(parsedI18n, parsedSite, lang, token);
        if (!draftLoaded) {
          adminStore.loadDraft();
          draftLoaded = true;
        }
        return true;
      }

      if (decision === 'update-token') {
        adminStore.init(parsedI18n, parsedSite, lang, token);
        return true;
      }

      return false;
    };

    const allowLocalFallback = shouldAllowTokenlessAdminInit(window.location.hostname);
    const syncIdentity = () => applyIdentityState(false);

    syncIdentity();

    const interval = window.setInterval(() => {
      if (syncIdentity()) {
        window.clearInterval(interval);
      }
    }, 1000);

    const identity = (window as typeof window & {
      netlifyIdentity?: {
        on?: (event: 'init' | 'login', callback: () => void) => void;
      };
    }).netlifyIdentity;

    const onIdentityChange = () => {
      if (syncIdentity()) {
        window.clearInterval(interval);
      }
    };

    identity?.on?.('init', onIdentityChange);
    identity?.on?.('login', onIdentityChange);

    const fallback = allowLocalFallback
      ? window.setTimeout(() => {
          if (applyIdentityState(true)) {
            return;
          }
        }, 2000)
      : undefined;

    return () => {
      window.clearInterval(interval);
      if (fallback) window.clearTimeout(fallback);
    };
  }, []); // empty deps — run once only

  return null;
}
