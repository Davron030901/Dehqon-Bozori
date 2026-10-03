'use client';

import { MessageCircle, Phone, Send } from 'lucide-react';

import { reportContact, type ContactChannel } from '@/lib/api';
import { telHref, telegramHref, whatsappHref } from '@/lib/format';
import { strings } from '@/lib/strings';

export interface ContactButtonsProps {
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  /**
   * When present, tapping a button tells the backend a buyer reached out. That
   * both feeds the admin dashboard and pings the seller in Telegram — the
   * whole point of the platform. Purely optional: the links work regardless.
   */
  listingId?: string;
  className?: string;
}

export default function ContactButtons({
  phone,
  telegram,
  whatsapp,
  listingId,
  className = '',
}: ContactButtonsProps) {
  const hasAny = Boolean(phone || telegram || whatsapp);

  function report(channel: ContactChannel) {
    if (!listingId) return;
    reportContact(listingId, channel);
  }

  if (!hasAny) {
    return (
      <p className="rounded-xl border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-muted">
        {strings.detail.noContact}
      </p>
    );
  }

  const base =
    // min-w-0 + truncate: a long Telegram handle must shrink, not push the
    // button out of its card on a 360px phone.
    'flex min-w-0 items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]';

  return (
    <div className={`grid min-w-0 gap-2.5 ${className}`}>
      {phone && (
        <a
          href={telHref(phone)}
          onClick={() => report('call')}
          className={`${base} bg-primary hover:bg-primary-600`}
        >
          <Phone size={18} aria-hidden="true" className="shrink-0" />
          {strings.contact.call}
          <span className="truncate font-semibold opacity-90">{phone}</span>
        </a>
      )}

      {telegram && (
        <a
          href={telegramHref(telegram)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => report('telegram')}
          className={`${base} bg-[#229ED9] hover:bg-[#1b8ec3]`}
        >
          <Send size={18} aria-hidden="true" className="shrink-0" />
          {strings.contact.telegram}
          <span className="truncate font-semibold opacity-90">@{telegram.replace(/^@/, '')}</span>
        </a>
      )}

      {whatsapp && (
        <a
          href={whatsappHref(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => report('whatsapp')}
          className={`${base} bg-[#25D366] hover:bg-[#1fb857]`}
        >
          <MessageCircle size={18} aria-hidden="true" className="shrink-0" />
          {strings.contact.whatsapp}
        </a>
      )}
    </div>
  );
}
