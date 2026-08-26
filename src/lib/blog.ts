import type { Lang } from '../i18n';

type BlogPostLike = {
  id: string;
  data: {
    date?: Date | string | number;
    lang: Lang;
    translationKey?: string;
  } & Record<string, unknown>;
};

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
  const currentIndex = sortedLocalePosts.findIndex((post) => post.id === currentPost.id);
  if (currentIndex === -1) return null;

  return sortedLocalePosts[currentIndex + 1] ?? null;
}

export function getBlogStaticPathsForLocale<Post extends BlogPostLike>(posts: readonly Post[], lang: Lang) {
  return scopeBlogPostsToLocale(posts, lang).map((post) => ({ params: { slug: post.id }, props: { post } }));
}

function getBlogAlternateGroupKey(post: BlogPostLike): string {
  const translationKey = typeof post.data.translationKey === 'string' ? post.data.translationKey.trim() : '';
  return translationKey || post.id;
}

function getBlogRouteForPost(post: BlogPostLike): string {
  const blogPath = `/blog/${post.id}`;
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
