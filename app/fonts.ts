import { Archivo_Narrow, Jost, Courier_Prime, Cormorant_Garamond } from 'next/font/google';

// Self-hosted at build time by next/font — no runtime request to Google,
// only the weights actually used are shipped, and layout shift is
// avoided automatically via size-adjust metrics.

export const fontDisplay = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const fontBody = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const fontMono = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const fontSerif = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['500'],
  variable: '--font-serif',
  display: 'swap',
});
