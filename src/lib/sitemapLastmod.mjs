// Builds { "https://marttelier.com/<lang>/blog/<slug>": Date } for the sitemap's <lastmod>.
// Each post uses the date of the last git commit that touched its Markdown file, so
// edits (not only publication) tell Google to recrawl it; falls back to the frontmatter
// date when git history isn't available. Blog index pages get their newest post's date.
// Other pages get no lastmod: Google ignores lastmod values it can't trust.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}

export function getBlogLastmodMap(site, blogDir = 'src/content/blog') {
  const map = new Map();
  const newestByLang = new Map();
  for (const folder of readdirSync(blogDir)) {
    const dir = path.join(blogDir, folder);
    let files;
    try { files = readdirSync(dir).filter((f) => f.endsWith('.md')); } catch { continue; }
    for (const file of files) {
      const full = path.join(dir, file);
      const md = readFileSync(full, 'utf8');
      const field = (name) => md.match(new RegExp(`^${name}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim();
      const lang = field('lang') ?? 'es';
      const slug = field('slug') ?? folder;
      const fallback = field('date') ? new Date(field('date')) : null;
      const date = gitDate(full) ?? fallback;
      if (!date || Number.isNaN(date.valueOf())) continue;
      const prefix = lang === 'es' ? '' : `/${lang}`;
      map.set(new URL(`${prefix}/blog/${slug}`, site).href, date);
      const indexUrl = new URL(`${prefix}/blog`, site).href;
      if (!newestByLang.has(indexUrl) || newestByLang.get(indexUrl) < date) newestByLang.set(indexUrl, date);
    }
  }
  for (const [url, date] of newestByLang) map.set(url, date);
  return map;
}
