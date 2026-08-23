import { getAdminTranslationArsenalPreviewModel } from '../../lib/adminTranslationArsenalPreview.ts';
import { useAdminStore } from './useAdminStore';

export default function AdminTranslationArsenalPreview() {
  const store = useAdminStore();
  const preview = getAdminTranslationArsenalPreviewModel(store);

  return (
    <div className="border border-ink" data-admin-arsenal-preview>
      <div className="grid gap-0 lg:grid-cols-3">
        <article className="border-b border-ink p-5 lg:border-b-0 lg:border-r" data-admin-arsenal-panel="languages">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-amaranth">{preview.titles.languages}</p>
          <span className="mt-4 block h-px bg-ink/12"></span>
          <div className="mt-5">
            {preview.languages.map((language) => (
              <div key={language.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-3 last:border-b-0">
                <p className="font-heading text-2xl text-ink">{language.label}</p>
                <p className="text-sm font-medium text-amaranth">{language.level}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border-b border-ink p-5 lg:border-b-0 lg:border-r" data-admin-arsenal-panel="tools">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-amaranth">{preview.titles.tools}</p>
          <span className="mt-4 block h-px bg-ink/12"></span>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {preview.tools.map((tool) => (
              <div
                key={tool.id}
                className="group flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink"
              >
                <div className="flex h-10 w-10 items-center justify-center">
                  <img
                    src={tool.logoSrc}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="h-6 max-h-[24px] w-6 max-w-[24px] object-contain"
                  />
                </div>
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-paper transition group-hover:text-ink">{tool.label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="p-5" data-admin-arsenal-panel="skills">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-amaranth">{preview.titles.skills}</p>
          <span className="mt-4 block h-px bg-ink/12"></span>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">{preview.titles.translation}</p>
              <div className="flex flex-col gap-2">
                {preview.skillGroups.translation.map((skill) => (
                  <span key={skill.id} className="border border-ink/12 px-3 py-2 text-[0.68rem] uppercase tracking-[0.08em] text-ink">
                    {skill.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">{preview.titles.seo}</p>
              <div className="flex flex-col gap-2">
                {preview.skillGroups.seo.map((skill) => (
                  <span key={skill.id} className="border border-ink/12 px-3 py-2 text-[0.68rem] uppercase tracking-[0.08em] text-ink">
                    {skill.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
