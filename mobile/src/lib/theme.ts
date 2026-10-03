/**
 * The website's palette (frontend/tailwind.config.ts), so the app and the site
 * read as one product. A trader who knows the green from the site knows the app.
 */
export const colors = {
  primary: '#1D9E75',
  primary50: '#EEF9F4',
  primary100: '#D7F0E5',
  primary200: '#B0E1CC',
  primary700: '#12654E',
  primary800: '#0F5040',
  sand: '#FAF7F1',
  sand100: '#F5F1E8',
  sand200: '#E9E3D6',
  sand300: '#D9D1BF',
  ink: '#1C2A24',
  muted: '#6D7D75',
  harvest: '#D98324',
  white: '#FFFFFF',
  red: '#DC2626',
  red50: '#FEF2F2',
  red200: '#FECACA',
  telegram: '#229ED9',
  whatsapp: '#25D366',
} as const;

export const radius = { sm: 10, md: 14, lg: 18, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const shadow = {
  shadowColor: '#1C2A24',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;
