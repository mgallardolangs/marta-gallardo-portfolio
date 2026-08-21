import { useEffect, useMemo, useRef, useState } from 'react';

import {
  EXPERIENCE_TAB_IDS,
  getNextExperienceTabIndex,
  type ExperienceTabId,
} from '../../lib/experienceTabs.ts';

type ExperienceCard = {
  title: string;
  highlight: string;
  text: string;
};

interface Props {
  tabListAriaLabel: string;
  tabs: {
    education: {
      label: string;
      intro: string;
      studies: string[];
    };
    experience: {
      label: string;
      intro: string;
      cards: ExperienceCard[];
    };
  };
}

export default function ExperienceTabs({ tabListAriaLabel, tabs }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRefs = useRef<Record<ExperienceTabId, HTMLDivElement | null>>({
    education: null,
    experience: null,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const measure = () => {
      const heights = EXPERIENCE_TAB_IDS
        .map((tabId) => panelRefs.current[tabId]?.scrollHeight ?? 0)
        .filter(Boolean);

      setPanelHeight(heights.length > 0 ? Math.max(...heights) : null);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tabs]);

  const panels = useMemo(() => ([
    {
      id: 'education' as const,
      label: tabs.education.label,
      content: (
        <div className="space-y-6">
          <p className="text-base leading-8 text-ink-muted">{tabs.education.intro}</p>
          <ul className="space-y-4">
            {tabs.education.studies.map((study) => (
              <li key={study} className="flex gap-3 text-base leading-8 text-ink">
                <span className="mt-3 h-2 w-2 rounded-full bg-amaranth" />
                <span>{study}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: 'experience' as const,
      label: tabs.experience.label,
      content: (
        <div className="space-y-8">
          <p className="text-base leading-8 text-ink-muted">{tabs.experience.intro}</p>
          <div className="grid gap-5 lg:grid-cols-3">
            {tabs.experience.cards.map((card) => (
              <article key={`${card.highlight}-${card.title}`} className="border border-black/10 bg-paper p-5">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.24em] text-amaranth">{card.highlight}</p>
                <h3 className="mt-4 font-heading text-2xl text-ink">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-ink-muted">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      ),
    },
  ]), [tabs]);

  return (
    <section className="border border-black/10 bg-white shadow-[0_20px_64px_rgba(6,4,3,0.08)]">
      <div className="border-b border-black/10 bg-paper px-4 py-4 md:px-6">
        <div role="tablist" aria-label={tabListAriaLabel} className="flex flex-wrap items-center gap-3">
          {panels.map((panel, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={panel.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={`experience-tab-${panel.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`experience-panel-${panel.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  const nextIndex = getNextExperienceTabIndex(index, event.key);
                  if (nextIndex === index) return;

                  event.preventDefault();
                  setActiveIndex(nextIndex);
                  tabRefs.current[nextIndex]?.focus();
                }}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${isActive ? 'border-amaranth bg-amaranth text-ink' : 'border-black/10 bg-white text-ink-muted hover:text-ink focus-visible:text-ink'}`}
              >
                {panel.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-hidden p-6 md:p-8" style={panelHeight ? { minHeight: `${panelHeight}px` } : undefined}>
        {panels.map((panel, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={panel.id}
              ref={(element) => {
                panelRefs.current[panel.id] = element;
              }}
              id={`experience-panel-${panel.id}`}
              role="tabpanel"
              aria-labelledby={`experience-tab-${panel.id}`}
              aria-hidden={!isActive}
              className={`inset-0 transition ${prefersReducedMotion ? '' : 'duration-300'} ${isActive ? 'relative opacity-100' : 'pointer-events-none absolute opacity-0'}`}
              style={prefersReducedMotion ? undefined : { clipPath: isActive ? 'inset(0% 0% 0% 0%)' : 'inset(8% 0% 0% 0%)' }}
            >
              {panel.content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
