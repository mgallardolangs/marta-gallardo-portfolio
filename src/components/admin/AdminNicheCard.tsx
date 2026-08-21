import { motion, useReducedMotion } from 'framer-motion';
import EditableText from './EditableText';
import EditableImage from './EditableImage';

interface Props {
  id: 'travel' | 'languages' | 'art';
  labelKey: string;
  accentKey: string;
  backgroundImageKey: string;
  iconImageKey: string;
}

export default function AdminNicheCard({ id, labelKey, accentKey, backgroundImageKey, iconImageKey }: Props) {
  const prefersReducedMotion = useReducedMotion();

  const scrollToSection = () => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <motion.div
      className="group relative flex min-h-[17rem] w-full overflow-hidden border border-black/10 bg-paper text-left shadow-[0_18px_34px_rgba(6,4,3,0.08)]"
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="absolute inset-0">
        <EditableImage imageKey={backgroundImageKey} className="h-full w-full" alt={`${id} background`} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/82 via-charcoal/32 to-white/10 pointer-events-none" />

      <div className="relative flex w-full flex-col justify-between p-5 md:p-6">
        <div className="flex justify-end">
          <div className="h-14 w-14 overflow-hidden border border-black/10 bg-white/88 shadow-[0_12px_24px_rgba(6,4,3,0.14)] backdrop-blur-sm">
            <EditableImage imageKey={iconImageKey} className="h-14 w-14 p-1" alt={`${id} icon`} />
          </div>
        </div>

        <div>
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-amaranth-soft">UGC</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <EditableText i18nKey={labelKey} as="h2" className="font-heading text-4xl text-white md:text-[2.8rem]" />
            <button type="button" onClick={scrollToSection} className="border-b border-amaranth pb-1 text-sm font-semibold uppercase tracking-[0.22em] text-amaranth-soft transition-colors hover:text-white">→</button>
          </div>
          <EditableText i18nKey={accentKey} as="p" className="mt-4 max-w-xs font-body text-sm leading-6 text-white/85 md:text-base" />
        </div>
      </div>
    </motion.div>
  );
}
