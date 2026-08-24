import { useEffect, useMemo, useState } from 'react';
import type { BlogOutlineEntry } from '../lib/blogOutline';
import { decodeBlogHash } from '../lib/blogTableOfContents';

type TocHeading = BlogOutlineEntry & {
  depth?: number;
  level?: number;
};

type TocChild = BlogOutlineEntry['children'][number] & {
  depth?: number;
  level?: number;
};

type Props = {
  headings: TocHeading[];
  title: string;
  readTimeLabel: string;
  readTime: number;
};

function flattenHeadingIds(headings: Array<TocHeading & { children: TocChild[] }>) {
  return headings.flatMap((heading) => [heading.id, ...heading.children.map((child) => child.id)]).filter(Boolean);
}

export default function BlogTableOfContents({ headings, title, readTimeLabel, readTime }: Props) {
  const entries = useMemo(
    () => headings
      .filter((heading) => heading.depth === 2 || heading.level === 2)
      .map((heading, index) => {
        const number = heading.number ?? String(index + 1).padStart(2, '0');
        const children = (heading.children ?? [])
          .filter((child) => child.depth === 3 || child.level === 3)
          .map((child, childIndex) => ({
            ...child,
            number: child.number ?? `${number}.${childIndex + 1}`,
          }));

        return {
          ...heading,
          number,
          children,
        };
      }),
    [headings],
  );
  const headingIds = useMemo(() => flattenHeadingIds(entries), [entries]);
  const [activeId, setActiveId] = useState(entries[0]?.id ?? '');

  useEffect(() => {
    if (typeof window === 'undefined' || headingIds.length === 0) return undefined;

    const elements = headingIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return undefined;

    const applyHash = () => {
      const hashId = decodeBlogHash(window.location.hash, headingIds);
      if (hashId) {
        setActiveId(hashId);
        return;
      }
      setActiveId(elements[0]?.id ?? '');
    };

    applyHash();

    const observer = new IntersectionObserver(
      (observedEntries) => {
        const visibleEntries = observedEntries
          .filter((entry) => entry.isIntersecting)
          .sort((firstEntry, secondEntry) => firstEntry.boundingClientRect.top - secondEntry.boundingClientRect.top);

        const nextActiveId = visibleEntries[0]?.target.id;
        if (nextActiveId) {
          setActiveId(nextActiveId);
        }
      },
      {
        rootMargin: '-112px 0px -55% 0px',
        threshold: [0.1, 0.35, 0.7],
      },
    );

    elements.forEach((element) => observer.observe(element));
    window.addEventListener('hashchange', applyHash);

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', applyHash);
    };
  }, [headingIds]);

  const nestedHeadings = entries.flatMap((entry) => entry.children.filter((heading) => heading.depth === 3 || heading.level === 3));
  const chipEntries = [...entries, ...nestedHeadings];

  return (
    <>
      <nav aria-labelledby="blog-toc-title-mobile" className="order-first overflow-x-auto border-y border-black/10 lg:hidden">
        <div className="flex min-w-max items-center gap-2 py-3">
          <p id="blog-toc-title-mobile" className="pr-3 font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-accent-ink">
            {title}
          </p>
          {chipEntries.map((heading) => {
            const isActive = activeId === heading.id;
            return (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                aria-current={isActive ? 'location' : undefined}
                data-active={isActive ? 'true' : 'false'}
                className={`border px-3 py-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition ${isActive ? 'border-amaranth text-amaranth' : 'border-black/10 text-ink-muted hover:border-black hover:text-ink'}`}
              >
                {heading.number} {heading.text}
              </a>
            );
          })}
        </div>
      </nav>

      <aside className="hidden lg:block">
        <nav aria-labelledby="blog-toc-title" className="sticky top-28 border-t border-black/10 pt-4">
          <div className="mb-6 space-y-2">
            <p id="blog-toc-title" className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-accent-ink">
              {title}
            </p>
            <p className="font-body text-[0.72rem] uppercase tracking-[0.18em] text-ink-faint">
              {readTimeLabel} · {String(readTime).padStart(2, '0')} min
            </p>
          </div>

          <ol className="space-y-4">
            {entries.map((heading) => {
              const isHeadingActive = activeId === heading.id || heading.children.some((child) => child.id === activeId);

              return (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    aria-current={activeId === heading.id ? 'location' : undefined}
                    data-active={isHeadingActive ? 'true' : 'false'}
                    className={`flex gap-3 border-l pl-3 transition ${isHeadingActive ? 'border-amaranth text-amaranth' : 'border-black/10 text-ink hover:border-black hover:text-ink'}`}
                  >
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em]">{heading.number}</span>
                    <span className="font-body text-sm leading-6">{heading.text}</span>
                  </a>

                  {heading.children.length > 0 && (
                    <ol className="mt-3 space-y-3 pl-4">
                      {heading.children.map((child) => {
                        const isChildActive = activeId === child.id;
                        return (
                          <li key={child.id}>
                            <a
                              href={`#${child.id}`}
                              aria-current={isChildActive ? 'location' : undefined}
                              data-active={isChildActive ? 'true' : 'false'}
                              className={`flex gap-3 border-l pl-3 transition ${isChildActive ? 'border-amaranth text-amaranth' : 'border-black/10 text-ink-muted hover:border-black hover:text-ink'}`}
                            >
                              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em]">{child.number}</span>
                              <span className="font-body text-sm leading-6">{child.text}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>
    </>
  );
}
