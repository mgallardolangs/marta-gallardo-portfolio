import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['es', 'en', 'fr', 'de', 'it', 'ca']).default('es'),
    translationKey: z.string().optional(),
  }),
});

export const collections = { blog };
