import { motion } from 'framer-motion';

interface Props {
  id: string;
  label: string;
  accent: string;
  backgroundImage?: string;
  iconImage?: string;
}

const nicheEmojis: Record<string, string> = {
  travel: '✈️',
  languages: '🌍',
  art: '🎨',
};

export default function NicheCard(props: Props) {
  const scrollToSection = () => {
    const target = document.getElementById(props.id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== `#${props.id}`) {
      window.history.replaceState({}, '', `#${props.id}`);
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
        style={props.backgroundImage ? { backgroundImage: `url(${props.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-white/10" />
      <div className="relative flex w-full flex-col justify-between p-6 md:p-7">
        <div className="flex justify-end">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 shadow-lg backdrop-blur-sm">
            {props.iconImage ? (
              <motion.img
                src={props.iconImage}
                alt=""
                className="h-12 w-12 rounded-xl object-contain drop-shadow-lg"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              />
            ) : (
              <motion.span
                className="select-none text-4xl"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              >
                {nicheEmojis[props.id] || '📌'}
              </motion.span>
            )}
          </div>
        </div>

        <div>
          <p className="font-accent text-xs uppercase tracking-[0.35em] text-blush-100/90">UGC</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <h2 className="font-heading text-4xl text-white md:text-5xl">{props.label}</h2>
            <span className="text-3xl text-white transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
          <p className="mt-4 max-w-xs font-body text-sm leading-6 text-white/85 md:text-base">{props.accent}</p>
        </div>
      </div>
    </motion.button>
  );
}
