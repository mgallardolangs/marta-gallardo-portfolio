import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import EditableText from './EditableText';
import EditableImage from './EditableImage';
import { adminStore } from './adminStore';

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
  const [bgSrc, setBgSrc] = useState('');
  const [iconSrc, setIconSrc] = useState('');

  useEffect(() => {
    setBgSrc(adminStore.getImageSrc(backgroundImageKey));
    setIconSrc(adminStore.getImageSrc(iconImageKey));
    return adminStore.subscribe(() => {
      setBgSrc(adminStore.getImageSrc(backgroundImageKey));
      setIconSrc(adminStore.getImageSrc(iconImageKey));
    });
  }, [backgroundImageKey, iconImageKey]);

  const scrollToSection = () => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      className="group relative flex min-h-[19rem] w-full overflow-hidden rounded-[2rem] border border-white/40 text-left shadow-[0_24px_60px_rgba(45,45,45,0.08)]"
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Background — editable */}
      <div className="absolute inset-0">
        <EditableImage imageKey={backgroundImageKey} className="h-full w-full" alt={`${id} background`} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-white/10 pointer-events-none" />

      <div className="relative flex w-full flex-col justify-between p-6 md:p-7">
        {/* Icon — editable */}
        <div className="flex justify-end">
          <div className="h-14 w-14 rounded-2xl bg-white/85 shadow-lg backdrop-blur-sm overflow-hidden">
            <EditableImage imageKey={iconImageKey} className="h-14 w-14 p-1" alt={`${id} icon`} />
          </div>
        </div>

        <div>
          <p className="font-accent text-xs uppercase tracking-[0.35em] text-blush-100/90">UGC</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <EditableText i18nKey={labelKey} as="h2" className="font-heading text-4xl text-white md:text-5xl" />
            <button type="button" onClick={scrollToSection} className="text-3xl text-white hover:translate-x-1 transition-transform">→</button>
          </div>
          <EditableText i18nKey={accentKey} as="p" className="mt-4 max-w-xs font-body text-sm leading-6 text-white/85 md:text-base" />
        </div>
      </div>
    </motion.div>
  );
}
