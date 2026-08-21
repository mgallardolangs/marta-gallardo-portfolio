import { useEffect } from 'react';
import { adminStore } from './adminStore';

interface Props {
  i18nJson: string;
  siteJson: string;
  lang: string;
}

export default function AdminInit({ i18nJson, siteJson, lang }: Props) {
  useEffect(() => {
    // Only init once — never re-init (would reset language selection)
    if (adminStore.isInitialized()) return;

    const parsedI18n = JSON.parse(i18nJson) as Record<string, unknown>;
    const parsedSite = JSON.parse(siteJson) as Record<string, unknown>;

    const tryInit = () => {
      if (adminStore.isInitialized()) return true;

      const w = window as typeof window & {
        netlifyIdentity?: { currentUser?: () => { token?: { access_token?: string } } | null };
      };
      const user = w.netlifyIdentity?.currentUser?.();

      if (user?.token?.access_token) {
        adminStore.init(parsedI18n, parsedSite, lang, user.token.access_token);
        adminStore.loadDraft();
        return true;
      }
      return false;
    };

    // Try immediately
    if (tryInit()) return;

    // Retry until auth is available (but stop once initialized)
    const interval = window.setInterval(() => {
      if (tryInit()) window.clearInterval(interval);
    }, 1000);

    // Fallback for local dev: init without token after 2s
    const fallback = window.setTimeout(() => {
      if (!adminStore.isInitialized()) {
        adminStore.init(parsedI18n, parsedSite, lang, '');
      }
      window.clearInterval(interval);
    }, 2000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(fallback);
    };
  }, []); // empty deps — run once only

  return null;
}
