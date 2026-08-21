import type { Lang } from '../i18n';

type BlogPostLike = {
  id: string;
  data: {
    lang: Lang;
  };
};

export function scopeBlogPostsToLocale<Post extends BlogPostLike>(posts: readonly Post[], lang: Lang): Post[] {
  return posts.filter((post) => post.data.lang === lang);
}

export function getBlogStaticPathsForLocale<Post extends BlogPostLike>(posts: readonly Post[], lang: Lang) {
  return scopeBlogPostsToLocale(posts, lang).map((post) => ({ params: { slug: post.id }, props: { post } }));
}
