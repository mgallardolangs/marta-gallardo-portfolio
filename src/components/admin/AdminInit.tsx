import { useEffect } from 'react';
import { adminStore } from './adminStore';

interface Props {
  i18nJson: string;
  imagesJson: string;
  lang: string;
}

export default function AdminInit({ i18nJson, imagesJson, lang }: Props) {
  useEffect(() => {
    const parsedI18n = JSON.parse(i18nJson) as Record<string, unknown>;
    const parsedImages = JSON.parse(imagesJson) as Record<string, unknown>;

    const tryInit = () => {
      const user = (window as typeof window & {
        netlifyIdentity?: { currentUser?: () => { token?: { access_token?: string } } | null };
      }).netlifyIdentity?.currentUser?.();

      if (user?.token?.access_token) {
        adminStore.init(parsedI18n, parsedImages, lang, user.token.access_token);
        adminStore.loadDraft();
      }
    };

    tryInit();
    const interval = window.setInterval(tryInit, 1000);

    const fallback = window.setTimeout(() => {
      if (!adminStore.isInitialized()) {
        adminStore.init(parsedI18n, parsedImages, lang, '');
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(fallback);
    };
  }, [i18nJson, imagesJson, lang]);

  return null;
}
