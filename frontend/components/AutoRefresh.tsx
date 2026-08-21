'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Pulls fresh listings without the buyer touching anything.
 *
 * A bazaar trader leaves this page open while they work. Produce posted five
 * minutes ago should be on their screen without a reload — but a websocket to
 * every open tab is the wrong trade for rural 3G, where the connection drops
 * every time the phone changes cell and a dead socket looks identical to an
 * empty market.
 *
 * `router.refresh()` re-runs the server component and streams the new HTML into
 * the existing page. Nothing local is lost: the search box keeps what the buyer
 * typed, the category chip stays selected, the scroll position holds.
 *
 * Two things it deliberately does not do:
 *
 *   * refresh a hidden tab — that is data the buyer pays for and never sees
 *   * refresh while offline — the request would fail and the retry timer would
 *     keep firing into a dead connection
 */
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (seconds <= 0) return;

    function tick() {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      router.refresh();
    }

    const id = setInterval(tick, seconds * 1000);

    // Coming back to the tab is the moment the buyer most wants current data,
    // and it is also when the interval is most likely to have drifted.
    function onVisible() {
      if (!document.hidden) router.refresh();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, seconds]);

  return null;
}
