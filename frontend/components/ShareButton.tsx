'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

import { strings } from '@/lib/strings';

/**
 * Share a listing — most often into a Telegram group of bazaar traders.
 *
 * Phones get the native share sheet (Telegram is right there in it); desktop
 * browsers without one get the link copied to the clipboard.
 */
export default function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the person closed the share sheet — nothing to report */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-sand-200 bg-white px-4 py-3 text-[15px] font-semibold text-ink transition hover:border-primary-200 hover:bg-primary-50"
    >
      {copied ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
      {copied ? strings.detail.linkCopied : strings.detail.share}
    </button>
  );
}
