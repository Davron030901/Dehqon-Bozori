/**
 * Where the app talks to. `EXPO_PUBLIC_*` values are inlined at build time by
 * Expo (from `.env.local` or the EAS build profile — see eas.json).
 *
 * An empty API URL is a supported mode, not an error: the app runs on demo
 * listings and says so on screen, which is how a first `npx expo start` works
 * before any backend exists.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://dehqon-bozori.vercel.app')
  .trim()
  .replace(/\/+$/, '');

export const PAGE_SIZE = 20;

/** Rural 3G drops packets; wait this long before calling a request dead. */
export const TIMEOUT_MS = 15000;

/** The Telegram bot's @username (without @), for the "open the bot" button. */
export const BOT_USERNAME = (process.env.EXPO_PUBLIC_BOT_USERNAME ?? '').trim().replace(/^@/, '');
