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
  profileLabel: string;
  statement: string;
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

export default function ExperienceTabs({ tabListAriaLabel, profileLabel, statement, tabs }: Props) {
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
  }, [tabs, statement]);

  const panels = useMemo(() => ([
    {
      id: 'education' as const,
      label: tabs.education.label,
      intro: tabs.education.intro,
      content: (
        <ul className="space-y-4">
          {tabs.education.studies.map((study) => (
            <li key={study} className="flex gap-3 text-base leading-8 text-paper">
              <span className="mt-3 h-2 w-2 rounded-full bg-amaranth" />
              <span>{study}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'experience' as const,
      label: tabs.experience.label,
      intro: tabs.experience.intro,
      content: (
        <div className="grid gap-px bg-paper/16 lg:grid-cols-3">
          {tabs.experience.cards.map((card) => (
            <article key={`${card.highlight}-${card.title}`} className="bg-ink px-5 py-6">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amaranth">{card.highlight}</p>
              <h3 className="mt-4 font-heading text-2xl text-paper">{card.title}</h3>
              <p className="mt-4 text-sm leading-7 text-paper/72">{card.text}</p>
            </article>
          ))}
        </div>
      ),
    },
  ]), [tabs]);

  return (
    <section className="border border-ink bg-ink text-paper">
      <div className="border-b border-paper/16 bg-paper/8 px-4 pt-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div role="tablist" aria-label={tabListAriaLabel} className="flex flex-wrap items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amaranth" aria-hidden="true" />
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
                    className={`rounded-t-[7px] border border-b-0 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] transition ${isActive ? 'border-paper bg-paper text-ink' : 'border-paper/18 bg-paper/14 text-paper/62 hover:bg-paper/18 hover:text-paper focus-visible:bg-paper/18 focus-visible:text-paper'}`}
                  >
                    {panel.label}
                  </button>
                );
              })}
            </div>
          </div>
          <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-paper/42">{profileLabel}</span>
        </div>
      </div>

      <div className="relative overflow-hidden px-5 py-6 md:px-6 md:py-8" style={panelHeight ? { minHeight: `${panelHeight}px` } : undefined}>
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
              <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr]">
                <div className="space-y-5 border-b border-paper/16 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                  <p className="font-heading text-3xl leading-[0.96] text-paper md:text-4xl">{statement}</p>
                  <p className="text-sm leading-7 text-paper/68 md:text-base">{panel.intro}</p>
                </div>
                <div>{panel.content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
