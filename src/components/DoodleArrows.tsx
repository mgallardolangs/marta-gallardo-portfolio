// ponytail: decorative SVG arrows, hand-drawn doodle style
export function ArrowDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="40" height="80" viewBox="0 0 40 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 5C18 15 22 25 20 35C18 45 22 55 20 65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M12 57L20 68L28 57" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowCurved({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 50C20 10 60 5 90 15C100 18 108 25 112 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M105 28L113 36L106 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowWavy({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20C15 10 25 30 35 20C45 10 55 30 65 20C75 10 85 25 92 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M85 13L93 20L85 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
