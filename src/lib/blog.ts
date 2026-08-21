import type { Lang } from '../i18n';

type BlogPostLike = {
  id: string;
  data: {
    lang: Lang;
    translationKey?: string;
  } & Record<string, unknown>;
};

export function scopeBlogPostsToLocale<Post extends BlogPostLike>(posts: readonly Post[], lang: Lang): Post[] {
  return posts.filter((post) => post.data.lang === lang);
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
