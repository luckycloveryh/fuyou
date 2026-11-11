import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'post'>;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path = '') => {
  const result = `${base}/${path.replace(/^\//, '')}`.replace(/\/$/, '');
  return /\.[a-z0-9]+$/i.test(result) ? result : `${result}/`;
};
export const postSlug = (post: Post) => post.data.slug || post.id.replace(/\.md$/, '').replace(/\/index$/, '');
export const postUrl = (post: Post) => url(`p/${postSlug(post)}`);
export const taxonomySlug = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[\\/:*?"<>|#%&+,，。！？；：、()[\]{}]/g, '').replace(/-+/g, '-');
export async function getPosts() {
  return (await getCollection('post', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
export const formatDate = (date: Date) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const pageUrl = (page: number, section = '') => page <= 1 ? url(section) : url(`${section ? `${section}/` : ''}page/${page}`);
export const plainText = (body: string) => body.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`~|-]/g, ' ').replace(/\s+/g, ' ').trim();
