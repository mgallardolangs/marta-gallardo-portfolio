import { motion } from 'framer-motion';
import EditableText from './EditableText';
import EditableImage from './EditableImage';
import { useAdminStore } from './useAdminStore';

interface Props {
  id: 'travel' | 'languages' | 'art';
  labelKey: string;
  accentKey: string;
  backgroundImageKey: string;
  iconImageKey: string;
}

const nicheEmojis: Record<Props['id'], string> = {
  travel: '✈️',
  languages: '🌍',
  art: '🎨',
};

export default function AdminNicheCard({ id, labelKey, accentKey, backgroundImageKey, iconImageKey }: Props) {
  const { getImageSrc } = useAdminStore();
  const backgroundImage = getImageSrc(backgroundImageKey);

  const scrollToSection = () => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== `#${id}`) {
      window.history.replaceState({}, '', `#${id}`);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={scrollToSection}
      className="group relative flex min-h-[19rem] w-full overflow-hidden rounded-[2rem] border border-white/40 text-left shadow-[0_24px_60px_rgba(45,45,45,0.08)]"
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-blush-100 via-blush-50 to-cream"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-white/10" />
      <div className="relative flex w-full flex-col justify-between p-6 md:p-7">
        <div className="flex justify-end">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 shadow-lg backdrop-blur-sm overflow-hidden">
            {getImageSrc(iconImageKey) ? (
              <EditableImage imageKey={iconImageKey} className="h-12 w-12 rounded-xl" alt="" />
            ) : (
              <motion.span
                className="select-none text-4xl"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              >
                {nicheEmojis[id]}
              </motion.span>
            )}
          </div>
        </div>

        <div>
          <p className="font-accent text-xs uppercase tracking-[0.35em] text-blush-100/90">UGC</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <EditableText i18nKey={labelKey} as="h2" className="font-heading text-4xl text-white md:text-5xl" />
            <span className="text-3xl text-white transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
          <EditableText i18nKey={accentKey} as="p" className="mt-4 max-w-xs font-body text-sm leading-6 text-white/85 md:text-base" />
        </div>
      </div>
    </motion.button>
  );
}
