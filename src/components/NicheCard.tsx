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
      className="group relative flex min-h-[17rem] w-full overflow-hidden border border-black/10 bg-paper text-left shadow-[0_18px_34px_rgba(6,4,3,0.08)]"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-blush-100 via-paper to-white"
        style={props.backgroundImage ? { backgroundImage: `url(${props.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/82 via-charcoal/32 to-white/10" />
      <div className="relative flex w-full flex-col justify-between p-5 md:p-6">
        <div className="flex justify-end">
          <div className="flex h-14 w-14 items-center justify-center border border-black/10 bg-white/88 shadow-[0_12px_24px_rgba(6,4,3,0.14)] backdrop-blur-sm">
            {props.iconImage ? (
              <motion.img
                src={props.iconImage}
                alt=""
                className="h-12 w-12 object-contain drop-shadow-lg"
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
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-amaranth-soft">UGC</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <h2 className="font-heading text-4xl text-white md:text-[2.8rem]">{props.label}</h2>
            <span className="border-b border-amaranth pb-1 text-sm font-semibold uppercase tracking-[0.22em] text-amaranth-soft transition-colors duration-300 group-hover:text-white">→</span>
          </div>
          <p className="mt-4 max-w-xs font-body text-sm leading-6 text-white/85 md:text-base">{props.accent}</p>
        </div>
      </div>
    </motion.button>
  );
}
