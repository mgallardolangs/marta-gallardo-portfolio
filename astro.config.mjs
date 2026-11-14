// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { getBlogLastmodMap } from './src/lib/sitemapLastmod.mjs';

const blogLastmod = getBlogLastmodMap('https://marttelier.com');

// https://astro.build/config
export default defineConfig({
  site: 'https://marttelier.com',
  trailingSlash: 'never',
  image: {
    domains: ['img.youtube.com'],
  },
  build: {
    format: 'file',
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
      serialize(item) {
        const lastmod = blogLastmod.get(item.url.replace(/\/$/, ''));
        if (lastmod) item.lastmod = lastmod.toISOString();
        return item;
      },
    }),
  ],
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'fr', 'de', 'it', 'ca'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});