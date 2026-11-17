// Which blog posts each page recommends, by the post's translationKey (its folder in
// src/content/blog). Linking posts from the service and about pages gives them internal
// authority (Screaming Frog Link Score was 1-2 out of 100 on 15/11/2026, against 25 for
// the legal pages linked from the footer) and sends readers from a service to the post
// that explains it. The first key is the closest match; a page shows at most two.
export const relatedArticlesByRoute = {
  seo: [
    'seo-internacional-mas-alla-de-traducir-tu-web',
    'traduccion-seo',
  ],
  translation: [
    'traduccion-seo',
    'de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones',
  ],
  about: ['de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones'],
};

export const MAX_RELATED_ARTICLES = 2;

/**
 * Posts to show for a page, in the page's language and in the order above.
 * Keys without a post in that language are skipped, so a missing translation never
 * renders an empty card.
 */
export function getRelatedArticles(posts, routeKey, lang) {
  const keys = relatedArticlesByRoute[routeKey] ?? [];
  return keys
    .map((key) => posts.find((post) => post.data.translationKey === key && post.data.lang === lang))
    .filter(Boolean)
    .slice(0, MAX_RELATED_ARTICLES);
}
