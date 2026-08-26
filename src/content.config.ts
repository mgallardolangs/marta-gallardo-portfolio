import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // The frontmatter `slug` field is shared across every locale sibling of a logical
  // post, so it can't double as Astro's default collection entry id (which treats a
  // `slug` frontmatter field as an id override). Derive the id from the file's own
  // relative path instead, keeping one unique entry per locale Markdown file.
  loader: glob({
    base: './src/content/blog',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => entry.replace(/\.[^./]+$/, ''),
  }),
  schema: z.object({
    slug: z.string(),
    translationKey: z.string(),
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['es', 'en', 'fr', 'de', 'it', 'ca']).default('es'),
  }),
});

export const collections = { blog };
