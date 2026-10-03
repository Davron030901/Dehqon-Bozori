/** Opening the phone's dialer, Telegram and WhatsApp — the whole point of the app. */
import { Alert, Linking, Share } from 'react-native';

import { reportContact } from './api';
import { SITE_URL } from './config';
import { telHref, telegramHref, whatsappHref } from './format';
import type { ContactChannel } from './types';

async function open(url: string, failMessage: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(failMessage, url);
  }
}

/**
 * Tap Call / Telegram / WhatsApp: open the app first, then tell the backend.
 * The seller gets a Telegram ping within a second; the buyer never waits on it.
 */
export function contact(
  listingId: string | undefined,
  channel: ContactChannel,
  value: string,
  failMessage: string,
): void {
  const url =
    channel === 'call' ? telHref(value) : channel === 'telegram' ? telegramHref(value) : whatsappHref(value);
  void open(url, failMessage);
  if (listingId) reportContact(listingId, channel);
}

export function openUrl(url: string, failMessage: string): void {
  void open(url, failMessage);
}

export function listingUrl(id: string): string {
  return `${SITE_URL}/mahsulot/${id}`;
}

export async function shareListing(id: string, message: string): Promise<void> {
  const url = listingUrl(id);
  try {
    await Share.share({ message: `${message} ${url}`, url });
  } catch {
    /* the share sheet was dismissed */
  }
}
