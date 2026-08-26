import type { Lang } from '../i18n';

type BlogPostLike = {
  id: string;
  data: {
    slug?: string;
    date?: Date | string | number;
    lang: Lang;
    translationKey?: string;
  } & Record<string, unknown>;
};

function getBlogPostSlug(post: BlogPostLike): string {
  const slug = typeof post.data.slug === 'string' ? post.data.slug.trim() : '';
  return slug || post.id;
}

function getBlogPostTimestamp(post: BlogPostLike): number {
  const value = post.data.date;
  if (value instanceof Date) return value.valueOf();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).valueOf();
  return 0;
}

export function sortBlogPostsByDateDesc<Post extends BlogPostLike>(posts: readonly Post[]): Post[] {
  return [...posts].sort((firstPost, secondPost) => getBlogPostTimestamp(secondPost) - getBlogPostTimestamp(firstPost));
}

export function scopeBlogPostsToLocale<Post extends BlogPostLike>(posts: readonly Post[], lang: Lang): Post[] {
  return posts.filter((post) => post.data.lang === lang);
}

export function getLatestAndArchive<Post extends BlogPostLike>(posts: readonly Post[], lang?: Lang) {
  const scopedPosts = lang ? scopeBlogPostsToLocale(posts, lang) : [...posts];
  const sortedPosts = sortBlogPostsByDateDesc(scopedPosts);

  return {
    latest: sortedPosts[0] ?? null,
    archive: sortedPosts.slice(1),
  };
}

export function getAdjacentLocalePost<Post extends BlogPostLike>(posts: readonly Post[], currentPost: Post | null | undefined): Post | null {
  if (!currentPost) return null;

  const sortedLocalePosts = sortBlogPostsByDateDesc(scopeBlogPostsToLocale(posts, currentPost.data.lang));
  const currentSlug = getBlogPostSlug(currentPost);
  // Compare by the shared/public slug (not the internal collection id) so lookups stay
  // robust regardless of how the underlying Markdown files are named on disk.
  const currentIndex = sortedLocalePosts.findIndex((post) => getBlogPostSlug(post) === currentSlug);
  if (currentIndex === -1) return null;

  return sortedLocalePosts[currentIndex + 1] ?? null;
}

export function getBlogStaticPathsForLocale<Post extends BlogPostLike>(posts: readonly Post[], lang: Lang) {
  return scopeBlogPostsToLocale(posts, lang).map((post) => ({ params: { slug: getBlogPostSlug(post) }, props: { post } }));
}

function getBlogAlternateGroupKey(post: BlogPostLike): string {
  const translationKey = typeof post.data.translationKey === 'string' ? post.data.translationKey.trim() : '';
  return translationKey || post.id;
}

function getBlogRouteForPost(post: BlogPostLike): string {
  const blogPath = `/blog/${getBlogPostSlug(post)}`;
  return post.data.lang === 'es' ? blogPath : `/${post.data.lang}${blogPath}`;
}

export function getBlogAlternateLinksForPost<Post extends BlogPostLike>(posts: readonly Post[], post: Post): Partial<Record<Lang, string>> {
  const groupKey = getBlogAlternateGroupKey(post);
  const siblingPosts = posts.filter((candidate) => getBlogAlternateGroupKey(candidate) === groupKey);

  return siblingPosts.reduce<Partial<Record<Lang, string>>>((alternates, siblingPost) => {
    alternates[siblingPost.data.lang] = getBlogRouteForPost(siblingPost);
    return alternates;
  }, {});
}

/**
 * True once a locale has zero or one published posts, so the public archive keeps
 * showing the "coming soon" placeholder row instead of an (empty) archive list.
 */
export function shouldShowBlogComingSoon(count: number): boolean {
  return count <= 1;
}

export type BlogAdminGroup<Post extends BlogPostLike = BlogPostLike> = {
  translationKey: string;
  slug: string;
  date?: BlogPostLike['data']['date'];
  image?: string;
  locales: Partial<Record<Lang, Post>>;
};

/**
 * Groups every locale Markdown entry belonging to the same logical post (by
 * translationKey) into a single admin row, exposing the shared slug/date/image
 * metadata alongside a per-locale entry map.
 */
export function groupBlogPostsForAdmin<Post extends BlogPostLike>(posts: readonly Post[]): BlogAdminGroup<Post>[] {
  const groups = new Map<string, BlogAdminGroup<Post>>();

  for (const post of posts) {
    const translationKey = getBlogAlternateGroupKey(post);
    const group: BlogAdminGroup<Post> = groups.get(translationKey) ?? {
      translationKey,
      slug: getBlogPostSlug(post),
      date: post.data.date,
      image: typeof post.data.image === 'string' ? post.data.image : undefined,
      locales: {},
    };

    group.locales[post.data.lang] = post;
    groups.set(translationKey, group);
  }

  return [...groups.values()];
}
