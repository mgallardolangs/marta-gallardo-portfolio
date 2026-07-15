import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['es', 'en', 'fr', 'de', 'it', 'ca']).default('es'),
  }),
});

export const collections = { blog };
