import type { ReactNode } from 'react';

type Tone = 'today' | 'sold' | 'neutral' | 'primary';

const TONES: Record<Tone, string> = {
  today: 'bg-harvest text-white',
  sold: 'bg-muted text-white',
  neutral: 'bg-sand-200 text-ink',
  primary: 'bg-primary-100 text-primary-700',
};

export default function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
