// ponytail: one file for all i18n logic, no library needed
import es from './es.json';
import en from './en.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import ca from './ca.json';

export const languages = { es, en, fr, de, it, ca } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'es';
export const langNames: Record<Lang, string> = { es: 'ES', en: 'EN', fr: 'FR', de: 'DE', it: 'IT', ca: 'CA' };
// ponytail: only these show in the language dropdown. Add de/it/ca back when translations are ready.
export const visibleLangs: Lang[] = ['es', 'en', 'fr'];

export function t(lang: Lang = defaultLang) {
  return languages[lang] ?? languages[defaultLang];
}

export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = url.pathname.split('/');
  if (maybeLang in languages) return maybeLang as Lang;
  return defaultLang;
}

export function stripLocaleFromPath(pathname: string): string {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);
  const [first, ...rest] = segments;

  if (first && first in languages) {
    const nextPath = `/${rest.join('/')}`.replace(/\/$/, '');
    return nextPath || '/';
  }

  return normalizedPath;
}

export function getLocalizedPath(path: string, lang: Lang): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // ponytail: ES is default (no prefix), others get /en/, /fr/, etc.
  if (lang === defaultLang) return normalizedPath;
  return `/${lang}${normalizedPath}`;
}
